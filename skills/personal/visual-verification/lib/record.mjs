import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { OpError, SKILL_DIR, pidAlive, readJson, run, stateFile, writeJson } from './core.mjs';
import { legibleScale, page, smallestTextPx, tabId } from './browser.mjs';

const STATE = () => stateFile('recording.json');
const MAX_GAP_S = 1.5;
const LAST_HOLD_S = 1;
const GIF_FPS = 10;
const GIF_MIN_WIDTH = 240;
const GIF_MAX_BYTES = 9_000_000;
const KEYFRAMES = 6;
const SHEET_MAX_PX = 1568;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(predicate, timeoutMs) {
  for (let waited = 0; waited < timeoutMs; waited += 100) {
    if (predicate()) return true;
    await sleep(100);
  }
  return predicate();
}

async function start(_positional, flags) {
  const current = readJson(STATE(), null);
  if (current && pidAlive(current.pid)) throw new OpError(`Already recording to ${current.dir} (pid ${current.pid})`, 'Run `shot record stop` first.');
  fs.rmSync(STATE(), { force: true });
  const p = await page();
  const viewport = p.viewportSize();
  const scale = legibleScale(await smallestTextPx(p, false));
  const dir = flags.dir ? path.resolve(flags.dir) : stateFile('recordings', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  const max = Number(flags.max ?? 120);
  const job = JSON.stringify({ dir, tab: await tabId(p), scale, viewport, max });
  const log = fs.openSync(path.join(dir, 'recorder.log'), 'a');
  const child = spawn(process.execPath, [path.join(SKILL_DIR, 'lib/recorder.mjs'), job], { detached: true, stdio: ['ignore', log, log] });
  child.unref();
  writeJson(STATE(), { pid: child.pid, dir, startedAt: new Date().toISOString(), scale, viewport });
  if (!(await waitFor(() => fs.existsSync(path.join(dir, 'ready')) || !pidAlive(child.pid), 10_000)) || !fs.existsSync(path.join(dir, 'ready'))) {
    fs.rmSync(STATE(), { force: true });
    if (pidAlive(child.pid)) process.kill(child.pid, 'SIGKILL');
    throw new OpError('Recorder did not start', `See ${path.join(dir, 'recorder.log')}`);
  }
  return { status: 'recording', dir, scale: Number(scale.toFixed(3)), maxSeconds: max, next: 'drive the flow with shot open/click, then shot record stop' };
}

function readFrames(dir) {
  const file = path.join(dir, 'frames.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => ({ ...JSON.parse(l), path: path.join(dir, 'frames', JSON.parse(l).file) }));
}

async function ffmpeg(args) {
  const res = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
  if (res.code !== 0) throw new OpError(`ffmpeg failed: ${res.stderr.trim().split('\n').pop()}`, 'Run `shot doctor`; ffmpeg must be on PATH (brew install ffmpeg on macOS, apt install ffmpeg on Debian/Ubuntu).');
}

async function frameSize(file) {
  const res = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [width, height] = res.stdout.trim().split(',').map(Number);
  if (!width || !height) throw new OpError(`Could not read the size of ${file}`, 'Run `shot doctor`; ffprobe ships with ffmpeg.');
  return { width, height };
}

async function encodeGif(dir, listFile, width, height) {
  const normalized = path.join(dir, 'frames.mkv');
  const gif = path.join(dir, 'demo.gif');
  const fit = `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white,fps=${GIF_FPS},format=rgb24`;
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-vf', fit, '-c:v', 'ffv1', normalized]);
  await ffmpeg(['-i', normalized, '-lavfi', 'split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', gif]);
  fs.rmSync(normalized, { force: true });
  return gif;
}

async function buildGif(dir, frames, { width, height }) {
  const list = frames.map((f, i) => {
    const gap = i + 1 < frames.length ? Math.min(frames[i + 1].t - f.t, MAX_GAP_S) : LAST_HOLD_S;
    return `file '${f.path}'\nduration ${Math.max(gap, 0.01).toFixed(3)}`;
  });
  list.push(`file '${frames.at(-1).path}'`);
  const listFile = path.join(dir, 'frames.ffconcat');
  fs.writeFileSync(listFile, list.join('\n'));
  let w = width;
  for (;;) {
    const h = Math.round((w * height) / width);
    const gif = await encodeGif(dir, listFile, w, h);
    if (fs.statSync(gif).size <= GIF_MAX_BYTES || w <= GIF_MIN_WIDTH) return { gif, size: `${w}x${h}` };
    w = Math.max(GIF_MIN_WIDTH, Math.round(w * 0.75));
  }
}

async function buildSheet(dir, frames, { width, height }) {
  const n = Math.min(KEYFRAMES, frames.length);
  const picks = [...new Set(Array.from({ length: n }, (_, i) => Math.round((i * (frames.length - 1)) / Math.max(n - 1, 1))))].map((i) => frames[i]);
  const cols = Math.min(picks.length, width >= height ? 2 : 3);
  const rows = Math.ceil(picks.length / cols);
  const fitScale = Math.min(1, SHEET_MAX_PX / (cols * width), SHEET_MAX_PX / (rows * height));
  const cw = Math.floor(width * fitScale);
  const ch = Math.floor(height * fitScale);
  const cells = picks.map((_, i) => `[${i}:v]scale=w='min(iw,${cw})':h='min(ih,${ch})':force_original_aspect_ratio=decrease,pad=${cw}:${ch}:(ow-iw)/2:(oh-ih)/2:color=#6b7280[c${i}]`);
  const layout = picks.map((_, i) => `${(i % cols) * cw}_${Math.floor(i / cols) * ch}`).join('|');
  const stack = picks.length > 1 ? `${picks.map((_, i) => `[c${i}]`).join('')}xstack=inputs=${picks.length}:layout=${layout}:fill=#6b7280` : '[c0]null';
  const sheet = path.join(dir, 'keyframes.png');
  await ffmpeg([...picks.flatMap((f) => ['-i', f.path]), '-filter_complex', `${cells.join(';')};${stack}`, '-frames:v', '1', sheet]);
  return { sheet, keyframes: picks.map((f) => ({ t: Number(f.t.toFixed(1)) })) };
}

async function stop() {
  const current = readJson(STATE(), null);
  if (!current) throw new OpError('Not recording', 'Run `shot record start` first.');
  const done = path.join(current.dir, 'done');
  if (pidAlive(current.pid)) {
    process.kill(current.pid, 'SIGTERM');
    if (!(await waitFor(() => fs.existsSync(done), 10_000))) process.kill(current.pid, 'SIGKILL');
  }
  fs.rmSync(STATE(), { force: true });
  const frames = readFrames(current.dir);
  if (!frames.length) throw new OpError('The recording captured no frames', `See ${path.join(current.dir, 'recorder.log')}`);
  const size = await frameSize(frames[0].path);
  const { gif, size: gifSize } = await buildGif(current.dir, frames, size);
  const { sheet, keyframes } = await buildSheet(current.dir, frames, size);
  const durationS = frames.at(-1).t + LAST_HOLD_S;
  return {
    gif,
    sheet,
    durationS: Number(durationS.toFixed(1)),
    frameCount: frames.length,
    keyframes,
    gifBytes: fs.statSync(gif).size,
    size: gifSize,
    next: 'Read keyframes.png to check the flow, then shot pr-image <gif> [--pr N]',
  };
}

export const commands = {
  'record start': {
    summary: 'Start recording the open page as frames for a GIF demo',
    usage: `
shot record start [--max 120]

Records this checkout's tab in the background and returns at once. Drive the flow with
shot open / click, then \`shot record stop\`.
Stops itself after --max seconds. Needs ffmpeg for \`record stop\`.`,
    run: start,
  },
  'record stop': {
    summary: 'Stop recording; build demo.gif and a keyframes.png contact sheet to check it',
    usage: `
shot record stop

Writes demo.gif and keyframes.png next to the frames in <state dir>/recordings/<timestamp>/.
Read keyframes.png (6 frames in time order) to confirm the flow before shot pr-image <gif>.
Frame gaps are capped at 1.5s in the GIF, so idle waits do not drag.`,
    run: stop,
  },
};
