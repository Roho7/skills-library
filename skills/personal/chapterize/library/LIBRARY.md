<!-- library-template: 1 -->
# The Learn Library

This folder is a **library** shared by the `teach` and `chapterize` skills. Each subject is a **shelf**; lessons (teach) and chapters (chapterize) for that subject sit on the same shelf, share its mission and learning records, and link to each other.

This file is the contract for working inside the library. Where it disagrees with a skill's own layout, format, or style rules, this file wins.

The library was installed from the template inside the `chapterize` skill. The marker on the first line is the template version it came from; `LIBRARY.md`, `formats/`, `assets/`, and `bin/` are template-owned, everything else belongs to the user.

## Layout

```
Learn/
├── LIBRARY.md            this file
├── index.html            generated: every shelf
├── assets/               shared by every page on every shelf
│   ├── library.css       palette, typography, components
│   └── components.js     quiz and recall widgets
├── formats/              formats for the shelf files below
├── bin/build-index       regenerates every index.html and the series nav
│
└── <shelf>/              dash-case subject name, e.g. eng-practices
    ├── index.html        generated: the shelf hub
    ├── MISSION.md        why the user is learning this        formats/MISSION.md
    ├── RESOURCES.md      trusted sources                      formats/RESOURCES.md
    ├── NOTES.md          teaching preferences, working notes
    ├── GLOSSARY.md       canonical terms                      formats/GLOSSARY.md
    ├── BOOK.md           chapter table of contents            formats/BOOK.md
    ├── learning-records/ 0001-<slug>.md                       formats/LEARNING-RECORD.md
    ├── chapters/         0001-<slug>.html   (chapterize)
    ├── lessons/          0001-<slug>.html   (teach)
    └── reference/        <slug>.html        cheat sheets, glossary pages
```

Create files and folders lazily — a shelf with no chapters has no `chapters/` or `BOOK.md`.

## Finding the shelf

1. The library is the nearest ancestor of the current directory (inclusive) containing `LIBRARY.md`; failing that, the directory named by the `LEARN_LIBRARY` environment variable.
2. If the current directory is already inside a shelf, that's the shelf.
3. Otherwise match the requested topic to an existing shelf by its `MISSION.md`. If one fits, use it — a lesson and a chapter on the same subject belong on the same shelf. If none fits, create a new shelf named for the subject.

One mission per shelf. If the topic doesn't serve an existing shelf's mission, it's a new shelf.

## Shared state

Both skills read and write the same shelf files:

- **`MISSION.md`** grounds everything on the shelf. If it exists, don't re-interview the user — read it.
- **`learning-records/`** is the only record of what the user has learned, whichever skill taught it. Read it before writing anything; write a record whenever the user demonstrates understanding, discloses prior knowledge, or corrects a misconception.
- **`RESOURCES.md`** is one pool of sources; a chapter's References and a lesson's citations are drawn from it.
- **`GLOSSARY.md`** is the vocabulary for every page on the shelf. Whichever skill sees the user use a term correctly adds it; both skills write pages in its terms.

## Pages

Every HTML page (chapter, lesson, reference) on a shelf:

- Links the shared assets with relative paths: `<link rel="stylesheet" href="../../assets/library.css">` and, if it uses widgets, `<script src="../../assets/components.js"></script>`. Never copy the palette or widgets into a page or a shelf.
- Has a `<title>` (the page's name) and a `<meta name="description">` (one sentence) — the index reads both.
- May declare what it builds on: `<meta name="learn:builds-on" content="chapters/0001-storage-engines.html">`, a path relative to the shelf (use `../<other-shelf>/…` across shelves). Repeat the tag for several.
- Uses only relative links, so the library works opened from disk.
- Links related pages in its body: a chapter links the lesson that drills it, a lesson links the chapter that explains it, both link the reference sheet.

Type, number, and shelf come from where the file lives (`chapters/0003-*.html` is chapter 3); chapter status comes from `BOOK.md`. Don't repeat them in tags.

Anything reusable — a new widget, a diagram helper, a style — goes into `assets/` so every shelf gets it.

## Palette

`assets/library.css` defines the fixed paper palette as CSS custom properties on `:root`. It is the single source of truth: reference the variables (`var(--paper)`, `var(--ink)`, `var(--accent)`, …) everywhere, including inline SVG. Never use pure white or pure black, and don't invent new colors.

## Indexing

The last step of every session that adds or changes a page or `BOOK.md`:

```bash
python3 <library>/bin/build-index
```

It rewrites `index.html` at the root and on every shelf, and the previous/next nav inside each page (between `<!-- learn:nav -->` markers — never hand-edit inside them). Never hand-write an index. Then open the page you made.
