---
name: install-skill
description: Install a skill globally on this Mac through the private Roho7/skills-library repo. Use when the user asks to install, add, or vendor a skill, from a GitHub repo or one they wrote. Use instead of `npx skills add`.
---

Every install takes one path: **vendor** into the library, **link** it live, ship a PR. `scripts/install.sh` (next to this file) and the library's `scripts/link.mjs` do the mechanical parts, so run them rather than hand-editing.

## Layout

- Library: `Roho7/skills-library` (private), cloned at `~/Documents/MAIN/CODE/skills/library`. Skills live at `skills/<group>/<name>/`. Names are unique across groups. It sits inside the public `Roho7/skills` checkout, which gitignores it.
- `~/.agents/skills/<name>` is a symlink into the library, so edits land in the library. `~/.cursor/skills` is a symlink to `~/.agents/skills`, and `~/.claude/skills/<name>` is a symlink to `~/.agents/skills/<name>`.
- A vendored skill stays in the library. Only a skill the user wrote or changed can graduate to the public repo, through its `scripts/graduate.mjs`.
- `vendor.lock.json` gives each vendored skill its own entry and its own `commit` pin. Skills from the same upstream share `source`, `sourceUrl` and `group`, never a pin.

## Steps

1. **Resolve.** Find the upstream, the path to the skill's `SKILL.md` in it, and the commit. Use the user's commit if they named one, or omit it to pin upstream HEAD. For the group, reuse the existing group for that upstream: `jq -r '.skills[] | select(.source=="<owner/repo>") | .group' vendor.lock.json | sort -u`. Use `third-party` for a one-off source. Done when all four are known.
2. **Branch.** Work in the library on a branch off `origin/main` named `feat/vendor-<name>`, or `feat/<name>` for a user-written skill. Every `install.sh` call runs from inside that checkout.
3. **Vendor.** Run `install.sh vendor <name> <owner/repo> <path/to/SKILL.md> <group> [commit]`. It refuses a name already in the lock or the repo, then adds the lock entry, pulls the whole folder, runs `build.mjs --check` and `index.mjs`, and prints the pin. For a user-written skill, write it to `skills/personal/<name>/` and run `node scripts/index.mjs` instead. Done when the script exits 0 or the folder exists and the index is regenerated.
4. **Link.** Run `node scripts/link.mjs` from the library. It links every library skill, agent and generated rule into the live folders and keeps any real folder whose content differs. If it reports `kept`, stop and report what is there. Never overwrite it. Done when `~/.claude/skills/<name>/SKILL.md` resolves into the library.
5. **Ship.** Commit only the new skill folder, `vendor.lock.json` and `skills.json`. Push, then open a PR to `main` with its body written by the **pr** skill. Don't merge it, and don't delete any branch.
6. **Reply.** Give the PR URL, the pinned commit, the `link.mjs` output, and the frontmatter (`name`, `description`, and `disable-model-invocation` if present).
