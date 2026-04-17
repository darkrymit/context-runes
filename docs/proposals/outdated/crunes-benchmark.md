---
tags:
  - completed
---

# Proposal: `crunes benchmark`

## Overview

Runes run on every prompt via the ACI hook. A slow rune silently degrades the entire AI workflow — the user types a prompt and waits, with no indication of what is taking time. `crunes benchmark` times each rune and surfaces which ones are slow, so authors can optimise before publishing.

---

## Command

```bash
crunes bench              # benchmark all registered runes
crunes bench <key>        # benchmark one rune (supports local:key and plugin:key)
crunes -p bench           # plain output for scripting
crunes bench --runs 3     # average over multiple runs
```

Exits with code `0` always — benchmark results are informational, not pass/fail.

---

## Output

Styled (default):

```
crunes benchmark

  structure    42ms   ████░░░░░░  fast
  git          180ms  ████████░░  ok
  api          1240ms ██████████  slow  ⚠
  env          28ms   ███░░░░░░░  fast

  Total: 1490ms  |  1 slow rune (> 1000ms)
```

Plain (`-p`):

```
structure  42    fast
git        180   ok
api        1240  slow
env        28    fast
total      1490
slow-count 1
```

---

## Thresholds

| Label | Range | Meaning |
|-------|-------|---------|
| `fast` | < 200ms | No action needed |
| `ok` | 200ms – 1000ms | Acceptable; worth watching |
| `slow` | > 1000ms | Will noticeably delay prompts; optimise or cache |

---

## Measurement

Each rune is run once (cold) and the wall-clock time of `runRune()` is recorded. With `--runs <n>` the average is shown.

---

## Relationship to Other Commands

| Command | Runs rune? | Times execution? |
|---------|-----------|-----------------|
| `use`       | Yes | No  |
| `benchmark` | Yes | Yes |

---

## Implementation Notes

- Each rune is run sequentially to avoid resource contention skewing results.
- Uses `performance.now()` (from `node:perf_hooks`) for sub-millisecond precision.
- `--cwd` is honoured for project root resolution.
- Errors during a rune run are reported as `error` instead of a timing label — benchmark continues with the next rune.
- Key argument supports `local:name`, `plugin:name`, and bare `name` (same resolution as `crunes use`).
