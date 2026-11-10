---
description: pstack defaults (no-comments on every diff, model choices live in models.json)
alwaysApply: true
---

# pstack defaults

Whenever a pstack workflow produces a code diff (poteto-mode and its playbooks, poteto-agent delegates, swarm, tdd, arena, autopilot), run the **no-comments** skill on that diff before committing, opening a PR, or handing the result back. This applies to every diff, not just before review.

Skip it only when the diff adds or changes no comments, or when the user says to skip it for this task.

pstack model choices for every tool come from `~/Documents/MAIN/CODE/skills/models.json` (roles → tiers → each tool's model). For `/setup-pstack` or any model change, edit that file and run `scripts/link.sh`; never write the `pstack-models` sheets directly, because they are generated.
