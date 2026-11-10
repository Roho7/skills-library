import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { OpError, config, isPortOpen, pidAlive, readJson, writeJson, stateFile, relPath, SKILL_DIR } from './core.mjs';

const CDP = `http://127.0.0.1:${config.browser.cdpPort}`;
const STATE = () => stateFile('browser.json');
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

export function chromeExecutable() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p)) ?? null;
}

async function playwright() {
  try {
    return await import(path.join(SKILL_DIR, 'node_modules/playwright-core/index.mjs'));
  } catch {
    throw new OpError('playwright-core is not installed', `Run: npm --prefix ${relPath(SKILL_DIR)} install`);
  }
}

async function waitForCdp(timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${CDP}/json/version`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new OpError('Chrome did not expose the DevTools port in time', `Check whether port ${config.browser.cdpPort} is blocked, then \`op browser stop\` and retry.`);
}

async function start(flags = {}) {
  if (await isPortOpen(config.browser.cdpPort)) return { status: 'already_running', ...readJson(STATE(), {}) };
  const exe = chromeExecutable();
  if (!exe) throw new OpError('No Chrome/Chromium found', 'Install Google Chrome.');
  const args = [
    `--remote-debugging-port=${config.browser.cdpPort}`,
    `--user-data-dir=${stateFile('chrome-profile')}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--window-size=${VIEWPORTS.desktop.width},${VIEWPORTS.desktop.height}`,
    ...(flags.headed ? [] : ['--headless=new']),
    'about:blank',
  ];
  const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
  child.unref();
  await waitForCdp();
  const entry = { pid: child.pid, headed: !!flags.headed, cdp: CDP, startedAt: new Date().toISOString() };
  writeJson(STATE(), entry);
  return { status: 'started', ...entry };
}

async function page() {
  if (!(await isPortOpen(config.browser.cdpPort))) await start();
  const { chromium } = await playwright();
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const p = context.pages()[0] ?? (await context.newPage());
  await p.setViewportSize(VIEWPORTS[readJson(STATE(), {}).viewport] ?? VIEWPORTS.desktop);
  return p;
}

function rememberViewport(name) {
  writeJson(STATE(), { ...readJson(STATE(), {}), viewport: name });
}

function toUrl(target, flags) {
  if (/^https?:\/\//.test(target)) return target;
  const base = flags.base ?? config.browser.baseUrl;
  return new URL(target.startsWith('/') ? target : `/${target}`, base).toString();
}

async function open(positional, flags) {
  const target = positional[0];
  if (!target) throw new OpError('Missing path or URL', 'Usage: op open /products [--mobile]');
  rememberViewport(flags.mobile ? 'mobile' : 'desktop');
  const p = await page();

  const consoleErrors = [];
  const failedRequests = [];
  p.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 300)));
  p.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`));
  p.on('requestfailed', (r) => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  p.on('response', (r) => r.status() >= 400 && failedRequests.push({ url: r.url(), status: r.status() }));

  const url = toUrl(target, flags);
  const started = Date.now();
  let response;
  try {
    response = await p.goto(url, { waitUntil: 'load', timeout: Number(flags.timeout ?? 60) * 1000 });
  } catch (err) {
    const hint = url.startsWith(config.browser.baseUrl) ? 'Is the web server up? Run `op status` / `op up web`.' : undefined;
    throw new OpError(`Navigation to ${url} failed: ${err.message.split('\n')[0]}`, hint);
  }
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  return {
    url: p.url(),
    status: response?.status() ?? null,
    title: await p.title(),
    ms: Date.now() - started,
    viewport: flags.mobile ? 'mobile' : 'desktop',
    consoleErrors: consoleErrors.slice(0, 20),
    failedRequests: failedRequests.slice(0, 20),
    next: 'op snapshot  |  op screenshot',
  };
}

async function snapshot(_positional, flags) {
  const p = await page();
  if (p.url() === 'about:blank') throw new OpError('No page is open', 'Run `op open <path>` first.');
  const selector = flags.selector ?? 'body';
  const loc = p.locator(selector).first();
  if ((await loc.count()) === 0) throw new OpError(`Selector "${selector}" matched nothing`, 'Omit --selector for the whole page, or try "main".');
  const tree = await loc.ariaSnapshot();
  const max = Number(flags.max ?? 15000);
  return { url: p.url(), title: await p.title(), selector, truncated: tree.length > max, snapshot: tree.slice(0, max) };
}

async function screenshot(positional, flags) {
  const p = await page();
  if (p.url() === 'about:blank') throw new OpError('No page is open', 'Run `op open <path>` first.');
  const file = positional[0] ? path.resolve(positional[0]) : stateFile('shots', `${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await p.screenshot({ path: file, fullPage: !!flags.full });
  return { url: p.url(), path: file, fullPage: !!flags.full, viewport: p.viewportSize() };
}

const UNSAFE_CONTROL = /place|pay|order|submit|apply|confirm|save|delete|remove|retrigger|record|send|update|create|logout|sign ?out|continue|proceed|checkout|buy/i;

function locatorFor(p, positional, flags) {
  if (flags.selector) return p.locator(String(flags.selector));
  const name = positional.join(' ');
  if (!name) throw new OpError('Missing control name', 'Usage: op click "Open filters"  |  op click --selector "css"');
  return flags.role ? p.getByRole(String(flags.role), { name, exact: !!flags.exact }) : p.getByRole('button', { name, exact: !!flags.exact }).or(p.getByRole('link', { name, exact: !!flags.exact }));
}

async function describe(loc) {
  return (await loc.evaluate((el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 80))) || '(no accessible name)';
}

async function click(positional, flags) {
  const p = await page();
  if (p.url() === 'about:blank') throw new OpError('No page is open', 'Run `op open <path>` first.');
  const all = locatorFor(p, positional, flags);
  const count = await all.count();
  if (count === 0) throw new OpError('No matching control', 'Run `op snapshot` and copy the exact button/link name, or use --selector.');
  const nth = Number(flags.nth ?? 0);
  if (count > 1 && flags.nth === undefined) {
    const names = await Promise.all(Array.from({ length: Math.min(count, 8) }, (_, i) => describe(all.nth(i))));
    throw new OpError(`${count} controls match`, `Pick one with --nth 0..${count - 1}. Matches: ${names.join(' | ')}`);
  }
  const target = all.nth(nth);
  const label = await describe(target);
  if (UNSAFE_CONTROL.test(label)) {
    throw new OpError(`Refusing to click "${label}"`, 'It may write to the production database or message a customer. Verify that path with `op check` or order commands instead.');
  }
  const before = p.url();
  await target.click({ timeout: 10_000 });
  await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  const dialogs = await p.getByRole('dialog').evaluateAll((els) => els.map((el) => (el.getAttribute('aria-label') || el.querySelector('h1,h2,h3')?.textContent || '').trim()).filter(Boolean));
  return { clicked: label, urlBefore: before, url: p.url(), openDialogs: dialogs, next: dialogs.length ? 'op snapshot --selector "[role=dialog]"' : 'op snapshot' };
}

async function reset() {
  const p = await page();
  await p.context().clearCookies();
  const origin = p.url().startsWith('http') ? new URL(p.url()).origin : null;
  if (origin) await p.evaluate(() => (localStorage.clear(), sessionStorage.clear()));
  return { clearedCookies: true, clearedStorageFor: origin ?? 'no page open — open a page and reset again to clear its storage' };
}

async function stop() {
  const entry = readJson(STATE(), {});
  if (entry.pid && pidAlive(entry.pid)) {
    process.kill(entry.pid, 'SIGTERM');
    writeJson(STATE(), {});
    return { status: 'stopped', pid: entry.pid };
  }
  return { status: (await isPortOpen(config.browser.cdpPort)) ? 'running_but_not_owned' : 'not_running' };
}

export const commands = {
  'browser start': {
    summary: 'Start the persistent Chrome that open/snapshot/screenshot drive',
    booleans: ['headed'],
    usage: `
op browser start [--headed]

Launches Chrome with an isolated profile (.state/chrome-profile) and DevTools on port ${config.browser.cdpPort}.
Headless by default; --headed shows a window. open/snapshot/screenshot start it on demand,
so you only need this for --headed.`,
    run: (_p, flags) => start(flags),
  },
  'browser stop': {
    summary: 'Stop the Chrome started by op',
    usage: 'op browser stop',
    run: stop,
  },
  'browser reset': {
    summary: 'Clear cookies + local/sessionStorage of the open origin (cart, saved filters)',
    usage: `
op browser reset

Clears cookies for the whole profile and localStorage/sessionStorage for the currently open origin.
Run it before a pass so persisted state (cart, op_product_filters) doesn't change what pages render.`,
    run: reset,
  },
  click: {
    summary: 'Click a button/link by accessible name (opens drawers, swatches, tabs)',
    booleans: ['exact'],
    usage: `
op click "<accessible name>" [--role button|link|tab|…] [--exact] [--nth N]
op click --selector "<css>" [--nth N]

Names come from \`op snapshot\`. Several matches → error listing them; pick with --nth.
Returns the URL after the click and any open dialogs (drawers are dialogs).

Refuses controls whose name sounds like a write or a send (place/pay/order/submit/apply/
confirm/save/delete/retrigger/record/checkout/buy/…): everything behind them hits production.`,
    run: click,
  },
  open: {
    summary: 'Navigate the browser to a storefront/admin path; reports console + network errors',
    booleans: ['mobile'],
    usage: `
op open <path|url> [--mobile] [--base http://localhost:3000] [--timeout 60]

Paths resolve against ${config.browser.baseUrl}. Waits for load + network idle (≤8s).
Returns status, title, console errors and failed (≥400 / aborted) requests seen during the load.
The page stays open for \`op snapshot\` / \`op screenshot\` / \`op click\`, and the viewport
(--mobile or desktop) sticks until the next \`op open\`.
Admin pages need a signed-in admin session, which this slice does not provide yet.`,
    run: open,
  },
  snapshot: {
    summary: 'Accessibility-tree snapshot (YAML) of the open page',
    usage: `
op snapshot [--selector main] [--max 15000]

Playwright aria snapshot of the current page (or one element). Use it to assert text,
roles and structure instead of reading screenshots.`,
    run: snapshot,
  },
  screenshot: {
    summary: 'PNG of the open page as evidence',
    booleans: ['full'],
    usage: `
op screenshot [file.png] [--full]

Defaults to .state/shots/<timestamp>.png. --full captures the whole scrollable page.`,
    run: screenshot,
  },
};
