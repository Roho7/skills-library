import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { OpError, app, appNames, appPort, isPortOpen, pidAlive, readJson, writeJson, stateFile, tailFile, relPath } from './core.mjs';

const PROCS = () => stateFile('procs.json');
const READY_TIMEOUT_MS = 120_000;

function targets(arg) {
  if (!arg || arg === 'all') return appNames();
  app(arg);
  return [arg];
}

async function waitReady(url, pid, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!pidAlive(pid)) return { ready: false, reason: 'process exited' };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.status < 500) return { ready: true, httpStatus: res.status, ms: Date.now() - started };
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { ready: false, reason: `not ready after ${timeoutMs / 1000}s` };
}

async function startApp(name, flags, procs) {
  const a = app(name);
  const port = appPort(name);
  const url = `http://localhost:${port}${a.healthPath}`;
  const existing = procs[name];
  if (existing && pidAlive(existing.pid)) return { app: name, status: 'already_running', ...existing };
  if (await isPortOpen(port)) {
    throw new OpError(`Port ${port} is already in use by a process op did not start`, `Find it with \`lsof -nP -iTCP:${port} -sTCP:LISTEN\`. Stop it, or reuse it as-is if it is the user's dev server.`);
  }

  const env = { ...process.env, PORT: String(port) };
  if (name === 'api' && !flags['with-workers']) env.DISABLE_BACKGROUND_WORKERS = '1';
  if (name === 'web' && (flags['local-api'] || procs.api?.pid)) env.NEXT_PUBLIC_API_URL = `http://localhost:${appPort('api')}`;

  const log = stateFile('logs', `${name}.log`);
  const fd = fs.openSync(log, 'w');
  const child = spawn('npm', ['run', 'dev'], { cwd: a.path, env, detached: true, stdio: ['ignore', fd, fd] });
  child.unref();
  const entry = {
    pid: child.pid,
    port,
    url: `http://localhost:${port}`,
    log: relPath(log),
    startedAt: new Date().toISOString(),
    ...(name === 'api' ? { backgroundWorkers: !!flags['with-workers'] } : { apiTarget: env.NEXT_PUBLIC_API_URL ?? 'from .env.local' }),
  };
  procs[name] = entry;
  writeJson(PROCS(), procs);

  const readiness = await waitReady(url, child.pid, Number(flags.timeout ?? READY_TIMEOUT_MS / 1000) * 1000);
  return { app: name, status: readiness.ready ? 'ready' : 'failed', ...entry, ...readiness, ...(readiness.ready ? {} : { logTail: tailFile(log, 30) }) };
}

async function up(positional, flags) {
  const procs = readJson(PROCS(), {});
  const names = targets(positional[0]);
  if (names.includes('api') && names.includes('web')) flags['local-api'] = true;
  const ordered = names.includes('api') ? ['api', ...names.filter((n) => n !== 'api')] : names;
  const results = [];
  for (const name of ordered) results.push(await startApp(name, flags, procs));
  const warnings = [];
  if (results.some((r) => r.app === 'api' && r.backgroundWorkers)) warnings.push('API started WITH background workers: Qikink poller, job processor and WhatsApp crons run against production.');
  if (results.some((r) => r.app === 'web' && r.apiTarget === 'from .env.local')) warnings.push('Web is talking to the API in .env.local (remote). Use `op up all` or `--local-api` to test local backend changes.');
  return { ok: results.every((r) => r.status !== 'failed'), results, warnings };
}

function killGroup(pid) {
  try {
    process.kill(-pid, 'SIGTERM');
    return true;
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
      return true;
    } catch {
      return false;
    }
  }
}

async function down(positional) {
  const procs = readJson(PROCS(), {});
  const results = [];
  for (const name of targets(positional[0])) {
    const entry = procs[name];
    if (!entry) {
      results.push({ app: name, status: 'not_started_by_op' });
      continue;
    }
    const alive = pidAlive(entry.pid);
    if (alive) killGroup(entry.pid);
    delete procs[name];
    results.push({ app: name, status: alive ? 'stopped' : 'was_not_running', pid: entry.pid });
  }
  writeJson(PROCS(), procs);
  return { results };
}

async function status() {
  const procs = readJson(PROCS(), {});
  const results = [];
  for (const name of appNames()) {
    const port = appPort(name);
    const entry = procs[name];
    results.push({ app: name, port, listening: await isPortOpen(port), managedByOp: !!entry && pidAlive(entry.pid), ...(entry ?? {}) });
  }
  return { results };
}

async function logs(positional, flags) {
  const name = positional[0];
  if (!name) throw new OpError('Missing app name', `Usage: op logs <${appNames().join('|')}> [--lines 80] [--grep text]`);
  app(name);
  const file = stateFile('logs', `${name}.log`);
  if (!fs.existsSync(file)) throw new OpError(`No log for ${name}`, `Logs exist only for servers started with \`op up ${name}\`.`);
  let lines = tailFile(file, 5000).map((l) => l.replace(/\x1b\[[0-9;]*m/g, ''));
  if (flags.grep) {
    const needle = String(flags.grep).toLowerCase();
    lines = lines.filter((l) => l.toLowerCase().includes(needle));
  }
  return { app: name, log: relPath(file), lines: lines.slice(-Number(flags.lines ?? 80)) };
}

export const commands = {
  up: {
    summary: 'Start dev servers (api|web|all) and wait until healthy',
    booleans: ['with-workers', 'local-api'],
    usage: `
op up [api|web|all] [--local-api] [--with-workers] [--timeout 120]

  all            starts api first, then web pointed at the local api
  --local-api    point web at the local api even when starting web alone
  --with-workers start the api WITH Qikink poller / job processor / WhatsApp crons.
                 They act on PRODUCTION orders — only with the user's explicit ok.

Servers are detached; logs go to .state/logs/<app>.log. Stop with \`op down\`.`,
    run: up,
  },
  down: {
    summary: 'Stop dev servers started by `op up`',
    usage: `
op down [api|web|all]

Only stops processes op started (tracked in .state/procs.json). Never kills the user's own servers.`,
    run: down,
  },
  status: {
    summary: 'Show which dev servers are listening and which op manages',
    usage: 'op status',
    run: status,
  },
  logs: {
    summary: 'Tail a dev server log started by `op up`',
    usage: 'op logs <api|web> [--lines 80] [--grep text]',
    run: logs,
  },
};
