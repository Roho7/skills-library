---
name: verify-officepaglu
description: Verify OfficePaglu changes end to end with the `op` CLI — health checks, dev servers, typecheck/lint/test, driving the storefront in a real browser (snapshot + screenshot evidence), tracing an order's full timeline, scanning orders for invariant breaks, and checking Qikink status mapping. Use after any change to corporate-merch-web or corporate-merch-backend, when asked to "verify", "prove it works", "check the order", "why is order X stuck", or to reproduce a bug report.
---

# Verify OfficePaglu

Close the loop yourself: make the change, run `op`, read the JSON, fix, repeat. Show evidence (screenshot path, snapshot excerpt, check summary) instead of asking the user to look.

```bash
node .claude/skills/verify-officepaglu/op.mjs --help          # command list
node .claude/skills/verify-officepaglu/op.mjs <cmd> --help    # detailed usage
```

Below, `op` means `node .claude/skills/verify-officepaglu/op.mjs`. Every command prints one JSON object and exits 1 on failure; errors carry a `hint` telling you what to do next.

## Safety — read first

- **The only database is production** (`op doctor` prints the project ref). `op` only ever reads; never add write paths to it, and never "verify" by writing rows.
- `op up api` boots the API with `DISABLE_BACKGROUND_WORKERS=1` (no Qikink poller, job processor, Periskope socket or WhatsApp crons). `--with-workers` acts on real orders — only with the user's explicit ok.
- A local API still serves real endpoints against prod data. Browsing and GETs are fine; **never place an order, apply a coupon at checkout, retrigger, record a replacement, or press any admin mutation button** while verifying.
- `order trace` omits customer PII. Don't go fetch it separately.

## Loop

1. `op doctor` — fix anything with `ok: false` using its `fix`.
2. `op check` (or `--app web --only types`) — must be green for files you touched. Pre-existing failures: note them, don't fix unasked.
3. UI change → `op up all`, `op browser reset`, then `op open <path>` → `op snapshot` to assert text/structure → `op click "<name>"` to open drawers/swatches → `op screenshot` for evidence. Check `consoleErrors` / `failedRequests` from `open` against the known ones in the feature file. Repeat with `--mobile`.
4. Order / POD / payment change → `op order trace <id>` on an affected order, `op order invariants --since 7d` for regressions (compare against the baseline in `order-lifecycle.md`), `op qikink map "<status>"` for poller mapping changes.
5. `op browser reset`, `op down` and `op browser stop` when done.

Find the right page and how to reach a feature in `references/features/README.md`.

## Commands (first slice)

| Command | Use it for |
|---|---|
| `doctor` | Node, deps, env var names, ports, Supabase reachability, browser tooling |
| `up [api\|web\|all]` / `down` / `status` / `logs <app>` | Detached dev servers with health wait; `all` points web at the local API |
| `check [--app] [--only types,lint,test]` | Parallel tsc / eslint / node tests with file:line errors |
| `open <path> [--mobile]` / `snapshot [--selector]` / `screenshot [file] [--full]` | Persistent headless Chrome (isolated profile, CDP :9333); viewport sticks until the next `open`; `browser start --headed` to watch |
| `click "<name>" [--nth] [--exact]` / `click --selector css` | Opens drawers, swatches, tabs; reports open dialogs. Refuses write/send-sounding controls (place, pay, checkout, buy, apply, save, delete, retrigger, …) |
| `browser reset` | Clears cookies + local/sessionStorage (cart, saved filters, abandoned-cart ids) |
| `order trace <ref>` | One merged timeline: status events, Razorpay events, notifications, jobs, replacements + violations |
| `order invariants [--since 30d]` | Rules from CLAUDE.md across many orders (no_events, status_mismatch, replacement rules, duplicate_transition, …) |
| `qikink map "<raw status>" \| --all` | What the real `qikinkStatus.ts` maps a status to, and who gets alerted |

## Not yet covered

Admin pages need a signed-in admin session (Supabase SSR cookie; see `references/features/admin.md`) — `op open /admin/...` is redirected to `/login` by middleware. Until a persisted admin profile exists, verify admin changes with `check` + `order trace`, and say so in your report.

## Maintaining this skill

When you add a page, route, order rule or Qikink status, update the matching `references/features/*.md` file and, if a new rule is checkable, add it to `orderViolations` in `commands/order.mjs`. Keep output JSON, keep hints actionable, keep it read-only.
