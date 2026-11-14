---
name: setup-rohostack
description: Configure which models rohostack uses per role. Edits models.json in the skills repo and rebuilds the per-tool model sheets from it. Use for /setup-rohostack, "configure rohostack models", "rohostack budget", or changing rohostack's model choices.
---

# Setup rohostack

rohostack's model choices come only from `models.json` in the skills library (`~/Documents/MAIN/CODE/skills/library`). Never write a model sheet by hand or fill one with skill defaults. The build writes both sheets from `models.json`.

## Steps

1. Read `models.json` and show the user each role with its model per tool.
2. Ask what to change: a tier's model for one tool, or which tier a role uses. Prefer AskQuestion over free text.
3. Edit `models.json`. `tiers` maps each tier to a model per tool, and the `panel` tier to a list with one seat per entry. `roles` maps each role to one tier. `inherit-parent` runs the role on the parent chat model. Keep the tiers that judge or sit on a panel in the parent's own model family. Change `effort` only as the sheet's `# effort` line allows.
4. Run `node scripts/build.mjs --check` in the repo and fix anything it reports.
5. Copy each sheet in `generated/cursor/` and `generated/claude/` into that tool's rules folder (`~/.cursor/rules/`, `~/.claude/rules/`). Tell the user it applies to new sessions.
