#!/usr/bin/env bash
# Point every agent tool at this repo (skills, agents, always-on rules).
#   skills/<group>/<name>/   -> <tool>/skills/<name>
#   agents/<group>/<name>.md -> <tool>/agents/<name>.md
# Groups are for humans; tools need flat dirs, so every entry gets a flat symlink.
# Idempotent. Real files that would be replaced get moved to ~/.skills-backup/<timestamp>/.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_TARGETS=("$HOME/.claude/skills" "$HOME/.agents/skills" "$HOME/.cursor/skills")
AGENT_TARGETS=("$HOME/.claude/agents" "$HOME/.cursor/agents")
BACKUP="$HOME/.skills-backup/$(date +%Y%m%d-%H%M%S)"

prune_stale() {
  local target="$1"
  for dest in "$target"/*; do
    [ -L "$dest" ] || continue
    case "$(readlink "$dest")" in
      "$REPO"/*) [ -e "$dest" ] || rm "$dest" ;;
    esac
  done
}

link_one() {
  local src="$1" dest="$2"
  if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
    return
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    local bdir="$BACKUP/$(basename "$(dirname "$(dirname "$dest")")")/$(basename "$(dirname "$dest")")"
    mkdir -p "$bdir"
    mv "$dest" "$bdir/"
  fi
  ln -s "$src" "$dest"
}

check_unique() {
  local dupes
  dupes="$(printf '%s\n' "$@" | xargs -n1 basename | sort | uniq -d)"
  if [ -n "$dupes" ]; then
    echo "duplicate names across groups, fix first: $dupes" >&2
    exit 1
  fi
}

skills=("$REPO"/skills/*/*/)
skills=("${skills[@]%/}")
agents=("$REPO"/agents/*/*.md)
check_unique "${skills[@]}"
check_unique "${agents[@]}"

for t in "${SKILL_TARGETS[@]}"; do
  mkdir -p "$t"; prune_stale "$t"
  for s in "${skills[@]}"; do link_one "$s" "$t/$(basename "$s")"; done
done
for t in "${AGENT_TARGETS[@]}"; do
  mkdir -p "$t"; prune_stale "$t"
  for a in "${agents[@]}"; do link_one "$a" "$t/$(basename "$a")"; done
done

rules=("$REPO"/rules/*.md)
mkdir -p "$HOME/.claude/rules" "$HOME/.cursor/rules"
prune_stale "$HOME/.claude/rules"; prune_stale "$HOME/.cursor/rules"
for r in "${rules[@]}"; do
  base="$(basename "$r" .md)"
  link_one "$r" "$HOME/.claude/rules/$base.md"
  link_one "$r" "$HOME/.cursor/rules/$base.mdc"
done
echo "linked ${#rules[@]} rules into: ~/.claude/rules (.md) ~/.cursor/rules (.mdc)"

if [ -d "$BACKUP" ]; then echo "replaced entries backed up to $BACKUP"; fi
echo "linked ${#skills[@]} skills into: ${SKILL_TARGETS[*]}"
echo "linked ${#agents[@]} agents into: ${AGENT_TARGETS[*]}"
node "$REPO/scripts/index.mjs"
