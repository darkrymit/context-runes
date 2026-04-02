---
title: crunes test
status: proposal
depends: []
---

# Proposal: `crunes test`

## Overview

`crunes test <key>` runs a rune and validates the shape of what it returns, catching authoring mistakes before they silently produce bad output in production prompts. It is the feedback loop for rune authors.

---

## Command

```bash
crunes test <key> [args...]
crunes test              # test all registered runes
crunes -p test           # plain output for CI
```

Exits with code `0` if all tested runes pass, `1` if any fail.

---

## What Is Validated

For each rune under test:

| Check | Pass condition |
|-------|----------------|
| File exists | Rune path resolves to a real file |
| Exports `generate` | File exports a function named `generate` |
| `generate` returns a value | Does not return `undefined` or `null` |
| Return is `Section[]` | Return value is an array |
| Each section has `name` | `section.name` is a non-empty string |
| Each section has `data` | `section.data` is present |
| `data.type` is known | `"markdown"` or `"tree"` |
| Markdown `content` is string | When `type === "markdown"`, `content` is a non-empty string |
| Tree `root` is a node | When `type === "tree"`, `root` has `name` and `children` |
| No section names duplicated | All `name` values in the returned array are unique |
| Section names are `kebab-case` | Only `a-z`, `0-9`, and `-` allowed (`/^[a-z0-9-]+$/`) — enforces targetability via `$key:section` syntax |

---

## Output

Styled (default):
```
crunes test

  structure
    [✓] exports generate
    [✓] returns Section[]
    [✓] 2 sections: tree, summary
    [✓] section names are unique and kebab-case

  api
    [✓] exports generate
    [✗] section "Public Endpoints" has a space in the name — use "public-endpoints"

  1 problem found.
```

Plain (`-p`):
```
[ok]  structure exports generate
[ok]  structure returns Section[]
[ok]  structure 2 sections: tree, summary
[ok]  structure section names ok
[err] api section "Public Endpoints" has a space — use "public-endpoints"
1 problem found.
```

---

## Relationship to `validate`

`crunes validate` checks that runes are loadable (file exists, exports `generate`). `crunes test` goes further — it actually **runs** the rune and checks the output shape. They are complementary:

| Command | Runs the rune? | Checks output shape? |
|---------|---------------|----------------------|
| `validate` | No | No |
| `test` | Yes | Yes |

`doctor` calls `validate` internally. A future improvement could have `doctor` optionally call `test` as well.

---

## Implementation Notes

- `crunes test` calls `runRune` and then runs each section through a shape-checker function.
- Shape checker is a pure function `checkSections(sections): ValidationError[]` — independently testable.
- Rune execution errors (throws inside `generate`) are caught and reported as a test failure, not a crash.
- `--cwd` is honoured for resolving the project root.
