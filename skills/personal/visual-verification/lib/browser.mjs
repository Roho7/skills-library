import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { OpError, config, isPortOpen, pidAlive, readJson, writeJson, stateFile, relPath, requireAuth, SKILL_DIR, CHROME_PROFILE_DIR } from './core.mjs';

export const STATE = () => stateFile('browser.json');
export const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

export function chromeExecutable() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p)) ?? null;
}

export async function playwright() {
  try {
    return await import(path.join(SKILL_DIR, 'node_modules/playwright-core/index.mjs'));
  } catch {
    throw new OpError('playwright-core is not installed', `Run: npm --prefix ${relPath(SKILL_DIR)} install`);
  }
}

export function profileHolder() {
  let target;
  try {
    target = fs.readlinkSync(path.join(CHROME_PROFILE_DIR, 'SingletonLock'));
  } catch {
    return null;
  }
  const pid = Number(target.split('-').pop());
  if (!pidAlive(pid)) return null;
  let cdpPort = null;
  try {
    const command = execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' });
    cdpPort = Number(command.match(/--remote-debugging-port=(\d+)/)?.[1]) || null;
  } catch {}
  return { pid, cdpPort };
}

const adoptedPort = process.env.SHOT_CDP_PORT ? null : profileHolder()?.cdpPort;
if (adoptedPort) config.cdpPort = adoptedPort;
export const CDP = `http://127.0.0.1:${config.cdpPort}`;

function profileHeldError(holder) {
  const reuse = holder.cdpPort ? `reuse it with SHOT_CDP_PORT=${holder.cdpPort} (you share its tabs with whoever started it)` : 'stop it';
  return new OpError(
    `Chrome pid ${holder.pid} already holds the profile ${CHROME_PROFILE_DIR}${holder.cdpPort ? ` on DevTools port ${holder.cdpPort}` : ''}`,
    `Chrome allows one instance per profile. Either ${reuse}, or isolate with SHOT_PROFILE=<empty dir> and SHOT_CDP_PORT=<free port> (no saved login there).`,
  );
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
  throw new OpError('Chrome did not expose the DevTools port in time', `Check whether port ${config.cdpPort} is blocked, then \`shot browser stop\` and retry.`);
}

async function start(flags = {}) {
  if (await isPortOpen(config.cdpPort)) return { status: 'already_running', ...readJson(STATE(), {}) };
  const exe = chromeExecutable();
  if (!exe) throw new OpError('No Chrome/Chromium found', 'Install Google Chrome.');
  const holder = profileHolder();
  if (holder) throw profileHeldError(holder);
  const args = [
    `--remote-debugging-port=${config.cdpPort}`,
    `--user-data-dir=${CHROME_PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--window-size=${VIEWPORTS.desktop.width},${VIEWPORTS.desktop.height}`,
    ...(flags.headed ? [] : ['--headless=new']),
    'about:blank',
  ];
  const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
  child.unref();
  await waitForCdp();
  const entry = { pid: child.pid, headed: !!flags.headed, cdp: CDP, profile: CHROME_PROFILE_DIR, startedAt: new Date().toISOString() };
  writeJson(STATE(), entry);
  return { status: 'started', ...entry };
}

export async function tabId(p) {
  const session = await p.context().newCDPSession(p);
  try {
    return (await session.send('Target.getTargetInfo')).targetInfo.targetId;
  } finally {
    await session.detach();
  }
}

export async function page() {
  if (!(await isPortOpen(config.cdpPort))) await start();
  const { chromium } = await playwright();
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const { tab } = readJson(STATE(), {});
  let p = null;
  for (const candidate of context.pages()) if ((await tabId(candidate)) === tab) p = candidate;
  if (!p) {
    p = await context.newPage();
    writeJson(STATE(), { ...readJson(STATE(), {}), tab: await tabId(p) });
  }
  await p.setViewportSize(VIEWPORTS[readJson(STATE(), {}).viewport] ?? VIEWPORTS.desktop);
  return p;
}

function rememberViewport(name) {
  writeJson(STATE(), { ...readJson(STATE(), {}), viewport: name });
}

function toUrl(target, flags) {
  if (/^https?:\/\//.test(target)) return target;
  const base = flags.base ?? config.baseUrl;
  return new URL(target.startsWith('/') ? target : `/${target}`, base).toString();
}

async function open(positional, flags) {
  const target = positional[0];
  if (!target) throw new OpError('Missing path or URL', 'Usage: shot open /products [--mobile]');
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
    const hint = url.startsWith(config.baseUrl) ? 'Is the server up at baseUrl? Set SHOT_BASE_URL or baseUrl in .shot.json.' : undefined;
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
    next: 'shot snapshot  |  shot screenshot',
  };
}

async function snapshot(_positional, flags) {
  const p = await page();
  if (p.url() === 'about:blank') throw new OpError('No page is open', 'Run `shot open <path>` first.');
  const selector = flags.selector ?? 'body';
  const loc = p.locator(selector).first();
  if ((await loc.count()) === 0) throw new OpError(`Selector "${selector}" matched nothing`, 'Omit --selector for the whole page, or try "main".');
  const tree = await loc.ariaSnapshot();
  const max = Number(flags.max ?? 15000);
  return { url: p.url(), title: await p.title(), selector, truncated: tree.length > max, snapshot: tree.slice(0, max) };
}

export const LEGIBLE_TEXT_PX = 6;
export const MIN_SCALE = 0.5;

export async function smallestTextPx(p, fullPage) {
  return p.evaluate((fullPage) => {
    let smallest = Infinity;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || !node.textContent.trim()) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (!fullPage && (rect.bottom < 0 || rect.top > innerHeight)) continue;
      smallest = Math.min(smallest, parseFloat(style.fontSize));
    }
    return Number.isFinite(smallest) ? smallest : null;
  }, fullPage);
}

export function legibleScale(smallest) {
  return smallest ? Math.min(1, Math.max(MIN_SCALE, LEGIBLE_TEXT_PX / smallest)) : 1;
}

async function capture(p, { fullPage, scale }) {
  const clip = await p.evaluate((fullPage) => {
    const doc = document.documentElement;
    return fullPage
      ? { x: 0, y: 0, width: doc.scrollWidth, height: doc.scrollHeight }
      : { x: visualViewport.pageLeft, y: visualViewport.pageTop, width: innerWidth, height: innerHeight };
  }, fullPage);
  const session = await p.context().newCDPSession(p);
  try {
    const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, clip: { ...clip, scale } });
    return { png: Buffer.from(data, 'base64'), width: Math.round(clip.width * scale), height: Math.round(clip.height * scale) };
  } finally {
    await session.detach();
  }
}

async function screenshot(positional, flags) {
  const p = await page();
  if (p.url() === 'about:blank') throw new OpError('No page is open', 'Run `shot open <path>` first.');
  const file = positional[0] ? path.resolve(positional[0]) : stateFile('shots', `${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fullPage = !!flags.full;
  const smallest = await smallestTextPx(p, fullPage);
  const scale = flags['full-res'] ? 1 : legibleScale(smallest);
  const shot = await capture(p, { fullPage, scale });
  fs.writeFileSync(file, shot.png);
  return {
    url: p.url(),
    path: file,
    fullPage,
    size: `${shot.width}x${shot.height}`,
    smallestTextPx: smallest,
    scale: Number(scale.toFixed(3)),
    next: 'shot pr-image <path> [--pr N]',
  };
}

const unsafeControl = () => new RegExp(config.refuseClicks, 'i');

function locatorFor(p, positional, flags) {
  if (flags.selector) return p.locator(String(flags.selector));
  const name = positional.join(' ');
  if (!name) throw new OpError('Missing control name', 'Usage: shot click "Open filters"  |  shot click --selector "css"');
  return flags.role ? p.getByRole(String(flags.role), { name, exact: !!flags.exact }) : p.getByRole('button', { name, exact: !!flags.exact }).or(p.getByRole('link', { name, exact: !!flags.exact }));
}

async function describe(loc) {
  return (await loc.evaluate((el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 80))) || '(no accessible name)';
}

async function click(positional, flags) {
  const p = await page();
  if (p.url() === 'about:blank') throw new OpError('No page is open', 'Run `shot open <path>` first.');
  const all = locatorFor(p, positional, flags);
  const count = await all.count();
  if (count === 0) throw new OpError('No matching control', 'Run `shot snapshot` and copy the exact button/link name, or use --selector.');
  const nth = Number(flags.nth ?? 0);
  if (count > 1 && flags.nth === undefined) {
    const names = await Promise.all(Array.from({ length: Math.min(count, 8) }, (_, i) => describe(all.nth(i))));
    throw new OpError(`${count} controls match`, `Pick one with --nth 0..${count - 1}. Matches: ${names.join(' | ')}`);
  }
  const target = all.nth(nth);
  const label = await describe(target);
  if (unsafeControl().test(label)) {
    throw new OpError(`Refusing to click "${label}"`, 'It may write data or message someone. Verify that path another way, or change refuseClicks in .shot.json.');
  }
  const before = p.url();
  await target.click({ timeout: 10_000 });
  await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  const dialogs = await p.getByRole('dialog').evaluateAll((els) => els.map((el) => (el.getAttribute('aria-label') || el.querySelector('h1,h2,h3')?.textContent || '').trim()).filter(Boolean));
  return { clicked: label, urlBefore: before, url: p.url(), openDialogs: dialogs, next: dialogs.length ? 'shot snapshot --selector "[role=dialog]"' : 'shot snapshot' };
}

async function reset(_positional, flags) {
  const p = await page();
  const context = p.context();
  const cookie = config.auth ? requireAuth().cookie : null;
  const kept = flags.signout || !cookie ? [] : (await context.cookies()).filter((c) => cookie.test(c.name));
  await context.clearCookies();
  if (kept.length) await context.addCookies(kept);
  const origin = p.url().startsWith('http') ? new URL(p.url()).origin : null;
  if (origin) await p.evaluate(() => (localStorage.clear(), sessionStorage.clear()));
  return {
    clearedCookies: true,
    keptSignIn: kept.length > 0,
    clearedStorageFor: origin ?? 'no page open — open a page and reset again to clear its storage',
  };
}

async function login(_positional, flags) {
  const auth = requireAuth();
  const entry = readJson(STATE(), {});
  if (entry.headed && pidAlive(entry.pid)) return { status: 'already_headed', next: `Sign in at ${toUrl(auth.loginPath, flags)} in the open window, then \`shot browser whoami\`` };
  const holder = profileHolder();
  if (holder) {
    process.kill(holder.pid, 'SIGTERM');
    for (let waited = 0; waited < 10_000 && profileHolder(); waited += 250) await new Promise((r) => setTimeout(r, 250));
  }
  await start({ headed: true });
  const p = await page();
  await p.goto(toUrl(auth.loginPath, flags), { waitUntil: 'load' }).catch(() => {});
  return {
    status: 'waiting_for_sign_in',
    url: p.url(),
    profile: CHROME_PROFILE_DIR,
    next: 'A human signs in in the Chrome window. Then `shot browser whoami`, and `shot browser stop` to go back to headless.',
  };
}

async function whoami(_positional, flags) {
  const auth = requireAuth();
  const p = await page();
  const before = p.url();
  await p.goto(toUrl(auth.checkPath, flags), { waitUntil: 'load', timeout: 60_000 }).catch((err) => {
    throw new OpError(`Could not load ${auth.checkPath}: ${err.message.split('\n')[0]}`, 'Is the server up at baseUrl?');
  });
  const landed = new URL(p.url()).pathname;
  const hasAuthCookie = (await p.context().cookies()).some((c) => auth.cookie.test(c.name));
  const loggedIn = landed.startsWith(auth.checkPath);
  if (before !== 'about:blank' && before !== p.url()) await p.goto(before).catch(() => {});
  return {
    ok: loggedIn,
    loggedIn,
    hasAuthCookie,
    landed,
    profile: CHROME_PROFILE_DIR,
    ...(loggedIn ? {} : { hint: 'No login in this profile. A human runs `shot browser login` once and signs in; agents cannot.' }),
  };
}

async function otherTabs(ownTab) {
  const targets = await fetch(`${CDP}/json/list`).then((r) => r.json());
  return targets.filter((t) => t.type === 'page' && t.id !== ownTab && t.url !== 'about:blank');
}

async function stop() {
  const entry = readJson(STATE(), {});
  if (!(await isPortOpen(config.cdpPort))) {
    writeJson(STATE(), {});
    return { status: 'not_running' };
  }
  if (entry.tab) await fetch(`${CDP}/json/close/${entry.tab}`).catch(() => {});
  writeJson(STATE(), { ...entry, tab: undefined });
  const others = await otherTabs(entry.tab);
  if (entry.pid && pidAlive(entry.pid) && others.length === 0) {
    process.kill(entry.pid, 'SIGTERM');
    writeJson(STATE(), {});
    return { status: 'stopped', pid: entry.pid };
  }
  return { status: 'tab_closed', chromeLeftRunning: others.length ? `${others.length} other tab(s) open` : 'started by another checkout' };
}

export const commands = {
  'browser start': {
    summary: 'Start the persistent Chrome that open/snapshot/screenshot drive',
    booleans: ['headed'],
    usage: `
shot browser start [--headed]

Launches Chrome on the shared profile ${CHROME_PROFILE_DIR} and DevTools on port ${config.cdpPort}.
Headless by default; --headed shows a window. open/snapshot/screenshot start it on demand,
so you only need this for --headed. When another checkout's Chrome already holds the profile,
shot uses that Chrome on its port (unless SHOT_CDP_PORT pins one); every checkout drives its own tab.`,
    run: (_p, flags) => start(flags),
  },
  'browser login': {
    summary: 'Open a visible Chrome at auth.loginPath so a human can sign in once (shared by all worktrees)',
    usage: `
shot browser login

Quits whichever Chrome holds the shared profile, then starts it headed (${CHROME_PROFILE_DIR},
override with SHOT_PROFILE) and opens auth.loginPath. A human signs in; the
session then persists for every checkout that uses this profile. Agents never type
credentials. Needs the web server up (\`shot up web\`).`,
    run: login,
  },
  'browser whoami': {
    summary: 'Check whether the shared profile holds a login (loads auth.checkPath)',
    usage: `
shot browser whoami

Loads auth.checkPath and reports whether middleware let it through. ok:false means nobody has
signed in on this profile, or the session expired: ask the human to run \`shot browser login\`.`,
    run: whoami,
  },
  'browser stop': {
    summary: "Close this checkout's tab; quit Chrome if this checkout started it and no other tab is open",
    usage: 'shot browser stop',
    run: stop,
  },
  'browser reset': {
    summary: 'Clear cookies + local/sessionStorage of the open origin (keeps the auth cookie)',
    booleans: ['signout'],
    usage: `
shot browser reset [--signout]

Clears cookies for the whole profile and localStorage/sessionStorage for the currently open origin.
Run it before a pass so persisted state (carts, filters) doesn't change what pages render.
Cookies matching auth.cookie survive unless --signout.`,
    run: reset,
  },
  click: {
    summary: 'Click a button/link by accessible name (opens drawers, swatches, tabs)',
    booleans: ['exact'],
    usage: `
shot click "<accessible name>" [--role button|link|tab|…] [--exact] [--nth N]
shot click --selector "<css>" [--nth N]

Names come from \`shot snapshot\`. Several matches → error listing them; pick with --nth.
Returns the URL after the click and any open dialogs (drawers are dialogs).

Refuses controls whose name matches refuseClicks (default: place/pay/order/submit/apply/
confirm/save/delete/retrigger/record/checkout/buy/…): they may write data or message someone.`,
    run: click,
  },
  open: {
    summary: 'Navigate the browser to a path or URL; reports console + network errors',
    booleans: ['mobile'],
    usage: `
shot open <path|url> [--mobile] [--base http://localhost:3000] [--timeout 60]

Paths resolve against ${config.baseUrl}. Waits for load + network idle (≤8s).
Returns status, title, console errors and failed (≥400 / aborted) requests seen during the load.
The page stays open for \`shot snapshot\` / \`shot screenshot\` / \`shot click\`, and the viewport
(--mobile or desktop) sticks until the next \`shot open\`.
Pages behind a login need the session from \`shot browser login\`; check with \`shot browser whoami\` (needs "auth" in .shot.json).`,
    run: open,
  },
  snapshot: {
    summary: 'Accessibility-tree snapshot (YAML) of the open page',
    usage: `
shot snapshot [--selector main] [--max 15000]

Playwright aria snapshot of the current page (or one element). Use it to assert text,
roles and structure instead of reading screenshots.`,
    run: snapshot,
  },
  screenshot: {
    summary: 'PNG of the open page as evidence, shrunk to the smallest size its text stays legible at',
    booleans: ['full', 'full-res'],
    usage: `
shot screenshot [file.png] [--full] [--full-res]

Defaults to <state dir>/shots/<timestamp>.png. --full captures the whole scrollable page.
Chrome renders it shrunk until the smallest captured text is ${LEGIBLE_TEXT_PX}px tall (never below
${MIN_SCALE * 100}% size), and that small PNG is also what goes into PRs.
--full-res keeps the viewport's size: use it only when a human explicitly asks for full resolution.`,
    run: screenshot,
  },
};
