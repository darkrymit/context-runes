---
title: "--cwd" Global Flag
status: proposal
depends: []
---

# Proposal: `--cwd` Global Flag

## Overview

Currently `crunes` resolves the project root from the current working directory. Users must `cd` into the project before running any command. A `--cwd <path>` global flag lets callers specify the project root explicitly, enabling use from scripts, CI pipelines, and monorepos without changing the shell's working directory.

---

## Flag Definition

Added as a global option alongside `-y` and `-p`:

```bash
crunes --cwd <path> <command> [args]
```

All commands honour it: `query`, `list`, `validate`, `create`, `init`, `plugin`, `marketplace`.

---

## Behaviour

- `--cwd` sets the project root used for config loading, rune path resolution, and the `dir` argument passed to `generate(dir, args, utils)`.
- The shell's actual working directory is **not** changed — only the logical project root used internally.
- Relative paths in `--cwd` are resolved against the shell's actual `cwd` at invocation time.
- If omitted, behaviour is identical to today (project root = `process.cwd()`).

---

## Usage Examples

```bash
# Query from a CI script that runs at repo root
crunes --cwd packages/api query structure

# List runes in a sibling project
crunes --cwd ../other-project list

# Validate all runes before a release
crunes --cwd /workspace/my-app validate
```

---

## Implementation Notes

- `--cwd` is parsed in `cli.js` before the `preAction` hook runs.
- A single `resolveProjectRoot(opts)` helper replaces every inline `process.cwd()` call across all command handlers.
- `create` and `init` write files relative to `--cwd`, not `process.cwd()`.
