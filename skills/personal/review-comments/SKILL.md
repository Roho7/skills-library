---
name: review-comments
description: Walk through a PR's unresolved review comments one at a time — brief, score, and fix each with the user's sign-off before moving on. Usage — /review-comments <PR number> [reviewer] [window, e.g. "last 5 days"]
disable-model-invocation: true
---

Work through a reviewer's comments on a PR as a **docket**: an ordered queue processed strictly one item at a time. A docket item is cleared only when the user says so — never advance on your own.

## 1. Build the docket

Fetch review threads with `gh api graphql` (`reviewThreads` on the pull request). Threads paginate — follow `hasNextPage`/`endCursor` until exhausted; recent comments are often on later pages. Also check PR-level `comments` and `reviews` for the same author.

Filter to:
- threads that are **unresolved**
- comments by the named reviewer (ask if not given)
- posted within the recency window (default: ask; the user usually wants only the latest review round, not the whole history)

Skip threads marked `isOutdated` that already carry an "Applied/Done" reply unless the user asks for them — those are just waiting to be resolved on GitHub.

Completion: every page fetched, and you've told the user the total count before starting item 1.

## 2. Brief the current item

Before writing a word, **read the code the comment points at** and verify the claim. Comments can be wrong, stale, or already fixed. Report what the code does. If the thread has back-and-forth, the last message is the ask.

If the user asks what is still open, or to rank comments, start with a short table and then brief only the top item. Columns: score, link, one line of what happens. Do not brief the rest.

One brief, this shape, nothing else. No section headings. No restating the comment. Under 120 words.

```
**`path:line`** — x/10

One or two sentences: what it asks, then what the code actually does. One sentence on why that matters, or why it does not.

1. Change, and its tradeoff, in one sentence.
2. Change, and its tradeoff, in one sentence.
3. Push back, and what stays broken, in one sentence.

I recommend option N. Which option?
```

Score: user-visible fix > correctness > consistency > tidiness. Two or three options. The commented line may have moved; use the current line. If the file is gone, say so in the first sentence and offer resolve as an option.

## 3. Clear the item

Wait for the user. They may:
- **Pick an option** — implement it exactly; no adjacent refactors.
- **Ask "what if…"** — assess their variant honestly against the code (check for circular imports, JS/TS boundary issues, existing repo patterns) before agreeing.
- **Make the edit themselves** — verify their change against the file and answer as tersely as they ask ("correct" / "incorrect" plus at most one caveat).

After any applied fix: run eslint on the touched files and any related unit tests. Surface type errors the linter can't see (untyped JS boundaries, generated types) rather than assuming green.

Never stage, commit, or push — the repo's own commit rules apply and run separately.

Completion: the user says move on. Then return to step 2 for the next item; after the last, recap every item and what changed, plus any push-blocking caveats (regenerated files, unverified typechecks).
