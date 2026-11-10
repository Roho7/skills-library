---
name: ask-my-opinion
description: After agent work or a PR, interview you on every non-obvious autonomous decision until you agree on each one.
disable-model-invocation: true
---

Use when you are reviewing agent output — a PR, a branch diff, uncommitted changes, or a long session's work — and need visibility into **decisions** the agent made without asking, without reading every line.

**Completion criterion:** Every **decision** in the interview queue has an explicit outcome (`keep`, `change` applied, or `defer` with your stated reason), and you confirm nothing material was missed.

## 1. Pin the body of work

Take the scope from what you said or from the thread (PR URL, branch name, commit range, "everything since X", uncommitted only).

Resolve it to a concrete diff:

- Branch / range: `git diff <fixed-point>...HEAD` (three-dot) plus `git log <fixed-point>..HEAD --oneline`
- Uncommitted: `git diff` and `git diff --cached`
- PR: `gh pr diff <number>` (or the URL) plus the PR description and linked issue/spec

Before step 2: confirm refs resolve and the diff is non-empty. If empty, stop and say so.

Also pull conversation context: explicit instructions you gave, specs/issues linked in commits or the PR, and any repo standards files the agent should have followed.

## 2. Inventory decisions

**Legwork:** Read the entire body of work — every changed file, commit message, and test — not a sample.

A **decision** is anywhere the agent chose among alternatives, invented structure, inferred your intent, or traded off concerns without you in the loop.

Do **not** queue:

- Work you explicitly requested in the thread, spec, or issue
- Mechanical execution of a plan you already approved
- Obvious repo-default patterns with no fork considered

## 3. Build the interview queue

Keep a **decision** only if it matches at least one filter:

| Filter | Signal |
|--------|--------|
| **Low confidence** | Guess, weak rationale, or "probably fine" energy in commits/comments |
| **Convention break** | Deviates from repo patterns, documented standards, or skills the repo uses |
| **One-off** | Unique pattern that sets precedent and won't match neighbours |
| **Fork** | Substantial design choice with plausible alternatives |

Drop the rest. Sort the queue: **fork** and **convention break** first, then **one-off**, then **low confidence**.

Publish a numbered list — each line: short title + one sentence on what's at stake + pointer (file/lines or PR hunk). Ask you to strike numbers that aren't worth discussing. Remove struck items before step 4.

## 4. Relentless interview

One **decision** per message unless you ask to batch.

Each turn, in order:

1. **Where** — file/lines or PR link
2. **Chosen** — what the agent did
3. **Why** — honest rationale and confidence (including what it didn't verify)
4. **Alternatives** — 2–3 concrete other ways (not strawmen)
5. **Ask** — keep, pick an alternative (which), or something else?

Do not advance until this **decision** has an outcome. If you disagree, apply the **change** (or record **`defer`** with your reason) before the next question.

Stay **relentless**: no skipping because the diff is long, no collapsing the queue into a summary and calling it done.

## 5. Reconcile

If any outcome was **`change`**, re-read the updated diff for new **decisions** introduced by fixes; append them to the queue and return to step 4.

Ask once: "Any **decision** I missed?" If you name one, inventory it, filter it, interview it.

Close with a compact table: decision title → outcome (`keep` / `change` / `defer`).
