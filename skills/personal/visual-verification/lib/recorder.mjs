import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './core.mjs';
import { CDP, STATE, VIEWPORTS, playwright, tabId } from './browser.mjs';

const { dir, tab, scale, viewport, max } = JSON.parse(process.argv[2]);
const { chromium } = await playwright();
const browser = await chromium.connectOverCDP(CDP);
let target = null;
for (const p of browser.contexts().flatMap((c) => c.pages())) if ((await tabId(p)) === tab) target = p;
if (!target) throw new Error(`tab ${tab} not found`);
const session = await target.context().newCDPSession(target);

fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
const index = path.join(dir, 'frames.jsonl');
let count = 0;
let t0 = null;
session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  t0 ??= metadata.timestamp;
  const file = `${String(++count).padStart(6, '0')}.jpg`;
  fs.writeFileSync(path.join(dir, 'frames', file), Buffer.from(data, 'base64'));
  fs.appendFileSync(index, `${JSON.stringify({ file, t: metadata.timestamp - t0 })}\n`);
  session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

await session.send('Page.enable');
await session.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: Math.round(viewport.width * scale), maxHeight: Math.round(viewport.height * scale) });
fs.writeFileSync(path.join(dir, 'ready'), '');

async function holdViewport() {
  const want = VIEWPORTS[readJson(STATE(), {}).viewport];
  if (!want || (await target.evaluate(() => innerWidth).catch(() => want.width)) === want.width) return;
  await target.setViewportSize(want).catch(() => {});
}
await holdViewport();
const viewportTimer = setInterval(holdViewport, 250);

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(viewportTimer);
  await session.send('Page.stopScreencast').catch(() => {});
  fs.writeFileSync(path.join(dir, 'done'), '');
  await browser.close().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', stop);
setTimeout(stop, max * 1000);
