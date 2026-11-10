---
name: create-pr
description: Create a GitHub pull request for the current branch using the gh CLI, following the mandatory Fireflies PR template (What does this PR do? / Type of change / How should this be manually tested? / etc.) and title guidelines. Use whenever the user wants to open, raise, create, or submit a PR or pull request, or asks to "PR this branch", and when writing or rewriting a PR title or description.
---


Your goal is to create a PR of the current branch based on the changes in the branch using the github cli. Give me the link to the PR after it is created as a clickable message.

## Before creating the PR

Run these in parallel to understand the branch:
- `git status`
- `git diff` (staged + unstaged)
- `git log --oneline -10`
- `git diff main...HEAD` (or the repo's default base branch)

## Commits (required before PR)

Do **not** open a PR with uncommitted work on the branch.

After reviewing `git status` and `git diff`:

- **Working tree clean** — all intended changes are committed. Continue to push/PR.
- **Uncommitted changes present** — commit them first using the `/create-commits` standard:
  - Small, focused commits — one logical change per commit
  - Single-line messages only — no body or extra description
  - Conventional commits format (`feat:`, `fix:`, `chore:`, `refactor:`, etc.)
  - Human-readable and self-explanatory
  - Do not commit secrets (`.env`, credentials, etc.)
  - Follow the repo's recent commit message style from `git log`
- **Changes should not be committed yet** (WIP, unrelated files, secrets, or unclear scope) — **stop**. Tell the user to clean up the working tree or run `/create-commits` manually, then rerun `/create-pr`.

When creating commits as part of this command, use the same git safety rules as `/create-commits`: never skip hooks, never amend unless allowed, and verify with `git status` after each commit.

Then, if the branch is not pushed yet:
- `git push -u origin HEAD`

## ❌ COMMON MISTAKES TO AVOID

**NEVER do these:**
- NEVER open a PR while there are uncommitted changes — commit first with `/create-commits` or ask the user to run it
- NEVER use "## Summary" - always use "## What does this PR do?"
- NEVER skip the "## Type of change" section with checkboxes - it is MANDATORY
- NEVER use "### Notes" - always use "## Any background context you want to provide beyond Shortcut?"
- NEVER use "## Review & Testing Checklist" - always use "## How should this be manually tested?"
- NEVER rename ANY section headers - use the EXACT names from the template below
- NEVER rely on auto-generated PR descriptions - they will NOT follow this template
- NEVER leave placeholder text like `xxx` or `TODO` in the final PR body
- NEVER include Shortcut story IDs (e.g. `sc-116230`) in the PR title
- NEVER use commit-style titles (e.g. `feat:`, `fix:`, `chore:`)
- NEVER add "## Technical Details" by default — omit it in most PRs (you use it in ~5% of yours)

## ✅ MANDATORY PR TEMPLATE

Start from this template. **Remove any section that ends up empty** — do not leave empty headers or placeholders.

**Do not include Technical Details in the template below.** Add it only when the change meets the complexity bar described later.

```
## What does this PR do?

- <bullet 1>
- <bullet 2>

## Type of change

This pull request is a
- [ ] Feature
- [ ] Bugfix
- [ ] Enhancement

Which introduces
- [ ] Breaking changes
- [ ] Non-breaking changes

## How should this be manually tested?

1. <step 1>
2. <step 2>

## What are the requirements to deploy to production?

- [ ] <requirement, if any>

## Any background context you want to provide beyond Shortcut?

<Slack thread, related PRs, Figma, etc.>

## Screenshots (if appropriate)

<before/after images or performance notes>
```

### Section rules (based on your PR history)

| Section                                                | When to include                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What does this PR do?**                              | Always. 1–3 bullets. Required.                                                                                                                              |
| **Technical Details**                                  | **Default: omit.** Only add for genuinely complex changes (see below). You use this in ~5% of PRs.                                                          |
| **Type of change**                                     | Always. Check exactly one type and one breaking/non-breaking option with lowercase `[x]`.                                                                   |
| **How should this be manually tested?**                | Only for API endpoints, race conditions, multi-step flows, or front-end features. Include curl/JSON when helpful. Omit for infra, config, or obvious fixes. |
| **What are the requirements to deploy to production?** | Only when deploy order matters (env vars, k8s PR, GrowthBook flag, dependent PR). You almost never use this — delete the section if empty.                  |
| **Any background context...**                          | When there is a Slack thread, related PR, Figma link, or prior attempt. ~50% of your PRs include a Slack link here.                                         |
| **Screenshots**                                        | For UI changes or before/after comparisons. Include performance numbers when relevant (e.g. "183ms locally vs 280ms deployed").                             |

**Never include** `## Any Security implications` unless the change has real security impact. You have never used this section — omit it by default.

### Technical Details — only when actually complex

**Default behavior: do not add this section.** If the PR is a straightforward fix, config change, or small feature, the diff speaks for itself.

Add `## Technical Details` only when **all** of these are true:
1. The change touches multiple systems or has non-obvious trade-offs
2. A reviewer would likely ask "why did you do it this way?" without reading every file
3. The bullets in "What does this PR do?" cannot capture the important implementation decisions

✅ Worth including (e.g. your #2255):
- Multi-step flow across repos/services with locking, migration, or rollback logic
- Performance refactor where the *approach* matters (batching, deduping N+1 calls)
- Subtle bug root cause that isn't obvious from the diff

❌ Do not include:
- Single-file fixes, typo fixes, dependency bumps
- Renames, type improvements, or config tweaks
- Anything where listing changed files would suffice

When included, keep it to 2–4 short bullets — not a walkthrough of the diff.

### "What does this PR do?" — bullet quality

Bullets are used for #feature-rollout. Write for non-technical stakeholders: **what changes for the user or the system behavior**, not how you coded it.

❌ Bad (implementation-focused):
- Fix trying to update pubsub subscription every time
- Fix add retry to fetch notification
- Use node 24.12 to fix mongodb connection issue

✅ Good (impact-focused):
- Fix users remaining in multiple teams after being added to a new team
- Prevent race conditions when two teams try to add the same user at the same time
- Fix team settings popup not being marked as seen

Keep bullets to **1–3 items**. Start with Fix / Add / Update / Support / Prevent / Ensure — but describe the **outcome**, not the file or function name.

### Background context — your common patterns

When available, include in **Any background context you want to provide beyond Shortcut?**:
- `[Slack thread](https://firefliesapp.slack.com/...)`
- Related PRs: `It was originally being implemented in: #1710` or `Depends on #4517`
- `[Figma link](https://www.figma.com/design/...)` for UI work
- `[Github comment](https://github.com/...)` when continuing discussion from another PR

If the user provided a Slack thread in the conversation, always add it here.

## PR TITLE GUIDELINES

Follow these STRICTLY:
- Start with a capital letter
- Max **70 characters** (3 of your recent titles exceeded this — trim them)
- Focus on **product impact**, not implementation detail
- No Shortcut story IDs (`sc-XXXXX`)
- No commit prefixes (`feat:`, `fix:`)

### Title patterns from your best PRs

✅ Good:
- Ensure users are removed from existing teams when joining
- Show customizable plan badges in pricing comparison table
- Fix team settings popup not being marked as seen
- Block /graphql routes from public ingress

❌ Avoid (too technical or vague):
- Fix dev hot reload
- Improve get multiple upload signed url
- Support pro lite plan *(too vague — prefer "Support Pro Lite plan in storage limits")*
- Fix add retry to fetch notification *(prefer "Improve notification delivery reliability with automatic retries")*

### Monorepo / package-scoped PRs

For shared-libs or multi-package repos, prefix with the package name in brackets when it helps reviewers:
- `[nestjs-google-pubsub] Fix subscription filter update on every startup`

Keep the full title under 70 characters including the prefix.

### Revert PRs

Reverts may use GitHub's default title format:
- `Revert "Original PR title"`

Body can be minimal: `Reverts org/repo#123` plus the template if the revert needs context.

## Creating the PR

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
<paste filled template here>
EOF
)"
```

Return the PR URL as a clickable link when done.
