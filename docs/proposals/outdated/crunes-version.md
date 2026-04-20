---
tags:
  - completed
---

# Proposal: `crunes version` and Update Check

## Overview

`crunes version` prints the installed version and optionally checks npm for a newer release. Standard hygiene for a globally-installed CLI — users should always know if they're behind.

---

## Command

```bash
crunes version        # print version, check for update
crunes version --no-check  # print version only, skip network call
crunes --version      # short alias (Commander default, version only)
```

---

## Output

When up to date:

```
crunes 1.0.6
```

When a newer version is available:

```
crunes 1.0.6

  Update available: 1.0.6 → 1.1.0
  Run npm install -g @darkrymit/context-runes to update.
```

Plain (`-p`):
```
1.0.6
update-available 1.1.0
```

---

## Update Check Behaviour

- Makes a single GET request to `https://registry.npmjs.org/@darkrymit/context-runes/latest` and reads the `version` field.
- Result is cached in `~/.context-runes/update-check.json` with a TTL of 1 hour — the network call only happens once per hour regardless of how many times `crunes version` is run.
- If the network call fails (offline, timeout), it silently skips the update hint — never blocks the command.
- Timeout is 2 seconds.

### Cache format

```json
{
  "format": "1",
  "checkedAt": "2026-04-03T00:00:00.000Z",
  "latestVersion": "1.1.0"
}
```

---

## Passive Update Hint

In addition to `crunes version`, a passive hint is printed at the bottom of any command output when a cached newer version is available and the cache is fresh:

```
  Hint: crunes 1.1.0 is available. Run npm install -g @darkrymit/context-runes to update.
```

This hint is suppressed in `--plain` mode and when stdout is not a TTY (piped output).

---

## Implementation Notes

- Version string comes from `package.json` — imported at startup, not hardcoded.
- Cache file lives at `~/.context-runes/update-check.json`, consistent with global storage location.
- The passive hint is emitted by the `preAction` hook in `cli.js` after `configureOutput()`, so it appears for all commands without touching each handler.
- `--no-check` flag disables both the live check and the passive hint for that invocation.
