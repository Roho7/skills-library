---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Edits models.json in the skills repo and rebuilds the per-tool model sheets from it. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

pstack's model choices come only from `models.json` in the skills repo (`~/Documents/MAIN/CODE/skills`). Never write a model sheet by hand or fill one with skill defaults. The build writes both sheets from `models.json`.

## Steps

1. Read `models.json` and show the user each role with its model per tool.
2. Ask what to change: the `budget` label, a tier's model for one tool, or which tiers a role uses. Prefer AskQuestion over free text.
3. Edit `models.json`. `tiers` maps each tier to one model per tool. `roles` maps each role to its tiers, and a panel role (arena runners, architect runners, interrogate reviewers, arena cross-judge pool) lists one tier per seat. `inherit-parent` runs the role on the parent chat model and never cross-judges.
4. Run `node scripts/build.mjs --check` in the repo and fix anything it reports.
5. Copy each sheet in `generated/cursor/` and `generated/claude/` into that tool's rules folder (`~/.cursor/rules/`, `~/.claude/rules/`). Tell the user it applies to new sessions.
