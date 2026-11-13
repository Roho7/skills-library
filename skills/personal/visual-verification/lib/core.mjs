import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class OpError extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint;
  }
}

function git(args) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : null;
}

const expandHome = (p) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p);

function resolveRepo() {
  const root = git(['rev-parse', '--show-toplevel']);
  if (!root) {
    const cwd = process.cwd();
    const key = crypto.createHash('sha1').update(cwd).digest('hex').slice(0, 12);
    return { root: cwd, stateDir: path.join(os.homedir(), '.shot', 'state', key), mainName: path.basename(cwd), inGit: false };
  }
  const gitDir = path.resolve(git(['rev-parse', '--absolute-git-dir']));
  const common = path.resolve(root, git(['rev-parse', '--git-common-dir']));
  const mainName = path.basename(path.basename(common) === '.git' ? path.dirname(common) : common);
  return { root, stateDir: path.join(gitDir, 'shot'), mainName, inGit: true };
}

export const repo = resolveRepo();
export const REPO_ROOT = repo.root;
export const STATE_DIR = repo.stateDir;

export const CONFIG_FILE = path.join(repo.root, '.shot.json');

function loadConfig() {
  const defaults = {
    baseUrl: 'http://localhost:3000',
    cdpPort: 9333,
    profile: path.join(os.homedir(), '.shot', 'profiles', repo.mainName),
    auth: null,
    refuseClicks: 'place|pay|order|submit|apply|confirm|save|delete|remove|retrigger|record|send|update|create|logout|sign ?out|continue|proceed|checkout|buy',
  };
  const sources = ['defaults'];
  let file = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (err) {
      throw new OpError(`${CONFIG_FILE} is not valid JSON: ${err.message}`, 'Fix the file or delete it.');
    }
    sources.push(CONFIG_FILE);
  }
  const cfg = { ...defaults, ...file };
  const env = process.env;
  if (env.SHOT_BASE_URL) (cfg.baseUrl = env.SHOT_BASE_URL), sources.push('SHOT_BASE_URL');
  if (env.SHOT_CDP_PORT) (cfg.cdpPort = Number(env.SHOT_CDP_PORT)), sources.push('SHOT_CDP_PORT');
  if (env.SHOT_PROFILE) (cfg.profile = env.SHOT_PROFILE), sources.push('SHOT_PROFILE');
  cfg.profile = path.resolve(expandHome(cfg.profile));
  cfg.cdpPort = Number(cfg.cdpPort);
  return Object.assign(cfg, { sources });
}

export const config = loadConfig();

export const CHROME_PROFILE_DIR = config.profile;

export function requireAuth() {
  if (!config.auth) throw new OpError('No auth config', `Add "auth": { "checkPath": "/admin", "loginPath": "/login", "cookie": "^sb-.*-auth-token" } to ${CONFIG_FILE}.`);
  return { checkPath: config.auth.checkPath, loginPath: config.auth.loginPath, cookie: new RegExp(config.auth.cookie) };
}

export function stateFile(...parts) {
  const p = path.join(STATE_DIR, ...parts);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

export function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

export function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function run(cmd, args, { cwd, env, timeoutMs = 10 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env, FORCE_COLOR: '0' } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => (stderr += err.message));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, ms: Date.now() - started });
    });
  });
}

export function parseFlags(argv, booleans = []) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const [key, inline] = a.slice(2).split('=', 2);
    if (inline !== undefined) flags[key] = inline;
    else if (!booleans.includes(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { flags, positional };
}

export function relPath(p) {
  return path.relative(process.cwd(), p) || '.';
}
