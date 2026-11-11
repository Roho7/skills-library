#!/usr/bin/env bash
# Re-pull third-party skills and agents listed in vendor.lock.json from their upstream repos.
# Each entry: sourceUrl, commit (pinned upstream commit), skillPath (SKILL.md, or agent .md when kind=agent), group, optional kind.
# Folder name is the identity: if upstream's frontmatter name differs, it is rewritten to the folder name.
# After each pull, patches/<group>/<name>.patch (if present) is applied; a patch that no longer applies fails the run.
# Review the result with `git diff` and commit what you want to keep.
# Usage: scripts/update-vendor.sh [--latest] [--no-patch] [name ...]   (default: all)
#   --latest    pull upstream HEAD instead of the pinned commit and record the new pin
#   --no-patch  skip patches/ (to regenerate a patch against pristine upstream)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="$REPO/vendor.lock.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

latest=0; patch=1; failed=0
while [ $# -gt 0 ]; do
  case "$1" in
    --latest) latest=1; shift ;;
    --no-patch) patch=0; shift ;;
    *) break ;;
  esac
done
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

  pin="$(jq -r '.commit // empty' <<<"$entry")"
  ref="HEAD"; [ "$latest" = 0 ] && [ -n "$pin" ] && ref="$pin"

  clone="$TMP/$(echo "$url@$ref" | tr '/:.@' '____')"
  if [ ! -d "$clone" ]; then
    git init -q "$clone"
    git -C "$clone" fetch -q --depth 1 "$url" "$ref"
    git -C "$clone" checkout -q FETCH_HEAD
  fi
  commit="$(git -C "$clone" rev-parse HEAD)"
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

  patchfile="$REPO/patches/$group/$name.patch"
  if [ "$patch" = 1 ] && [ -f "$patchfile" ]; then
    if git -C "$REPO" apply "$patchfile"; then echo "patched $group/$name"
    else echo "FAIL $name: $patchfile no longer applies; update it"; failed=1; fi
  fi

  if [ "$commit" != "$pin" ]; then
    now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    jq --indent 2 --arg n "$name" --arg c "$commit" --arg t "$now" '.skills[$n].commit = $c | .skills[$n].updatedAt = $t' "$LOCK" > "$LOCK.tmp" && mv "$LOCK.tmp" "$LOCK"
  fi
  echo "updated $group/$name @ ${commit:0:12}"
done

git -C "$REPO" status --short skills agents
exit "$failed"
