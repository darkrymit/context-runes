---
tags:
  - completed
---

# Proposal: Replace `query` and `run` with `use`

## Overview

`crunes query` and `crunes run` are two commands doing essentially the same thing — `run` is just `query --format md`. The split is confusing: new users don't know which to reach for, and the word "query" implies a read/inspect action rather than the actual intent: injecting rune context. `use` is shorter, unambiguous, and matches the mental model — you *use* a rune to enrich a prompt.

---

## Breaking Change

`crunes query` and `crunes run` are removed. All usage moves to `crunes use`.

---

## New Command

```bash
crunes use <key-token> [-a <key-token>]... [--format md|json] [--fail-fast]
```

Identical behaviour to `crunes query`. Markdown output is the default (`--format md`); `--format json` returns a flat `Section[]`.

**Examples:**

```bash
crunes use m=chat::tree
crunes use m=chat -a git -a env
crunes use api=v2::endpoints --format json
crunes use m=chat -a git --fail-fast
crunes -p use docs
```

---

## ACI Skill Update

The `context-runes-query` skill is renamed to `context-runes-use` and updated to reference `crunes use`. The hook-wrapper continues to invoke `crunes use` instead of `crunes query`.

---

## Migration

| Before | After |
|--------|-------|
| `crunes query m=chat` | `crunes use m=chat` |
| `crunes run m=chat` | `crunes use m=chat` |
| `crunes query m=chat --format json` | `crunes use m=chat --format json` |
| `crunes query m=chat -a git` | `crunes use m=chat -a git` |

---

## Implementation Notes

- Add `use` command to `cli.js` delegating to the existing `query.js` handler — no handler changes needed.
- Remove `query` and `run` command registrations from `cli.js`.
- Remove `src/commands/run.js` (was a one-liner delegating to query).
- Rename `src/commands/query.js` → `src/commands/use.js`, update the import in `cli.js`.
- Update hook-wrapper to call `crunes use` instead of `crunes query`.
- Version bump: `2.0.0` (breaking change).
