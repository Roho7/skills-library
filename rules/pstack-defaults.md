---
description: pstack defaults (no-comments on every diff)
alwaysApply: true
---

# pstack defaults

Whenever a pstack workflow produces a code diff (poteto-mode and its playbooks, poteto-agent delegates, swarm, tdd, arena, autopilot), run the **no-comments** skill on that diff before committing, opening a PR, or handing the result back. This applies to every diff, not just before review.

Skip it only when the diff adds or changes no comments, or when the user says to skip it for this task.
