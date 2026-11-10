---
name: chapterize
description: Turn a concept you want to learn into a researched book chapter — theory, exercises, a builder's guide, and sources.
disable-model-invocation: true
argument-hint: "What concept do you want a chapter on?"
---

The user wants to learn a concept as a **chapter** of a **book**. This is stateful: chapters live on a **shelf** in the user's Learn **library**, alongside lessons from `/teach` on the same subject, and each chapter builds on what came before.

## The library

This skill carries everything a library needs in its own [`library/`](./library/) folder: `LIBRARY.md`, `formats/`, `assets/`, `bin/build-index`, and a `gitignore`. That folder is the **template**; each library is an installed copy of it.

Once the library is open, read its `LIBRARY.md`. It defines the layout, how to find or create the shelf, the shared files and their formats in `formats/`, the page rules, and indexing. Follow it throughout — the library's copy, not the template, since the user may have customised it.

Chapterize's own files on a shelf:

- `BOOK.md` — the chapter table of contents and build goal. Format: `formats/BOOK.md`.
- `chapters/0001-<dash-case-name>.html` — one self-contained page per chapter, numbered in TOC order.

## Steps

### 0. Open the library

Find the library: the nearest ancestor of the current directory (inclusive) containing `LIBRARY.md`, else the directory in the `LEARN_LIBRARY` environment variable.

- **None found** — ask the user where to create one with `AskUserQuestion` (offer the current directory and `~/Learn`). Copy the template's contents there, renaming `gitignore` to `.gitignore`, and offer to `git init` it. Tell the user that setting `LEARN_LIBRARY` to that path lets `/chapterize` find it from any directory.
- **Found, older template** — compare the version on the first line of the library's `LIBRARY.md` with the template's. If the template is newer, show the user what changed in the template-owned files (`LIBRARY.md`, `formats/`, `assets/`, `bin/`) and update them only if they agree, keeping any edits they've made.

Done when you have a library whose `LIBRARY.md` you've read.

### 1. Orient

Find the shelf as `LIBRARY.md` describes, then read its `MISSION.md`, `BOOK.md`, `GLOSSARY.md`, `learning-records/`, `NOTES.md`, and the titles of its lessons and reference pages.

- **No `MISSION.md`** — run the intake: ask, one at a time, why they want to learn this, what they already know, and whether there's something they want to build. Ask each with the `AskUserQuestion` tool, never as chat text: 2–4 concrete options drawn from the topic, with your recommendation first when you have one (the user can always pick "Other"). Use `multiSelect` where answers aren't exclusive, such as prior knowledge. Write `MISSION.md` (format: `formats/MISSION.md`) and a learning record for the prior knowledge they disclose.
- **No `BOOK.md`** — create it, with the build goal from the intake or the mission ("none" if there isn't one).
- **Existing book** — if the user named a topic, find it in the TOC; if they didn't, take the next `planned` entry.

Done when the shelf has a mission and a `BOOK.md`, and you know which chapter you're writing and what the learning records say the user already knows.

### 2. Scope

Draft the theory sections the topic needs. A chapter holds **3–4 theory sections** and takes about **20 minutes** to read and work through, exercises included (the builder's guide may run longer). Skip what the learning records show the user already knows; aim at weak spots they record.

If the topic needs more than 4 sections, split it: write the chapters into the `BOOK.md` TOC as `planned`, confirm the TOC with the user (via `AskUserQuestion`, previewing the TOC), then write the first.

Done when the chapter has 3–4 named sections that fit the 20-minute budget.

### 3. Research

Never trust parametric knowledge. Start from the shelf's `RESOURCES.md`, then search for and read high-trust sources — primary docs, recognised experts, the canonical book or talk — until you have 4–8 for this chapter. Log each new one in `RESOURCES.md` (format: `formats/RESOURCES.md`).

Done when every theory section is backed by at least one source you actually read.

### 4. Write

Write the chapter following the [anatomy](#chapter-anatomy) below and the page rules in `LIBRARY.md`. Use the shelf's `GLOSSARY.md` terms wherever they apply, never their listed aliases.

Done when every anatomy element is present in order, every factual claim links to a reference, every exercise has a hint and a worked answer, and the page has its `<title>`, `<meta name="description">`, and a `learn:builds-on` tag for each earlier chapter or lesson it relies on.

### 5. Hand off

Mark the chapter `written` in `BOOK.md` (linking its file), run `bin/build-index`, and open the chapter. Tell the user to bring exercise attempts to chat.

### 6. Review (when the user brings answers)

Give feedback on their attempt — what's right, what's missing, the misconception if there is one. Write a learning record (format: `formats/LEARNING-RECORD.md`) when they demonstrate understanding or a misconception gets corrected. When they use one of the chapter's key terms correctly, add it to the shelf's `GLOSSARY.md` (format: `formats/GLOSSARY.md`), creating the file if needed. Mark the chapter `done` in `BOOK.md` once they've worked through it, and run `bin/build-index`.

## Chapter anatomy

In this order:

1. **Introduction** (mandatory) — an overview of the subject: what it is, why it matters to _this_ user's mission, and a map of the sections ahead. Link the earlier chapters and lessons this one builds on.
2. **Theory sections** (3–4) — each teaches one idea. Concrete example before abstraction. Cite inline, linking to the References list. Draw a diagram (inline SVG in a `<figure>`) wherever there's a mechanism to show. Each section ends with its exercises.
3. **Exercises** (1–2 per section, inline) — they force thought and action, not recall. Mix the kinds:
   - _Predict, then check_ — "what will this print / happen?" before revealing.
   - _Try it / break it_ — run, change, or deliberately break something and observe.
   - _Transfer_ — apply the idea to a case the section didn't cover.
   - _Explain it back_ — explain the idea in your own words, or to someone else.

   Each sits in a `.exercise` box with a collapsed `<details class="hint">` and a collapsed `<details class="answer">`, so the user commits to an attempt before peeking. Open-ended ones end with "bring your answer to chat for review." If a lesson on the shelf drills this idea, link it.
4. **Builder's guide** — include when the request or the build goal is about building something (most software topics). A small, runnable, end-to-end build in a `.builder` section's numbered list; each step gives its goal, the code or commands, a `.checkpoint` ("you should now see…"), and a link to the theory section it applies. For purely conceptual topics, replace it with one line saying why it's skipped.
5. **Key takeaways** — 3–5 bullets in a `.takeaways` box.
6. **Further reading & viewing** — 3–6 hand-picked resources for _after_ the chapter, mixing media (book, video, blog, site). Each annotated: what it is and why it complements this chapter. This is curation, not a bibliography.
7. **References** — every source used to write the chapter, numbered to match the inline citations, in a `.references` list. Nothing you didn't read.

Close with a reminder that the user can ask follow-up questions in chat — you're their teacher.

## Style

A chapter should be **beautiful** — clean typography, generous margins, prints well. Think Tufte. All styling comes from the library's `assets/library.css`, which already styles the classes named above; add any new component there, not in the page.
