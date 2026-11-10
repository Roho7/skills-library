#!/usr/bin/env bash
# Re-pull third-party skills listed in vendor.lock.json from their upstream repos.
# Review the result with `git diff` and commit what you want to keep.
# Usage: scripts/update-vendor.sh [skill-name ...]   (default: all)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="$REPO/vendor.lock.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ $# -gt 0 ]; then names="$*"; else names="$(jq -r '.skills | keys[]' "$LOCK")"; fi

for name in $names; do
  url="$(jq -r --arg n "$name" '.skills[$n].sourceUrl // empty' "$LOCK")"
  path="$(jq -r --arg n "$name" '.skills[$n].skillPath // empty' "$LOCK")"
  if [ -z "$url" ]; then echo "skip $name: not in vendor.lock.json"; continue; fi

  clone="$TMP/$(echo "$url" | tr '/:.' '___')"
  [ -d "$clone" ] || git clone -q --depth 1 "$url" "$clone"

  src="$clone/$(dirname "$path")"
  if [ ! -f "$src/SKILL.md" ]; then echo "WARN $name: $path missing upstream"; continue; fi

  rsync -a --delete --exclude-from="$REPO/.gitignore" "$src/" "$REPO/skills/$name/"
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq --arg n "$name" --arg t "$now" '.skills[$n].updatedAt = $t' "$LOCK" > "$LOCK.tmp" && mv "$LOCK.tmp" "$LOCK"
  echo "updated $name"
done

git -C "$REPO" status --short skills
