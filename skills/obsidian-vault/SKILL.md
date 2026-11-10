---
name: obsidian-vault
description: Search, create, and manage notes in the Obsidian vault with wikilinks and index notes. Use when user wants to find, create, or organize notes in Obsidian.
---

# Obsidian Vault

## Vault location

`/Users/roho7/Documents/MAIN/OBSIDIAN/OB_BRAIN/`

(Registered in `~/Library/Application Support/obsidian/obsidian.json` — check there if the vault has moved.)

## Vault structure

Top-level folders (do not add new root folders):

- `Atlas/` — maps of content (MOC notes like `Fireflies MOC.md`, `Programming MOC.md`, `Obsidian MOC.md`)
- `Cards/` — the main flat notes folder; most topical notes live here
- `Cards/Fireflies/Claude Sessions/` — Claude Code session handoffs and work-session notes for Fireflies repos
- `Cards/Fireflies/Guides/` — Fireflies how-tos and testing guides
- `Extras/`, `Notes/`, `Sources/`, `Spaces/` — other content; rarely written to by Claude

`Cards/Fireflies MOC.md` uses **Dataview tables** that auto-list notes from the two Fireflies folders sorted by `date` — notes placed there with correct frontmatter appear automatically; do NOT manually add session/guide wikilinks to that MOC. Only notes outside those folders need a manual backlink (they show up via the `#fireflies` tag query).

Note: some MOC files also live directly in `Cards/` (e.g. `Cards/Fireflies MOC.md`).

## Note header (ALWAYS use this)

Every note created by Claude MUST start with YAML frontmatter in this format:

```markdown
---
date: YYYY-MM-DD
up: "[[Parent MOC or Note]]"
tags:
  - tag-one
  - tag-two
---
```

- `date`: today's date
- `up`: the closest parent MOC (e.g. `"[[Fireflies MOC]]"` for Fireflies work)
- `tags`: kebab-case topical tags (e.g. `fireflies`, `claude-session`, `payments-ff`, `handoff`)

## Naming conventions

- **Title Case** for all note names
- **Index/MOC notes** aggregate related topics and are just lists of `[[wikilinks]]`

## Linking

- Use Obsidian `[[wikilinks]]` syntax: `[[Note Title]]`
- Notes link to dependencies/related notes at the bottom (e.g. `[[Fireflies MOC]] · [[Programming MOC]]`)
- After creating a note, append a `[[wikilink]]` to it in the relevant MOC so it is discoverable

## Workflows

### Search for notes

```bash
# Search by filename
find "/Users/roho7/Documents/MAIN/OBSIDIAN/OB_BRAIN/" -name "*.md" | grep -i "keyword"

# Search by content
grep -rl "keyword" "/Users/roho7/Documents/MAIN/OBSIDIAN/OB_BRAIN/" --include="*.md"
```

Or use Grep/Glob tools directly on the vault path.

### Create a new note

1. Use **Title Case** for filename, in the right folder (`Cards/` by default; `Cards/Fireflies/Claude Sessions/` for Fireflies session handoffs)
2. Start with the YAML frontmatter header described above
3. Write content as a unit of learning (per vault rules)
4. Add `[[wikilinks]]` to related notes at the bottom
5. Add a backlink to the note from the relevant MOC

### Find related notes

Search for `[[Note Title]]` across the vault to find backlinks:

```bash
grep -rl "\\[\\[Note Title\\]\\]" "/Users/roho7/Documents/MAIN/OBSIDIAN/OB_BRAIN/"
```

### Find MOC / index notes

```bash
find "/Users/roho7/Documents/MAIN/OBSIDIAN/OB_BRAIN/" -name "*MOC*" -o -name "*Index*"
```
