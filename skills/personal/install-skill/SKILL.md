---
name: install-skill
description: Install a skill globally on this Mac through the Roho7/skills backup repo. Use when the user asks to install, add, or vendor a skill, from a GitHub repo or one they wrote. Use instead of `npx skills add`.
---

Every install takes one path: **vendor** into the repo, **link** into the live folders, ship a PR. `scripts/install.sh` (next to this file) does the mechanical parts, so run it rather than hand-editing.

## Layout

- Repo: `Roho7/skills`, cloned at `~/Documents/MAIN/CODE/skills`. Skills live at `skills/<group>/<name>/`. Names are unique across groups.
- `~/.agents/skills/<name>` is the real live copy. `~/.cursor/skills` is already a symlink to `~/.agents/skills`, so Cursor needs nothing. `~/.claude/skills/<name>` is a symlink to the live copy.
- `vendor.lock.json` gives each vendored skill its own entry and its own `commit` pin. Skills from the same upstream share `source`, `sourceUrl` and `group`, never a pin.

## Steps

1. **Resolve.** Find the upstream, the path to the skill's `SKILL.md` in it, and the commit. Use the user's commit if they named one, or omit it to pin upstream HEAD. For the group, reuse the existing group for that upstream: `jq -r '.skills[] | select(.source=="<owner/repo>") | .group' vendor.lock.json | sort -u`. Use `third-party` for a one-off source. Done when all four are known.
2. **Branch.** Work in the skills repo on a branch off `origin/main` named `feat/vendor-<name>`, or `feat/<name>` for a user-written skill. Every `install.sh` call runs from inside that checkout.
3. **Vendor.** Run `install.sh vendor <name> <owner/repo> <path/to/SKILL.md> <group> [commit]`. It refuses a name already in the lock or the repo, then adds the lock entry, pulls the whole folder, runs `build.mjs --check` and `index.mjs`, and prints the pin. For a user-written skill, write it to `skills/personal/<name>/` and run `node scripts/index.mjs` instead. Done when the script exits 0 or the folder exists and the index is regenerated.
4. **Link.** Run `install.sh link <name>`. It refuses if `~/.agents/skills/<name>` or `~/.claude/skills/<name>` exists. On refusal, stop and report what is there. Never overwrite it. Done when it prints `diff -r: identical`, `cmp: identical`, the symlink, and the frontmatter.
5. **Ship.** Commit only the new skill folder, `vendor.lock.json` and `skills.json`. Push, then open a PR to `main` with its body written by the **pr** skill. Don't merge it, and don't delete any branch.
6. **Reply.** Give the PR URL, the pinned commit, the link output, and the frontmatter (`name`, `description`, and `disable-model-invocation` if present).
