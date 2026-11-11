---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Edits models.json in the skills repo and installs the generated per-role model sheets. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

pstack's per-role models come from `models.json` in the skills repo (`~/Documents/MAIN/CODE/skills`): `budget`, `tiers` (each tier's model per tool) and `roles` (each role's tiers, one per seat for panel roles). `node scripts/build.mjs` generates `~/.cursor/rules/pstack-models.mdc` and `~/.claude/rules/pstack-models.md` from it. Never write either sheet by hand.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session. That is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Show the current mapping

Read `models.json` and show every role with its resolved model for this tool. Mark any real slug not in the detected set as needing a choice. `inherit-parent` and `auto` run the role on the parent chat model, never judge in Arena's cross-judge pool, and still count toward a panel's fan-out.

### 3. Change it

Ask what to change: the budget, a tier's model, or a role's tiers. Prefer AskQuestion over free text. Edit `models.json` only, then run `node scripts/build.mjs`. Every real slug you write must be in the detected set.

### 4. Install the sheets

Show the diff between `generated/cursor/pstack-models.mdc` and `generated/claude/pstack-models.md` and the installed sheets, and copy them into place once the user approves. The sheets apply to new sessions.

### 5. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 6. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
