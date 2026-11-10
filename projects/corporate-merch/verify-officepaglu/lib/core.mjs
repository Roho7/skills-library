import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(SKILL_DIR, '../../..');
export const STATE_DIR = path.join(SKILL_DIR, '.state');
export const config = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'op.config.json'), 'utf8'));

export class OpError extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint;
  }
}

export function appNames() {
  return Object.keys(config.apps);
}

export function app(name) {
  const a = config.apps[name];
  if (!a) throw new OpError(`Unknown app "${name}"`, `Use one of: ${appNames().join(', ')}`);
  return { name, ...a, path: path.join(REPO_ROOT, a.dir) };
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

/** Parses an app's env file without loading it into process.env. Values never leave this module except URLs. */
export function readEnvFile(appName) {
  const a = app(appName);
  const file = path.join(a.path, a.envFile);
  if (!fs.existsSync(file)) return null;
  const dotenv = backendRequire('dotenv');
  return dotenv.parse(fs.readFileSync(file));
}

export function backendRequire(id) {
  return createRequire(path.join(app('api').path, 'package.json'))(id);
}

export function apiPort() {
  const env = readEnvFile('api');
  return Number(env?.PORT) || app('api').port;
}

export function appPort(appName) {
  return appName === 'api' ? apiPort() : app(appName).port;
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

/** Runs a command to completion, capturing output. Never throws on non-zero exit. */
export function run(cmd, args, { cwd, env, timeoutMs = 10 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env, FORCE_COLOR: '0' } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, ms: Date.now() - started });
    });
  });
}

export function tailFile(file, lines = 40) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-lines);
}

/** `booleans` lists flags that never take a value, so `--full out.png` keeps `out.png` positional. */
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
  return path.relative(REPO_ROOT, p);
}
