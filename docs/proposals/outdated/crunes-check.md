---
tags:
  - completed
---

## Dependencies

- [[crunes-test]] (supersedes)

# Proposal: `crunes check`

## Overview

`crunes check <key>` runs a rune and validates the shape of what it returns, catching authoring mistakes before they silently produce bad output in production prompts. It supersedes the earlier `crunes test` proposal.

Checking all runes at once is intentionally out of scope — reserved for a future `crunes plugin check` extension.

---

## Command

```bash
crunes check <key>     # check a specific rune by key
crunes -p check <key>  # plain output for CI
```

Exits `0` if the rune passes all checks, `1` if any fail.

---

## What Is Validated

| Check | Pass condition |
|-------|----------------|
| Runs without throwing | `generate()` completes successfully |
| Returns `Section[]` | Return value is a non-null array |
| Each section has `name` | `section.name` is a non-empty string |
| Each section has `data` | `section.data` is present |
| `data.type` is known | `"markdown"` or `"tree"` |
| Markdown `content` is string | When `type === "markdown"`, `content` is a non-empty string |
| Tree `root` is a node | When `type === "tree"`, `root` has `name` and `children` |
| No section names duplicated | All `name` values in the returned array are unique |
| Section names are `kebab-case` | Matches `/^[a-z0-9-]+$/` — required for `$key:section` targeting |

---

## Output

Styled (default):
```
crunes check api

  ✓ api — 3 sections
```

With failures:
```
crunes check api

  ✗ api — section "Public Endpoints" must be kebab-case

  1 problem found.
```

Plain (`-p`):
```
[ok]  api 3 sections
```
or
```
[err] api section "Public Endpoints" must be kebab-case
1 problem found.
```

---

## Implementation Notes

- Calls `runRune` from `core.js`.
- Shape validation is a pure function `checkSections(sections): ValidationError[]` in `src/commands/check-sections.js`.
- All rune execution errors (including missing file or missing `generate` export) are caught and reported as failures, not crashes.
- `--cwd` is honoured for resolving the project root.
