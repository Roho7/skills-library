#!/usr/bin/env bash
# Point every agent's global skill dir at this repo.
# Repo is grouped as skills/<group>/<skill>; agents need a flat dir, so each skill gets a flat symlink.
# Idempotent. Real dirs that would be replaced get moved to ~/.skills-backup/<timestamp>/.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TARGETS=("$HOME/.claude/skills" "$HOME/.agents/skills" "$HOME/.cursor/skills")
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

link_global() {
  local target="$1"
  mkdir -p "$target"
  prune_stale "$target"
  for src in "$REPO"/skills/*/*/; do
    local name dest
    src="${src%/}"
    name="$(basename "$src")"
    dest="$target/$name"
    if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
      continue
    fi
    if [ -e "$dest" ] || [ -L "$dest" ]; then
      mkdir -p "$BACKUP/$(basename "$(dirname "$target")")"
      mv "$dest" "$BACKUP/$(basename "$(dirname "$target")")/$name"
    fi
    ln -s "$src" "$dest"
  done
}

dupes="$(ls -d "$REPO"/skills/*/*/ | xargs -n1 basename | sort | uniq -d)"
if [ -n "$dupes" ]; then
  echo "duplicate skill names across groups, fix first: $dupes" >&2
  exit 1
fi

for t in "${TARGETS[@]}"; do link_global "$t"; done

if [ -d "$BACKUP" ]; then echo "replaced entries backed up to $BACKUP"; fi
echo "linked $(ls -d "$REPO"/skills/*/*/ | wc -l | tr -d ' ') skills into: ${TARGETS[*]}"
