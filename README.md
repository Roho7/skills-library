# skills

Single source of truth for every agent skill on my machines. Edit skills **here only**.

## Layout

```
skills/<name>/SKILL.md        global skills (Claude Code, Cursor, any ~/.agents reader). Project skills stay in their own repos.
vendor.lock.json              upstream source of each third-party skill in skills/
scripts/link.sh               symlink skills/* into ~/.claude/skills, ~/.agents/skills, ~/.cursor/skills
scripts/update-vendor.sh      re-pull third-party skills from upstream, review with git diff
```

## Setup on a new machine

```bash
git clone https://github.com/Roho7/skills ~/Documents/MAIN/CODE/skills
~/Documents/MAIN/CODE/skills/scripts/link.sh
```

## Workflows

| Task | How |
|---|---|
| Edit a skill | Edit `skills/<name>` (symlinked, live immediately), commit |
| Add own skill | Create `skills/<name>/SKILL.md`, run `scripts/link.sh` |
| Add third-party skill | `npx skills add <repo>` then copy its entry from `~/.agents/.skill-lock.json` into `vendor.lock.json` and its folder into `skills/`, run `scripts/link.sh` |
| Update third-party skills | `scripts/update-vendor.sh [name ...]`, review `git diff`, commit |

## Origins

- **Vendored** (`vendor.lock.json`): mattpocock/skills, remotion-dev/skills, higgsfield-ai/skills, getsentry/skills, shadcn/ui, vercel-labs/skills, dbreunig/scaffold-docs-skill.
- **pstack bundle** (installed 2026-10-14, no upstream URL recorded): `principle-*`, `poteto-*`, `pstack-teach`, `setup-pstack`, `architect`, `arena`, `swarm`, `tdd`, `why`, `how`, etc.
- **Other installers** (not auto-updated): `motion` (`npx motion-ai`), `composio-cli` (`composio login`).
- **Own**: `roho-mode`, `shh`, `officepaglu-*`, `create-pr`, `ff-pr-review-rules`, `review-comments`, `record_demo`, `quiz-me`, `rapid-fire`, `ask-my-opinion`, `chapterize`, `grilling`, `file-organizer`.

Not tracked: plugin skills (`~/.claude/plugins`, managed by the plugin marketplace) and claude.ai-synced skills (`~/.claude/skills/synced`).
