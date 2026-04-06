---
tags:
  - proposed
---

# Proposal: Profiles / Environments

## Overview

A single project may need different rune sets in different contexts — a developer machine wants verbose context, CI wants minimal output, a staging environment exposes different endpoints. Profiles let a project define multiple named rune sets in one config file, selected at invocation time via `--profile`.

---

## Global Flag

```bash
crunes --profile <name> <command> [args]
```

If `--profile` is omitted, the `default` profile is used. If no `default` profile is defined, the top-level `runes` object is used (fully backward-compatible).

---

## Config Format

Profiles live inside a `profiles` key in `.context-runes/config.json`. Each profile declares its own `runes` map; profiles can also reference a `base` profile to inherit and override from:

```json
{
  "format": "1",
  "plugins": ["runes-common"],
  "runes": {
    "structure": ".context-runes/runes/structure.js"
  },
  "profiles": {
    "ci": {
      "runes": {
        "env": ".context-runes/runes/env-ci.js"
      }
    },
    "staging": {
      "base": "default",
      "runes": {
        "api": ".context-runes/runes/api-staging.js"
      }
    }
  }
}
```

### Resolution rules

1. Start with top-level `runes` as the `default` profile.
2. If `--profile <name>` is given, look up `profiles.<name>`.
3. If the profile declares a `base`, merge: base runes first, profile runes override.
4. If no `base` is declared, the profile's `runes` is used standalone (does not inherit top-level runes).

This keeps profiles explicit — no hidden inheritance surprises.

---

## Behaviour

- `crunes list` shows runes for the active profile only.
- `crunes query`, `run`, `validate`, `test`, `doctor` all operate on the active profile's rune set.
- Unknown profile name → error with a list of defined profiles.
- `crunes list --all-profiles` prints a summary of all defined profiles and their rune keys.

---

## Use Cases

```bash
# Developer default — full context
crunes query structure

# CI — only what the pipeline needs
crunes --profile ci query env

# Staging — same as default but with staging API
crunes --profile staging query api

# Verify all profiles are healthy before a release
crunes --profile ci validate
crunes --profile staging validate
```

---

## Implementation Notes

- `resolveProfileRunes(config, profileName)` is a pure function that applies the merge rules and returns the effective `runes` map — independently testable.
- `--profile` is parsed in `cli.js` alongside `--cwd`; the resolved rune map is passed into each command handler, replacing direct access to `config.runes`.
- Profile names follow `kebab-case` convention.
