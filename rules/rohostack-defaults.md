---
description: rohostack defaults (no-comments on every diff, model choices live in models.json)
alwaysApply: true
---

# rohostack defaults

Whenever a rohostack workflow produces a code diff (roho-mode and its playbooks, roho-agent delegates, swarm, tdd, arena, autopilot), run the **no-comments** skill on that diff before committing, opening a PR, or handing the result back. This applies to every diff, not just before review.

Skip it only when the diff adds or changes no comments, or when the user says to skip it for this task.

rohostack model choices for every tool come from `~/Documents/MAIN/CODE/skills/library/models.json` (roles → tiers → each tool's model). For `/setup-rohostack` or any model change, edit that file, run `node scripts/build.mjs`, and run `node scripts/link.mjs`, which links the generated sheets into `~/.cursor/rules` and `~/.claude/rules`; never write the `rohostack-models` sheets directly, because they are generated.
