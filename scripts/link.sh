#!/usr/bin/env bash
# Point every agent's global skill dir at this repo, and copy project skills into their repos.
# Idempotent. Real dirs that would be replaced get moved to ~/.skills-backup/<timestamp>/.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
CODE_DIR="${CODE_DIR:-$HOME/Documents/MAIN/CODE}"
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

sync_projects() {
  for proj in "$REPO"/projects/*/; do
    local name dest
    name="$(basename "$proj")"
    dest="$CODE_DIR/$name/.claude/skills"
    if [ ! -d "$CODE_DIR/$name" ]; then
      echo "skip project $name: $CODE_DIR/$name not found"
      continue
    fi
    mkdir -p "$dest"
    rsync -a --exclude-from="$REPO/.gitignore" "$proj" "$dest/"
  done
}

for t in "${TARGETS[@]}"; do link_global "$t"; done
sync_projects

[ -d "$BACKUP" ] && echo "replaced entries backed up to $BACKUP"
echo "linked $(ls -d "$REPO"/skills/*/ | wc -l | tr -d ' ') global skills into: ${TARGETS[*]}"
