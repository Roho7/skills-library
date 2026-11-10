#!/usr/bin/env bash
# Re-pull third-party skills and agents listed in vendor.lock.json from their upstream repos.
# Each entry: sourceUrl, skillPath (SKILL.md, or agent .md when kind=agent), group, optional kind.
# Folder name is the identity: if upstream's frontmatter name differs, it is rewritten to the folder name.
# Review the result with `git diff` and commit what you want to keep.
# Usage: scripts/update-vendor.sh [name ...]   (default: all)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="$REPO/vendor.lock.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ $# -gt 0 ]; then names="$*"; else names="$(jq -r '.skills | keys[]' "$LOCK")"; fi

set_name() {
  local file="$1" name="$2"
  awk -v n="$name" 'NR==1 && /^---$/ {fm=1; print; next}
       fm && /^---$/ {fm=0}
       fm && /^name:/ {print "name: " n; next}
       {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

for name in $names; do
  entry="$(jq -c --arg n "$name" '.skills[$n] // empty' "$LOCK")"
  if [ -z "$entry" ]; then echo "skip $name: not in vendor.lock.json"; continue; fi
  url="$(jq -r '.sourceUrl' <<<"$entry")"
  path="$(jq -r '.skillPath' <<<"$entry")"
  group="$(jq -r '.group' <<<"$entry")"
  kind="$(jq -r '.kind // "skill"' <<<"$entry")"

  clone="$TMP/$(echo "$url" | tr '/:.' '___')"
  [ -d "$clone" ] || git clone -q --depth 1 "$url" "$clone"
  if [ ! -f "$clone/$path" ]; then echo "WARN $name: $path missing upstream"; continue; fi

  if [ "$kind" = agent ]; then
    mkdir -p "$REPO/agents/$group"
    dest="$REPO/agents/$group/$name.md"
    cp "$clone/$path" "$dest"
  else
    dest="$REPO/skills/$group/$name"
    mkdir -p "$dest"
    rsync -a --delete --exclude-from="$REPO/.gitignore" "$clone/$(dirname "$path")/" "$dest/"
    dest="$dest/SKILL.md"
  fi
  set_name "$dest" "$name"

  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq --arg n "$name" --arg t "$now" '.skills[$n].updatedAt = $t' "$LOCK" > "$LOCK.tmp" && mv "$LOCK.tmp" "$LOCK"
  echo "updated $group/$name"
done

git -C "$REPO" status --short skills agents
