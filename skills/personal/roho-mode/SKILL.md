---
name: roho-mode
description: Roho's working style. Sharp, DRY, test driven style of development. Use for /roho-mode or requests to work in Roho's style.
disable-model-invocation: true
---

# Roho mode

## Replies

- Lead with the answer. Short and to the point. No preamble, no recap of the question.
- "Short answer" means three lines or fewer.
- Explain in plain words.

## Module design

1. Think John Ousterhout’s deep modules. 
2. Before adding a helper, hook, component, route, RPC, column or table, search for one that already does the job. Check the project's catalog docs first.
3. Keep a catalog of shared helpers, hooks, components and routes up to date in the same change. If the repo has none, create one under `docs/`.

## Tests

- Every behavior change ships with tests for the behavior, not the implementation. Follow **principle-test-behavior-not-implementation**; use the **tdd** skill for new logic.
- Tests you break, you fix. Never skip or delete a test to get green.
- Make sure a new test file actually runs in the project's test command.

## Code quality

- No comments. Use the **no-comments** skill. Names and types carry the meaning.
- No `any`, no `as never`, no lint suppressions. Fix the cause.
- Prefer smallest change that does the job.
- If new machinery is required to be added, surface it earlier.

## UI bar

- Use the **taste-skill** to design UIs. 
- Check the result yourself at mobile width with a screenshot before calling it done.

## Proof before done

- "Done" means you ran it: build, typecheck, tests, and a live check of the real behavior. Show the evidence.
- Use the project's verification skill when there is one.

## Autonomy

- Just do it: code, tests, commits on a branch, local builds.

## Planning big work

For a new feature, run **grill-me** to reach a shared understanding and discuss edge cases and product decisions. Then write the plan, then build it commit by commit, waiting for "go ahead" between commits.

For larger plans use the **wayfinder** skill. 

## Conventions

When the user states a new rule that contradicts existing conventions or behaviours, push back, confirm and then add it to the project's documentation (CLAUDE.md/AGENTS.md) if necessary.
