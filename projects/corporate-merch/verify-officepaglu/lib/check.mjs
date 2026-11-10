import path from 'node:path';
import { OpError, app, appNames, run, REPO_ROOT } from './core.mjs';

const MAX_ITEMS = 25;

function parseTsc(out, appDir) {
  const errors = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
    if (m) errors.push({ file: path.join(appDir, m[1]), line: Number(m[2]), code: m[4], message: m[5] });
  }
  return { errorCount: errors.length, errors: errors.slice(0, MAX_ITEMS) };
}

function parseEslint(out) {
  const start = out.indexOf('[');
  if (start === -1) return null;
  const results = JSON.parse(out.slice(start));
  const problems = [];
  let errorCount = 0;
  let warningCount = 0;
  for (const r of results) {
    errorCount += r.errorCount;
    warningCount += r.warningCount;
    for (const m of r.messages) {
      problems.push({ file: path.relative(REPO_ROOT, r.filePath), line: m.line, severity: m.severity === 2 ? 'error' : 'warning', rule: m.ruleId, message: m.message });
    }
  }
  problems.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return { errorCount, warningCount, problems: problems.slice(0, MAX_ITEMS) };
}

function parseNodeTest(out) {
  const count = (label) => Number(out.match(new RegExp(`^[#ℹ] ${label} (\\d+)`, 'm'))?.[1] ?? NaN);
  const failures = out
    .split('\n')
    .filter((l) => /^\s*(not ok \d+|✖)/.test(l) && !/✖ failing tests/.test(l))
    .map((l) => l.trim())
    .slice(0, MAX_ITEMS);
  return { tests: count('tests'), pass: count('pass'), fail: count('fail'), failures };
}

const PARSERS = {
  types: (r, a) => parseTsc(r.stdout + r.stderr, a.dir),
  lint: (r) => parseEslint(r.stdout),
  test: (r) => parseNodeTest(r.stdout + r.stderr),
};

async function runCheck(a, kind, argv) {
  const r = await run(argv[0], argv.slice(1), { cwd: a.path });
  let parsed = null;
  try {
    parsed = PARSERS[kind](r, a);
  } catch {}
  const result = { app: a.name, check: kind, ok: r.code === 0, ms: r.ms, ...(parsed ?? {}) };
  if (!result.ok && !parsed) result.outputTail = (r.stdout + r.stderr).trim().split('\n').slice(-30);
  return result;
}

async function check(_positional, flags) {
  const apps = flags.app ? [app(flags.app)] : appNames().map(app);
  const only = flags.only ? String(flags.only).split(',') : null;
  const jobs = [];
  for (const a of apps) {
    for (const [kind, argv] of Object.entries(a.checks)) {
      if (!only || only.includes(kind)) jobs.push(runCheck(a, kind, argv));
    }
  }
  if (jobs.length === 0) throw new OpError('No checks matched', `Available: ${apps.map((a) => `${a.name}:${Object.keys(a.checks).join(',')}`).join(' ')}`);
  const results = await Promise.all(jobs);
  return {
    ok: results.every((r) => r.ok),
    summary: results.map((r) => `${r.app}.${r.check}: ${r.ok ? 'pass' : 'FAIL'} (${(r.ms / 1000).toFixed(1)}s)`),
    results,
  };
}

export const commands = {
  check: {
    summary: 'Typecheck, lint and test both apps in parallel; JSON summary',
    usage: `
op check [--app web|api] [--only types,lint,test]

Runs (in parallel):
  web: types (tsc --noEmit), lint (eslint)
  api: types (tsc --noEmit), test (npm test)

Each result lists the first ${MAX_ITEMS} errors with file:line. Lint warnings don't fail the check.`,
    run: check,
  },
};
