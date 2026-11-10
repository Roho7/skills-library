# skills

Single source of truth for every global agent skill on my machines. Edit skills **here only**. Project skills stay in their own repos.

## Layout

```
skills/
  personal/      my own skills, incl. officepaglu-*
  pstack/        pstack bundle (manual copy; also installed as plugin pstack@cursor-plugins)
  mattpocock/    mattpocock/skills
  remotion/      remotion-dev/skills
  higgsfield/    higgsfield-ai/skills
  third-party/   single skills from other sources (shadcn, motion, composio-cli, ...)
vendor.lock.json            upstream source of each third-party skill
scripts/link.sh             flat-symlink skills/<group>/<name> into ~/.claude/skills, ~/.agents/skills, ~/.cursor/skills
scripts/update-vendor.sh    re-pull third-party skills from upstream, review with git diff
```

Groups are for humans only. Agents see a flat list, so skill names must be unique across groups (`link.sh` refuses duplicates).

## Setup on a new machine

```bash
git clone https://github.com/Roho7/skills ~/Documents/MAIN/CODE/skills
~/Documents/MAIN/CODE/skills/scripts/link.sh
```

## Workflows

| Task | How |
|---|---|
| Edit a skill | Edit `skills/<group>/<name>` (symlinked, live immediately), commit |
| Add own skill | Create `skills/personal/<name>/SKILL.md`, run `scripts/link.sh` |
| Add third-party skill | `npx skills add <repo>`, copy its entry from `~/.agents/.skill-lock.json` into `vendor.lock.json` and its folder into the right group, run `scripts/link.sh` |
| Move / rename / delete | Do it in the repo, run `scripts/link.sh` (stale links are pruned) |
| Update third-party skills | `scripts/update-vendor.sh [name ...]`, review `git diff`, commit |

## Origins without a lock entry

- `pstack/`: installed 2026-10-14 by hand; the plugin version is updated by the plugin marketplace.
- `third-party/motion` (`npx motion-ai`), `third-party/composio-cli` (`composio login`), `third-party/file-organizer` (ComposioHQ/awesome-claude-skills): update with their own installers.

Not tracked: plugin skills (`~/.claude/plugins`) and claude.ai-synced skills (`~/.claude/skills/synced`).
