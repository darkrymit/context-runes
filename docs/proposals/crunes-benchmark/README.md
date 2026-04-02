---
title: crunes benchmark
status: proposal
depends: []
---

# Proposal: `crunes benchmark`

## Overview

Runes run on every prompt via the ACI hook. A slow rune silently degrades the entire AI workflow — the user types a prompt and waits, with no indication of what is taking time. `crunes benchmark` times each rune and surfaces which ones are slow, so authors can optimise before publishing.

---

## Command

```bash
crunes benchmark              # benchmark all registered runes
crunes benchmark <key>        # benchmark one rune
crunes benchmark <key> [args] # benchmark with args
crunes -p benchmark           # plain output for scripting
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

Thresholds are hardcoded defaults. A future improvement could make them configurable in `.context-runes/config.json`.

---

## Measurement

Each rune is run once (cold) and the wall-clock time of `generate()` is recorded — from the moment `generate` is called to when the returned promise resolves. Import/load time is measured separately and shown in `--verbose` output.

```
  api  load: 8ms  generate: 1232ms  total: 1240ms
```

---

## Relationship to Other Commands

| Command | Runs rune? | Validates shape? | Times execution? |
|---------|-----------|-----------------|-----------------|
| `validate` | No | No | No |
| `test` | Yes | Yes | No |
| `benchmark` | Yes | No | Yes |

`benchmark` does not validate the return shape — it only cares about timing. Run `crunes test` first to confirm correctness, then `crunes benchmark` to check performance.

---

## Implementation Notes

- Each rune is run in isolation — one at a time, not in parallel — to avoid resource contention skewing results.
- Uses `performance.now()` (from `node:perf_hooks`) for sub-millisecond precision.
- `--cwd` is honoured for project root resolution.
- A `--runs <n>` flag (default `1`) allows multiple runs for averaging, useful for runes with variable I/O timing.
- Errors during a rune run are reported as `error` instead of a timing label — benchmark continues with the next rune.
