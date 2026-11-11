# skills

Backup of my global skills, subagents and always-on rules. Nothing here is linked into any tool. The live copies are on my Mac:

| What | Live location |
|---|---|
| Skills | `~/.agents/skills` (real folders, the source of truth). `~/.cursor/skills` is a symlink to it, and each `~/.claude/skills/<name>` links into it. |
| Subagents | `~/.claude/agents`, `~/.cursor/agents` |
| Rules | `~/.claude/rules`, `~/.cursor/rules` |

Edit skills in `~/.agents/skills`, then back them up here. Project skills stay in their own repos.

Upstreams are tracked in `vendor.lock.json` and pulled through this repo, so every tool sees the same version.

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
vendor.lock.json            upstream of each vendored skill/agent: sourceUrl, pinned commit, skillPath, group, kind
patches/<group>/<name>.patch  local changes to vendored files, re-applied by update-vendor.sh after every pull
scripts/build.mjs           build generated/ (--check fails on untranslated Cursor terms)
scripts/update-vendor.sh    re-pull vendored entries at their pinned commit (--latest to bump), apply patches/; review with git diff
scripts/index.mjs           regenerate skills.json
```

## One pstack, two tools

pstack is written for Cursor. Following [pstack-claude](https://github.com/michael-denyer/pstack-claude), it is translated for Claude Code at build time instead of asking the model to translate at runtime:

- **Models:** `models.json` is the only place model slugs live. It assigns each role to tiers and each tier to a model per tool: `worker` is Cursor `grok-4.7-medium` / Claude `sonnet medium`, `judge` is `inherit-parent` (the parent chat model) on both, and panel roles (arena, architect, interrogate) get one `judge` and one `worker` seat. `build.mjs` writes both sheets from it, so changing a role changes both tools. Edit `models.json` (or run `/setup-pstack`, which is patched to do that), run `node scripts/build.mjs`, and copy `generated/cursor/pstack-models.mdc` to `~/.cursor/rules/` and `generated/claude/pstack-models.md` to `~/.claude/rules/`. Vendored skills carry no fallback slugs: a role with no sheet line runs on the parent model.
- **Open gap:** the `arena cross-judge pool` is `inherit-parent` + `worker`, and `inherit-parent` never judges, so a Grok parent on Cursor, and every Claude Code session (`sonnet` is the parent's family), gets no cross-family judge. Add an other-family entry to that role to close it.
- **Text:** `adapters/claude/substitutions.json` rewrites Cursor tool names and paths in a copy of pstack (`Task` → `Agent`, `AskQuestion` → `AskUserQuestion`, `.mdc` sheet → `~/.claude/rules/pstack-models.md`). Model slugs are not rewritten; `--check` fails if one appears. Cursor keeps the original files.
- **Leftovers:** rare Cursor-only features (Automations, Bugbot setup, cloud dashboards, transcripts) are covered by the short `pstack-runtime.md` rule Claude reads every session.
- **Drift guard:** after `update-vendor.sh`, run `node scripts/build.mjs --check`; it fails if a denylisted Cursor term survives. Add a substitution, then rerun.
- **Not installed:** the skills in `~/.agents/skills` are the tool-agnostic `skills/pstack` copies. The Claude-translated build in `generated/claude/skills` is no longer installed anywhere.

Groups are for humans only. Tools see flat lists, so names must be unique across groups (`~/.agents/skills` is one flat folder). The folder name is the identity: `update-vendor.sh` rewrites upstream frontmatter `name:` to match it.

## Restore on a new machine

```bash
git clone https://github.com/Roho7/skills ~/Documents/MAIN/CODE/skills
mkdir -p ~/.agents/skills ~/.claude/skills ~/.cursor
cp -R ~/Documents/MAIN/CODE/skills/skills/*/* ~/.agents/skills/
ln -s ~/.agents/skills ~/.cursor/skills
for s in ~/.agents/skills/*; do ln -s "$s" ~/.claude/skills/; done
```

Sandboxes and remote workers should clone at a pinned commit so a whole run uses one version.

## Workflows

| Task | How |
|---|---|
| Edit or add a skill | Edit `~/.agents/skills/<name>`, then back it up: `rsync -a --delete ~/.agents/skills/<name>/ skills/<group>/<name>/`, run `node scripts/index.mjs`, commit |
| New skill for Claude | Also run `ln -s ~/.agents/skills/<name> ~/.claude/skills/` (Cursor sees it through the folder link) |
| Add third-party skill | Add an entry to `vendor.lock.json` (`sourceUrl`, `skillPath`, `group`), run `scripts/update-vendor.sh <name>`, then copy it into `~/.agents/skills` |
| Change vendored behaviour | Prefer a rule in `rules/`. If the vendored text itself must change: `scripts/update-vendor.sh --no-patch <name>`, `git add` it, edit, save `git diff -- skills/<group>/<name>` as `patches/<group>/<name>.patch`, then rerun without `--no-patch` |
| Rename / delete | Do it in `~/.agents/skills` and fix the `~/.claude/skills` link, then mirror it here |
| Update vendored skills | `scripts/update-vendor.sh --latest [name ...]` (moves the pins), fix any patch it reports as FAIL, run `node scripts/build.mjs --check`, review `git diff`, commit, copy changed folders into `~/.agents/skills` |

## Origins without a lock entry

`third-party/motion` (`npx motion-ai`), `third-party/composio-cli` (`composio login`), `third-party/file-organizer` (ComposioHQ/awesome-claude-skills). Update these with their own installers, then copy them in.

Not tracked: plugin skills that ship MCP tools (`~/.claude/plugins`: composio, figma, taste-skill), claude.ai-synced skills (`~/.claude/skills/synced`), and machine-specific config such as `~/.cursor/rules/pstack-models.mdc`.
