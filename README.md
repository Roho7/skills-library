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
rules/<name>.md             always-on rules shared by all tools (e.g. pstack-defaults)
models.json                 pstack model policy: roles → tiers → each tool's model
adapters/claude/            Cursor→Claude translation: substitutions.json (build time) + pstack-runtime.md (leftovers, read at runtime)
generated/                  build output, gitignored: per-tool model sheets + Claude-translated pstack
skills.json                 generated index of skills + agents, for orchestrators
vendor.lock.json            upstream of each vendored skill/agent: sourceUrl, skillPath, group, kind
scripts/build.mjs           build generated/ (--check fails on untranslated Cursor terms)
scripts/link.sh             build, symlink everything into the tools, regenerate skills.json
scripts/update-vendor.sh    re-pull vendored entries from upstream; review with git diff
scripts/index.mjs           regenerate skills.json
```

`link.sh` targets:

| Repo | Linked into |
|---|---|
| `skills/*/*` | `~/.cursor/skills`, `~/.agents/skills`, `~/.claude/skills` |
| `generated/claude/skills/*` | `~/.claude/skills`, replacing the source copy (pstack only) |
| `agents/*/*.md` | `~/.claude/agents`, `~/.cursor/agents` |
| `rules/*.md` | `~/.claude/rules/*.md`, `~/.cursor/rules/*.mdc` |
| `generated/claude/*.md` | `~/.claude/rules/` (`pstack-models.md`, `pstack-runtime.md`) |
| `generated/cursor/*.mdc` | `~/.cursor/rules/` (`pstack-models.mdc`) |

## One pstack, two tools

pstack is written for Cursor. Following [pstack-claude](https://github.com/michael-denyer/pstack-claude), it is translated for Claude Code at build time instead of asking the model to translate at runtime:

- **Models:** `models.json` assigns each role to tiers (`worker`, `judge`) and each tier to a model per tool (Cursor `grok-4.7-medium`, Claude `sonnet medium`). `build.mjs` writes both sheets from it, so changing a role changes both tools. Don't run `/setup-pstack`; edit `models.json` and run `link.sh`.
- **Text:** `adapters/claude/substitutions.json` rewrites Cursor tool names, model slugs and paths in a copy of pstack (`Task` → `Agent`, `AskQuestion` → `AskUserQuestion`, `claude-opus-5-5-xhigh` → `opus xhigh`, `grok-*` → `inherit-parent`, `.mdc` sheet → `~/.claude/rules/pstack-models.md`). Cursor keeps the original files.
- **Leftovers:** rare Cursor-only features (Automations, Bugbot setup, cloud dashboards, transcripts) are covered by the short `pstack-runtime.md` rule Claude reads every session.
- **Drift guard:** after `update-vendor.sh`, `link.sh` runs `build.mjs --check` and stops if a denylisted Cursor term survives. Add a substitution, then rerun.

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
