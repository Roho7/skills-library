# skills-library

The private library of every skill, subagent and always-on rule I use. It lives at `~/Documents/MAIN/CODE/skills/library`, inside the public [Roho7/skills](https://github.com/Roho7/skills) checkout, which gitignores it.

The live folders link here, so an agent that edits a skill edits the library:

| What | Live location |
|---|---|
| Skills | `~/.agents/skills/<name>` links to `skills/<group>/<name>`. `~/.cursor/skills` links to `~/.agents/skills`, and each `~/.claude/skills/<name>` links to `~/.agents/skills/<name>`. |
| Subagents | `~/.claude/agents/<name>.md`, `~/.cursor/agents/<name>.md` link to `agents/<group>/<name>.md` |
| Rules | `~/.claude/rules/rohostack-*`, `~/.cursor/rules/rohostack-*` link to `generated/<tool>/` |

`node scripts/link.mjs [--prune]` creates every link. It is idempotent, and it keeps a real folder whose content differs instead of overwriting it.

A skill I wrote or changed graduates to the public repo with `node ../scripts/graduate.mjs <name> <bucket>`. The folder moves to `../skills/<bucket>/<name>`, and a symlink stays here, so the live link and later edits keep working. A vendored skill that is unchanged from upstream never graduates.

Upstreams are tracked in `vendor.lock.json` and pulled through this repo, so every tool sees the same version.

## Layout

```
skills/<group>/<name>/SKILL.md
  personal/      my own skills, incl. officepaglu-*
  rohostack/     my fork of pstack (cursor/plugins, MIT), graduated to the public repo
  cursor-team-kit/  cursor/plugins → cursor-team-kit (deslop)
  mattpocock/    mattpocock/skills
  remotion/      remotion-dev/skills
  higgsfield/    higgsfield-ai/skills
  third-party/   single skills from other sources
agents/<group>/<name>.md    subagents (rohostack: roho-agent, comment-sicko)
rules/<name>.md             always-on rules shared by all tools (e.g. rohostack-defaults)
models.json                 rohostack model policy: roles → tiers → each tool's model; maps upstream default slugs to tiers
overrides/<group>/<name>/   files build.mjs lays over a vendored skill in generated/ (e.g. setup-rohostack)
adapters/common/            rewrites applied to both tools' rohostack copies (same-family judges)
adapters/claude/            Cursor→Claude translation: substitutions.json (build time) + rohostack-runtime.md (leftovers, read at runtime)
generated/                  build output, gitignored: per-tool model sheets + per-tool rohostack copies
skills.json                 generated index of skills + agents, for orchestrators
vendor.lock.json            upstream of each vendored skill/agent: sourceUrl, pinned commit, skillPath, group, kind
scripts/build.mjs           build generated/ (--check fails on leftover upstream slugs, denylisted terms or stale adapters/common rules)
scripts/update-vendor.sh    re-pull vendored entries at their pinned commit (--latest moves the pins); review with git diff
scripts/index.mjs           regenerate skills.json
scripts/link.mjs            link skills, agents and generated rules into the live folders
```

## One rohostack, two tools

rohostack is written for Cursor. Following [pstack-claude](https://github.com/michael-denyer/pstack-claude), it is translated for Claude Code at build time instead of asking the model to translate at runtime:

- **Models:** `models.json` is the only model policy. It assigns each role to one tier and each tier to a model per tool. Claude follows [pstack-claude's models.json](https://github.com/michael-denyer/pstack-claude/blob/main/plugins/pstack/models.json): `default` is `opus`, `strongest` is `fable` (our `hardest tasks`), `worker` is `sonnet` (feature and refactoring), and `panel` is `opus, fable, sonnet, haiku` (arena, architect, interrogate). Cursor sets every tier to `grok-4.7-medium`, so every rohostack role, panel seat and judge runs on it, with no `inherit-parent` and no other vendor's model. `build.mjs` writes both sheets from it, so changing a role changes both tools. Edit `models.json` and run `node scripts/build.mjs`. The live rules link to `generated/`, so the new sheets apply at once. Don't run the live `/setup-rohostack`: it is the upstream copy and writes upstream defaults. The build replaces it with `overrides/rohostack/setup-rohostack`, which edits `models.json` instead.
- **Fallbacks:** vendored rohostack falls back to upstream slugs when the sheet is missing. `upstreamDefaults` in `models.json` maps each one to a tier, and the build rewrites it to that tier's model in both tools' copies.
- **Effort:** medium for every rohostack subagent on both tools. Effort changes only when Rohosen asks, directly or through his conductor bot, or sets it himself. `models.json` holds it as `effort`, and the build writes this rule into both sheets, where it overrides any skill instruction to raise or lower effort.
- **Same-vendor judges:** no judge or panel seat uses another vendor's model. On Claude, judges and panels use only Claude models, and the arena cross-judge is a different Claude model from the parent when the pool has one. On Cursor, arena, architect and interrogate run every seat on `grok-4.7-medium`, and the judge runs on the same model as the runners. `adapters/common/substitutions.json` rewrites the upstream rules that send judges to another vendor's model. A rule's `replacement` is either one string for both tools or one string per tool, and a tool with no entry keeps the upstream text. `--check` fails if a rule stops matching after a vendor update.
- **Text:** `adapters/claude/substitutions.json` rewrites Cursor tool names and paths in the Claude copy (`Task` → `Agent`, `AskQuestion` → `AskUserQuestion`, `.mdc` sheet → `~/.claude/rules/rohostack-models.md`). It holds no model slugs.
- **Leftovers:** rare Cursor-only features (Automations, Bugbot setup, cloud dashboards, transcripts) are covered by the short `rohostack-runtime.md` rule Claude reads every session.
- **Drift guard:** after `update-vendor.sh`, run `node scripts/build.mjs --check`; it fails if an upstream default slug or a denylisted term survives, or an `adapters/common` rule no longer matches. Add an `upstreamDefaults` entry or fix the substitution, then rerun.
- **Not installed:** the skills in `~/.agents/skills` are the tool-agnostic `skills/rohostack` copies. The per-tool builds in `generated/<tool>/skills` are not installed anywhere, so the live copies keep upstream fallbacks and only the sheets in `~/.cursor/rules` and `~/.claude/rules` set models.

Groups are for humans only. Tools see flat lists, so names must be unique across groups (`~/.agents/skills` is one flat folder). The folder name is the identity: `update-vendor.sh` rewrites upstream frontmatter `name:` to match it.

## Restore on a new machine

```bash
git clone https://github.com/Roho7/skills ~/Documents/MAIN/CODE/skills
git clone https://github.com/Roho7/skills-library ~/Documents/MAIN/CODE/skills/library
mkdir -p ~/.agents/skills && ln -s ~/.agents/skills ~/.cursor/skills
cd ~/Documents/MAIN/CODE/skills/library && node scripts/build.mjs && node scripts/link.mjs
```

Clone both: graduated skills are symlinks here into the public checkout. Sandboxes and remote workers should clone at a pinned commit so a whole run uses one version.

## Workflows

| Task | How |
|---|---|
| Edit a skill | Edit it through any live path or in `skills/<group>/<name>`; both are the same files. Run `node scripts/index.mjs`, commit. A graduated skill commits in the public repo. |
| Add a skill I wrote | Write `skills/personal/<name>/`, run `node scripts/link.mjs` and `node scripts/index.mjs`, commit |
| Add third-party skill | The `install-skill` skill: a `vendor.lock.json` entry, `scripts/update-vendor.sh <name>`, then `node scripts/link.mjs` |
| Change vendored behaviour | Add a rule in `rules/` or a file in `overrides/`, don't edit vendored files (updates overwrite them) |
| Rename / delete | Do it here, then `node scripts/link.mjs --prune` |
| Update vendored skills | `scripts/update-vendor.sh --latest [name ...]` (moves the pins), run `node scripts/build.mjs --check`, review `git diff`, commit |
| Share a skill | `node ../scripts/graduate.mjs <name> <bucket>`, then commit both repos |

## Origins without a lock entry

`third-party/motion` (`npx motion-ai`), `third-party/composio-cli` (`composio login`), `third-party/file-organizer` (ComposioHQ/awesome-claude-skills). Update these with their own installers, then copy them into `skills/third-party/`.

Not tracked: plugin skills that ship MCP tools (`~/.claude/plugins`: composio, figma, taste-skill), claude.ai-synced skills (`~/.claude/skills/synced`), and machine-specific config such as `~/.cursor/rules/rohostack-models.mdc`.
