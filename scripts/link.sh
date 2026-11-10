#!/usr/bin/env bash
# Point every agent's global skill dir at this repo.
# Idempotent. Real dirs that would be replaced get moved to ~/.skills-backup/<timestamp>/.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TARGETS=("$HOME/.claude/skills" "$HOME/.agents/skills" "$HOME/.cursor/skills")
BACKUP="$HOME/.skills-backup/$(date +%Y%m%d-%H%M%S)"

link_global() {
  local target="$1"
  mkdir -p "$target"
  for src in "$REPO"/skills/*/; do
    local name dest
    name="$(basename "$src")"
    dest="$target/$name"
    if [ -L "$dest" ] && [ "$(readlink "$dest")" = "${src%/}" ]; then
      continue
    fi
    if [ -e "$dest" ] || [ -L "$dest" ]; then
      mkdir -p "$BACKUP/$(basename "$(dirname "$target")")"
      mv "$dest" "$BACKUP/$(basename "$(dirname "$target")")/$name"
    fi
    ln -s "${src%/}" "$dest"
  done
}

for t in "${TARGETS[@]}"; do link_global "$t"; done

[ -d "$BACKUP" ] && echo "replaced entries backed up to $BACKUP"
echo "linked $(ls -d "$REPO"/skills/*/ | wc -l | tr -d ' ') global skills into: ${TARGETS[*]}"
