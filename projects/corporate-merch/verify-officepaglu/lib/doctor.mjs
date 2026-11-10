import fs from 'node:fs';
import path from 'node:path';
import { SKILL_DIR, app, appNames, appPort, isPortOpen, readEnvFile, readJson, stateFile, pidAlive, config } from './core.mjs';
import { db, supabaseProjectRef } from './db.mjs';
import { chromeExecutable } from './browser.mjs';

const MIN_NODE_MAJOR = 20;

function check(name, ok, detail, fix) {
  return { name, ok, detail, ...(ok ? {} : { fix }) };
}

async function appChecks(name) {
  const a = app(name);
  const out = [];
  out.push(check(`${name}.node_modules`, fs.existsSync(path.join(a.path, 'node_modules')), a.dir, `npm --prefix ${a.dir} install`));
  const env = readEnvFile(name);
  out.push(check(`${name}.env_file`, !!env, `${a.dir}/${a.envFile}`, `Create ${a.dir}/${a.envFile} (ask the user for values; never invent secrets).`));
  if (env) {
    const missing = a.requiredEnv.filter((k) => !env[k]);
    out.push(check(`${name}.env_vars`, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${a.requiredEnv.length} required vars present`, 'Ask the user to fill the missing vars.'));
  }
  const port = appPort(name);
  const listening = await isPortOpen(port);
  const owned = pidAlive(readJson(stateFile('procs.json'), {})[name]?.pid);
  out.push({
    name: `${name}.port`,
    ok: true,
    detail: `${port} ${listening ? (owned ? 'in use by `op up`' : 'in use by another process') : 'free'}`,
  });
  return out;
}

async function run() {
  const checks = [];
  const major = Number(process.versions.node.split('.')[0]);
  checks.push(check('node', major >= MIN_NODE_MAJOR, process.versions.node, `Use Node ${MIN_NODE_MAJOR}+ (nvm use).`));

  for (const name of appNames()) checks.push(...(await appChecks(name)));

  const ref = supabaseProjectRef();
  try {
    const { count, error } = await db().from('tbl_orders').select('id', { count: 'exact', head: true });
    checks.push(check('supabase', !error, error ? error.message : `project ${ref} reachable (${count} orders) — this is PRODUCTION data, read-only use only`, 'Check SUPABASE_URL / SUPABASE_SERVICE_KEY and network.'));
  } catch (err) {
    checks.push(check('supabase', false, err.message, err.hint ?? 'Check SUPABASE_URL / SUPABASE_SERVICE_KEY.'));
  }

  const webApi = readEnvFile('web')?.NEXT_PUBLIC_API_URL;
  checks.push({
    name: 'web.api_target',
    ok: true,
    detail: webApi
      ? `${webApi}${webApi.includes('localhost') ? '' : ' (remote) — `op up all` overrides it to the local API'}`
      : 'unset',
  });

  checks.push(check('browser.playwright', fs.existsSync(path.join(SKILL_DIR, 'node_modules/playwright-core')), 'playwright-core', `npm --prefix ${path.relative(process.cwd(), SKILL_DIR) || '.'} install`));
  const chrome = chromeExecutable();
  checks.push(check('browser.chrome', !!chrome, chrome ?? 'not found', 'Install Google Chrome, or run `npx playwright-core install chromium` in the skill folder.'));
  checks.push({ name: 'browser.cdp', ok: true, detail: `port ${config.browser.cdpPort} ${(await isPortOpen(config.browser.cdpPort)) ? 'running' : 'not started'}` });

  const failed = checks.filter((c) => !c.ok);
  return { ok: failed.length === 0, failed: failed.map((c) => c.name), checks };
}

export const commands = {
  doctor: {
    summary: 'Check Node, deps, env vars, ports, Supabase and browser tooling',
    usage: `
op doctor

Each check is {name, ok, detail, fix?}. "fix" says exactly what to run or ask for.
Env values are never printed, only which names are missing (URLs excepted).`,
    run,
  },
};
