---
tags:
  - completed
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
Checks 4–6 use `--cwd` if provided.

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

- Reuses `loadConfig` from `core.js`.
- Node version: `process.versions.node`, integer major-version comparison.
- `crunes` in PATH: `child_process.spawnSync('crunes', ['--version'])` — pass if exit code is `0`.
- Does NOT check rune files or run any runes — use `crunes check <key>` for rune correctness.
