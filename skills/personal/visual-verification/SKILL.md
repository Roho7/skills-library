---
name: visual-verification
description: Drive a real Chrome to check UI changes, with legible screenshots, accessibility snapshots, GIF demos and PR image upload through the `shot` CLI. Use after changing a UI, and whenever taking screenshots, recording a GIF demo, or adding images to a PR.
license: MIT
compatibility: Requires Node 20+, Google Chrome or Chromium, ffmpeg, and git; gh for pr-image. macOS and Linux. Needs network once for npm install.
---

`shot` drives a persistent Chrome (one tab per git worktree), takes screenshots shrunk to the smallest size their text stays legible at, records GIF demos, and publishes images for PRs. Every command prints one JSON object (with `next`) and exits non-zero on failure. `shot <command> --help` has the details.

## Setup

`<skill-dir>` below is the folder holding this `SKILL.md`. `shot` means `node <skill-dir>/shot.mjs`.

1. Once per install: `npm --prefix <skill-dir> install` (pulls playwright-core).
2. `node <skill-dir>/shot.mjs doctor` checks Node 20+, playwright-core, Chrome, ffmpeg/ffprobe, the profile and the config source. Each failed check carries its `fix`.
3. Optional: `ln -s <skill-dir>/shot.mjs ~/.local/bin/shot` to type `shot` directly (`~/.local/bin` must be on `PATH`).

## Commands

| Command | Use |
| --- | --- |
| `shot open <path\|url> [--mobile]` | Navigate; reports console errors and failed requests. The viewport sticks until the next `open`. |
| `shot snapshot [--selector main]` | Accessibility tree: assert text and structure with it, not screenshots. |
| `shot click "<name>" [--nth N] [--selector css]` | Click a button or link; refuses names matching `refuseClicks`. |
| `shot screenshot [file.png] [--full]` | Legible PNG (stays small; `--full-res` only when a human asks). |
| `shot browser start\|stop\|login\|whoami\|reset` | `stop` closes only this worktree's tab. `login` opens a window for a human to sign in; agents never type credentials. |
| `shot record start` / `shot record stop` | GIF demo of a flow: drive it between the two. Writes `demo.gif` and `keyframes.png` (6 frames). |
| `shot pr-image <file>… [--pr N] [--title t]` | Push images to the `agent-screenshots` branch (any repo with a GitHub origin); prints markdown. Anyone who can read the repo can see them, so in a public repo they are public. |

## Screenshot and GIF for a PR

1. `shot open <path>`, then `shot screenshot <file>.png`; Read it.
2. For a UI flow: `shot record start`, drive with `shot open` / `shot click`, `shot record stop`. Read `keyframes.png` and confirm the flow shows before attaching.
3. `shot pr-image <file>` and paste the markdown into the PR body, or add `--pr <number>`.

## `.shot.json` (repo root, optional)

Config = defaults, then `.shot.json`, then env. State lives in `<git dir>/shot` (per worktree, never committed).

| Key | Default | Env |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3000` | `SHOT_BASE_URL` |
| `cdpPort` | `9333` | `SHOT_CDP_PORT` |
| `profile` | `~/.shot/profiles/<main worktree name>` | `SHOT_PROFILE` |
| `auth` | unset: `{ checkPath, loginPath, cookie }` (cookie is a regex) enables `whoami`, `login`, and keeping sign-in on `reset` | |
| `refuseClicks` | `place\|pay\|order\|submit\|…\|checkout\|buy` (regex) | |

Chrome allows one instance per profile: when another worktree's Chrome holds it, `shot` adopts that Chrome's port (unless `SHOT_CDP_PORT` is set). Isolate with `SHOT_PROFILE=<empty dir> SHOT_CDP_PORT=<free port>`.
