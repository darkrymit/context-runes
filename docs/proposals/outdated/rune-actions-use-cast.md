---
tags:
  - closed
---

# Proposal: Rune Actions (`use` and `cast`)

## Overview

We introduce a unified model for Runes that supports both **Context Gathering** (Read) and **Project Modification** (Write). A Rune is no longer just a context-gatherer; it is a **Domain of Capability** that can be interacted with via two distinct actions: `use` and `cast`.

This unified model simplifies the user's mental map (everything is a "Rune") while maintaining a strict security and conceptual boundary between reading and writing.

---

## Nomenclature & CLI

| Action | CLI Command | Purpose | Side Effects |
| :--- | :--- | :--- | :--- |
| **Use** | `crunes use <key>` | Gather context for AI/User | **None** (Read-only) |
| **Cast** | `crunes cast <key>` | Perform project chores/actions | **Allowed** (Write-enabled) |

---

## Rune API

A Rune is an ES module that can export one or both of the following functions:

```js
// .crunes/runes/version.js

/**
 * Gather context (Read-only)
 */
export async function use(dir, args, utils, opts) {
  const pkg = await utils.json.read('package.json');
  return { type: 'markdown', content: `Current version: ${pkg.version}` };
}

/**
 * Perform action (Write-enabled)
 */
export async function cast(dir, args, utils, opts) {
  const newVersion = args[0];
  await utils.json.update('package.json', (pkg) => {
    pkg.version = newVersion;
  });
}
```

### API Rules
1.  **Strict Write Gating**: The `use()` function is strictly read-only. Even if permissions are granted, calls to `utils.fs.write` or similar will throw an error when called within `use()`.
2.  **Shared Utils**: Both functions receive the same `utils` object, but the write-family methods (`fs.write`, `fs.replace`, `json.update`) only activate during a `cast` operation.

---

## Security & UX

### 1. Permission Gating
Permissions in `plugin.json` are now grouped by action intent:

```json
{
  "runes": {
    "version": {
      "permissions": {
        "use":  { "allow": ["fs.read:package.json"] },
        "cast": { "allow": ["fs.write:package.json"] }
      }
    }
  }
}
```

### 2. Confirmation Prompts
`crunes cast` is an "active intent" command. Unless `-y` is passed, it will list all files that were touched by the rune and ask for final confirmation before committing them to disk (or prompt before each write, depending on configuration).

### 3. Dry Run
`crunes cast <key> --dry-run` allows the user to see what a rune *would* modify without actually performing the writes.

---

## Use Case: Domain-Driven Runes

### `git` Rune
- `crunes use git`: Returns staged diffs and recent commit messages.
- `crunes cast git`: Performs a `git stash` or an automated "WIP" commit.

### `package` Rune
- `crunes use package`: Summarizes dependencies and scripts.
- `crunes cast package`: Installs a new dependency or cleans up unused ones.

---

## Implementation Groundwork

1.  **CLI Updates**: Add `cast` command to `program.js`.
2.  **Internal Registry**: Update how runes are loaded to detect both `use` and `cast` exports.
3.  **Permission Engine**: Update `computeEffectivePermissions` to handle action-specific scopes.
4.  **Write Intercepts**: Implement the `utils.fs.write` family, ensuring they are only functional during a `cast` context.
5.  **Confirmation UI**: Build the "destiny confirmation" prompt for the `cast` command.
