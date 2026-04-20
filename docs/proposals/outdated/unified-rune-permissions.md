---
tags:
  - completed
---

## Dependencies

- [[rune-permissions]]
- [[utils-fs]]
- [[utils-shell]]

# Proposal: Unified Rune Permission Model

## Overview

Local and plugin runes currently have different permission treatment:

| | Local rune | Plugin rune |
|--|------------|-------------|
| Execution | V8 isolate | V8 isolate |
| `utils.fs` (relative) | ungated — `checkPermission = null` | `allow`-checked |
| `utils.shell` | ungated | `allow`-checked |
| Permission source | none (implicit trust) | `plugin.json` + project override |

The isolate boundary is already unified. This proposal unifies the permission model too: local runes declare their own `permissions` block in their `config.json` entry, which is passed through the same `makePermissionChecker` pipeline as plugin runes.

---

## Config Schema

Local rune entries already support a `permissions` field (it was added when templates began copying permissions on `crunes create --from`). It is currently ignored at runtime. This proposal makes it load-bearing:

```json
{
  "runes": {
    "deps": {
      "path": ".context-runes/runes/deps.js",
      "permissions": {
        "allow": ["fs.read:package.json", "shell:npm list *"],
        "deny": []
      }
    }
  }
}
```

Default when `permissions` is absent: `{ allow: [], deny: [] }` — deny all, matching the current plugin default.

---

## Behaviour Change

`utils.fs` and `utils.shell` calls from local runes are now gated by the rune's declared `allow` list. A local rune that previously read `package.json` without any config will throw a `PermissionError` unless it declares `"fs.read:package.json"` (or a wildcard) in its `allow` list.

`utils.rune` is exempt — composition is always permitted regardless of permissions.

---

## Implementation

In `core.js` `runRune`, replace the local rune path:

```js
// before
const result = await runRuneInIsolate(fullPath, effective, args, dir, { runeCallback })

// after — effective already comes from computeEffectivePermissions(entry.permissions, config.permissions?.[key])
// No change to the call; the change is that entry.permissions is now always used (never null-coalesced away)
```

`computeEffectivePermissions` already handles `undefined`/empty permissions gracefully. The only required change is removing the `checkPermission = null` shortcut in `createUtils` — local runes now always receive a real `makePermissionChecker(effective)`.

---

## Migration

Existing local runes that use `utils.fs` or `utils.shell` will start throwing `PermissionError` unless their `config.json` entry declares the required `allow` patterns.

`crunes validate` should be extended to warn when a rune's `permissions.allow` is empty but the rune body contains `utils.fs` or `utils.shell` calls — a static scan (simple string search, no AST) is sufficient as a best-effort hint.

---

## Rationale

A rune that reads arbitrary files or runs shell commands is doing something that the project author should explicitly authorise. The implicit trust model for local runes was convenient but makes it impossible to reason about what a rune can access — especially as rune composition (`utils.rune`) allows one rune to invoke another. Unified permissions make the surface area of each rune explicit and auditable regardless of where it came from.
