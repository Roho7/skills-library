import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CHROME_PROFILE_DIR, CONFIG_FILE, SKILL_DIR, STATE_DIR, config, isPortOpen, repo } from './core.mjs';
import { chromeExecutable, profileHolder } from './browser.mjs';

const MIN_NODE_MAJOR = 20;

function check(name, ok, detail, fix) {
  return { name, ok, detail, ...(ok ? {} : { fix }) };
}

function resolveOnPath(command) {
  const found = spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
  return found.status === 0 ? found.stdout.trim() : null;
}

async function run() {
  const checks = [];
  const major = Number(process.versions.node.split('.')[0]);
  checks.push(check('node', major >= MIN_NODE_MAJOR, process.versions.node, `Use Node ${MIN_NODE_MAJOR}+ (nvm use).`));
  checks.push(check('playwright', fs.existsSync(path.join(SKILL_DIR, 'node_modules/playwright-core')), 'playwright-core', `npm --prefix ${SKILL_DIR} install`));
  const chrome = chromeExecutable();
  checks.push(check('chrome', !!chrome, chrome ?? 'not found', 'Install Google Chrome.'));
  for (const bin of ['ffmpeg', 'ffprobe']) {
    const found = resolveOnPath(bin);
    checks.push(check(bin, !!found, found ?? `${bin} not on PATH (shot record stop needs it)`, 'Install ffmpeg: brew install ffmpeg (macOS) or apt install ffmpeg (Debian/Ubuntu).'));
  }
  checks.push({ name: 'config', ok: true, detail: `${config.sources.join(' <- ')}${fs.existsSync(CONFIG_FILE) ? '' : ` (no ${CONFIG_FILE})`}`, values: { baseUrl: config.baseUrl, cdpPort: config.cdpPort, profile: config.profile, auth: config.auth, refuseClicks: config.refuseClicks } });
  checks.push({ name: 'state', ok: true, detail: `${STATE_DIR}${repo.inGit ? '' : ' (not a git repo)'}` });
  checks.push({ name: 'cdp', ok: true, detail: `port ${config.cdpPort} ${(await isPortOpen(config.cdpPort)) ? 'running' : 'not started'}` });
  const holder = profileHolder();
  const heldElsewhere = !!holder && holder.cdpPort !== config.cdpPort;
  checks.push({
    name: 'profile',
    ok: !heldElsewhere,
    detail: holder
      ? `${CHROME_PROFILE_DIR} held by Chrome pid ${holder.pid}${holder.cdpPort ? ` on DevTools port ${holder.cdpPort}` : ''}`
      : `${CHROME_PROFILE_DIR} ${fs.existsSync(CHROME_PROFILE_DIR) ? 'exists, not held' : 'not created yet'}`,
    ...(heldElsewhere ? { fix: holder.cdpPort ? 'Unset SHOT_CDP_PORT: shot then uses that Chrome with its own tab.' : `Chrome pid ${holder.pid} has no DevTools port. Quit it, or isolate with SHOT_PROFILE=<empty dir>.` } : {}),
  });
  const failed = checks.filter((c) => !c.ok);
  return { ok: failed.length === 0, failed: failed.map((c) => c.name), checks };
}

export const commands = {
  doctor: {
    summary: 'Check Node, playwright-core, Chrome, ffmpeg, profile holder and config source',
    usage: `
shot doctor

Each check is {name, ok, detail, fix?}. "fix" says exactly what to run.`,
    run,
  },
};
