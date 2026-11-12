#!/usr/bin/env bash
# Usage:
#   install.sh vendor <name> <owner/repo | git url> <path/to/SKILL.md> <group> [commit]
#   install.sh link <name>
# Run from a checkout of the skills repo; falls back to $SKILLS_REPO or ~/Documents/MAIN/CODE/skills.
set -euo pipefail

top="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$top" ] && [ -f "$top/vendor.lock.json" ]; then REPO="$top"; else REPO="${SKILLS_REPO:-$HOME/Documents/MAIN/CODE/skills}"; fi
LOCK="$REPO/vendor.lock.json"
LIVE="$HOME/.agents/skills"
CLAUDE="$HOME/.claude/skills"

die() { echo "error: $*" >&2; exit 1; }
repo_dirs() { find "$REPO/skills" -mindepth 2 -maxdepth 2 -type d -name "$1"; }

cmd="${1:-}"; [ $# -gt 0 ] && shift
case "$cmd" in
vendor)
  [ $# -ge 4 ] || die "usage: install.sh vendor <name> <owner/repo | git url> <path/to/SKILL.md> <group> [commit]"
  name="$1" src="$2" path="$3" group="$4" commit="${5:-}"
  if [[ "$src" == *://* ]]; then url="$src"; else url="https://github.com/$src.git"; fi
  source="$(sed -E 's#^https://github.com/##; s#\.git$##' <<<"$url")"

  jq -e --arg n "$name" '.skills[$n]' "$LOCK" >/dev/null && die "$name already in vendor.lock.json"
  [ -z "$(repo_dirs "$name")" ] || die "$name already in repo: $(repo_dirs "$name")"

  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq --indent 2 --arg n "$name" --arg s "$source" --arg u "$url" --arg p "$path" --arg g "$group" --arg t "$now" --arg c "$commit" \
    '.skills[$n] = {source: $s, sourceType: "github", sourceUrl: $u, skillPath: $p, installedAt: $t, updatedAt: $t, group: $g}
       + (if $c == "" then {} else {commit: $c} end)' "$LOCK" > "$LOCK.tmp" && mv "$LOCK.tmp" "$LOCK"

  "$REPO/scripts/update-vendor.sh" "$name"
  [ -f "$REPO/skills/$group/$name/SKILL.md" ] || die "vendor produced no skills/$group/$name/SKILL.md"
  node "$REPO/scripts/build.mjs" --check
  node "$REPO/scripts/index.mjs"
  echo "pinned $name @ $(jq -r --arg n "$name" '.skills[$n].commit' "$LOCK")"
  ;;
link)
  [ $# -eq 1 ] || die "usage: install.sh link <name>"
  name="$1"
  dirs="$(repo_dirs "$name")"
  [ -n "$dirs" ] || die "$name not in $REPO/skills/<group>/"
  [ "$(wc -l <<<"$dirs")" -eq 1 ] || die "$name in several groups: $dirs"
  for t in "$LIVE/$name" "$CLAUDE/$name"; do
    if [ -e "$t" ] || [ -L "$t" ]; then die "$t already exists; not overwriting"; fi
  done

  cp -R "$dirs" "$LIVE/$name"
  ln -s "$LIVE/$name" "$CLAUDE/$name"

  diff -r "$dirs" "$LIVE/$name" && echo "diff -r: identical"
  cmp "$dirs/SKILL.md" "$LIVE/$name/SKILL.md" && echo "cmp: identical"
  ls -l "$CLAUDE/$name"
  awk 'NR==1 && /^---$/ {fm=1; print; next} fm {print} fm && /^---$/ {exit}' "$LIVE/$name/SKILL.md"
  ;;
*)
  die "usage: install.sh vendor|link ..."
  ;;
esac
