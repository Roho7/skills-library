# BOOK.md Format

`BOOK.md` is a shelf's table of contents for chapters: what chapters there are, in what order, and how far the user has got. The _why_ lives in `MISSION.md` and what the user has learned lives in `learning-records/` — don't repeat either here.

## Structure

```md
# {Book title}

**Build goal:** A persistent key-value store in Python.

## Contents

1. [Storage engines: logs and pages](chapters/0001-storage-engines.html) — done
2. [Indexes: hash maps and B-trees](chapters/0002-indexes.html) — written
3. LSM-trees and SSTables — planned
4. Transactions and write-ahead logs — planned
```

## Rules

- **Build goal** decides whether chapters get a builder's guide. Write "none" if there isn't one.
- **One numbered line per chapter**, in reading order, ending in a status: `planned` (no file yet), `written` (file exists), or `done` (the user has worked through it). Written and done chapters link their file. `bin/build-index` parses these lines, so keep the shape exact.
- **Confirm before reordering or dropping chapters.**
