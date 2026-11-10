# skills

Single source of truth for every global skill, subagent and always-on rule used by my agents (Claude Code, Cursor, any `~/.agents` reader, orchestrators). Edit **here only**. Project skills stay in their own repos.

Rule: nothing that carries skills is installed through a plugin or `npx skills` directly. Upstreams are tracked in `vendor.lock.json` and pulled through this repo, so every tool sees the same version.

## Layout

```
skills/<group>/<name>/SKILL.md
  personal/      my own skills, incl. officepaglu-*
  pstack/        cursor/plugins → pstack/skills (pstack's teach is renamed pstack-teach)
  mattpocock/    mattpocock/skills
  remotion/      remotion-dev/skills
  higgsfield/    higgsfield-ai/skills
  third-party/   single skills from other sources
agents/<group>/<name>.md    subagents (pstack: poteto-agent, comment-sicko)
rules/<name>.md             always-on rules (e.g. pstack-defaults: no-comments on every pstack diff)
skills.json                 generated index of skills + agents, for orchestrators
vendor.lock.json            upstream of each vendored skill/agent: sourceUrl, skillPath, group, kind
scripts/link.sh             symlink everything into the tools, then regenerate skills.json
scripts/update-vendor.sh    re-pull vendored entries from upstream; review with git diff
scripts/index.mjs           regenerate skills.json
```

`link.sh` targets:

| Repo | Linked into |
|---|---|
| `skills/*/*` | `~/.claude/skills`, `~/.agents/skills`, `~/.cursor/skills` |
| `agents/*/*.md` | `~/.claude/agents`, `~/.cursor/agents` |
| `rules/*.md` | `~/.claude/rules/*.md`, `~/.cursor/rules/*.mdc` |

Groups are for humans only. Tools see flat lists, so names must be unique across groups (`link.sh` refuses duplicates). The folder name is the identity: `update-vendor.sh` rewrites upstream frontmatter `name:` to match it.

## Setup on a new machine or sandbox

```bash
git clone https://github.com/Roho7/skills ~/Documents/MAIN/CODE/skills
~/Documents/MAIN/CODE/skills/scripts/link.sh
```

Sandboxes and remote workers should clone at a pinned commit so a whole run uses one version.

## Workflows

| Task | How |
|---|---|
| Edit a skill | Edit `skills/<group>/<name>` (symlinked, live immediately), commit |
| Add own skill | Create `skills/personal/<name>/SKILL.md`, run `scripts/link.sh` |
| Add third-party skill | Add an entry to `vendor.lock.json` (`sourceUrl`, `skillPath`, `group`), run `scripts/update-vendor.sh <name>` then `scripts/link.sh` |
| Change vendored behaviour | Add a rule in `rules/`, don't edit vendored files (updates overwrite them) |
| Move / rename / delete | Do it in the repo, run `scripts/link.sh` (stale links are pruned) |
| Update vendored skills | `scripts/update-vendor.sh [name ...]`, review `git diff`, commit |

## Origins without a lock entry

`third-party/motion` (`npx motion-ai`), `third-party/composio-cli` (`composio login`), `third-party/file-organizer` (ComposioHQ/awesome-claude-skills). Update these with their own installers, then copy them in.

Not tracked: plugin skills that ship MCP tools (`~/.claude/plugins`: composio, figma, taste-skill), claude.ai-synced skills (`~/.claude/skills/synced`), and machine-specific config such as `~/.cursor/rules/pstack-models.mdc`.
