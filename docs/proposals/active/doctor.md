---
tags:
  - proposed
---

# Proposal: `crunes doctor`

## Overview

`crunes doctor` diagnoses the local setup in one command, catching the most common reasons context-runes stops working. Useful for onboarding to a new machine, debugging CI failures, and verifying a project after cloning.

---

## Command

```bash
crunes doctor
crunes -p doctor    # plain output for CI/scripts
```

No flags beyond the global ones. Exits with code `0` if all checks pass, `1` if any check fails.

---

## Checks

Checks run in order; later checks that depend on earlier ones are skipped if the dependency fails.

| # | Check | Pass condition |
|---|-------|----------------|
| 1 | Node.js version | `>= 20` |
| 2 | `crunes` in PATH | `which crunes` resolves |
| 3 | `crunes` version | Prints installed version |
| 4 | Project config exists | `.context-runes/config.json` present in project root |
| 5 | Config is valid JSON | Parses without error |
| 6 | Config `format` recognised | `format` value known to this CLI version |
| 7 | All rune files exist | Every path in `config.runes` resolves to a real file |
| 8 | All runes export `generate` | Each rune file can be imported and exports a `generate` function |

Checks 4–8 use `--cwd` if provided.

---

## Output

Styled (default):
```
crunes doctor

  [✓] Node.js v22.3.0
  [✓] crunes 1.0.6 in PATH
  [✓] Config found at .context-runes/config.json
  [✓] Config format "1" recognised
  [✓] structure — .context-runes/runes/structure.js
  [✗] api — .context-runes/runes/api.js not found

  1 problem found.
```

Plain (`-p`):
```
[ok] Node.js v22.3.0
[ok] crunes 1.0.6 in PATH
[ok] Config found at .context-runes/config.json
[ok] Config format "1" recognised
[ok] structure .context-runes/runes/structure.js
[err] api .context-runes/runes/api.js not found
1 problem found.
```

---

## Implementation Notes

- Reuses `loadConfig` and `getRune` from `core.js`.
- Rune import check mirrors `validate` command logic — consider extracting a shared `checkRune(dir, config, key)` helper used by both `doctor` and `validate`.
- Node version check: `process.versions.node`, compare with semver or a simple major-version integer check.
- `crunes` in PATH: `child_process.spawnSync('crunes', ['--version'])` — success if exit code is 0.
