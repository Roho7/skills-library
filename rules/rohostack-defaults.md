---
description: rohostack defaults (no-comments on every diff, pr skill for every PR body, model choices live in models.json)
alwaysApply: true
---

# rohostack defaults

Whenever a rohostack workflow produces a code diff (roho-mode and its playbooks, roho-agent delegates, swarm, tdd, arena, autopilot), run the **no-comments** skill on that diff before committing, opening a PR, or handing the result back. This applies to every diff, not just before review.

Skip it only when the diff adds or changes no comments, or when the user says to skip it for this task.

Whenever a rohostack workflow opens or edits a PR (roho-mode's Opening a PR playbook and every playbook that ends in it, roho-agent delegates, swarm, arena, autopilot), write the PR body with the **pr** skill. Its template replaces the section list under **Descriptions** in `playbooks/opening-a-pr.md`, including the `## Why` opener; state the user's goal in the first line of `## Summary` instead. The rest of that playbook (titles, forge, readiness, stacks, babysit) still applies.

rohostack model choices for every tool come from `~/Documents/MAIN/CODE/skills/models.json` (roles → tiers → each tool's model). For `/setup-rohostack` or any model change, edit that file, run `node scripts/build.mjs`, and copy the generated sheets into `~/.cursor/rules` and `~/.claude/rules`; never write the `rohostack-models` sheets directly, because they are generated.
