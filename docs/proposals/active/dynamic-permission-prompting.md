---
tags:
  - proposed
---

# Proposal: Dynamic Permission Prompting (`!`)

## Overview
This proposal introduces a new syntax operator (`!`) to the `plugin.json` permissions array. Prefixing a permission request with `!` indicates that the framework should dynamically prompt the user for approval at runtime, rather than silently allowing or strictly rejecting the request.

## Motivation
Currently, granting a permission like `fs.write:src/*` gives the Rune permanent, silent access to mutate files. Users may be hesitant to grant such sweeping privileges, especially to third-party plugins. 

By introducing the `!` prompt operator, users can configure "Just-in-Time" (JIT) permissions. The Rune is allowed to make the request, but the CLI will pause and ask the user for confirmation before executing the underlying filesystem action.

## Independence Note
The `!` prefix operates strictly at the string-parsing level. This means the feature is fully independent and works perfectly regardless of whether permissions are stored globally (`"permissions": ["!fs..."]`) or within nested namespaces (`"use": { "allow": ["!fs..."] }`).

## Example Configuration

```json
{
  "runes": {
    "refactor": {
      "permissions": [
        "fs.write:.crunes/temp/*", 
        "!fs.write:src/**"
      ]
    }
  }
}
```
In this configuration:
- The rune can silently write temporary files in `.crunes/temp/`.
- If the rune attempts to write to `src/main.js`, the framework pauses.

## Runtime Experience
When `utils.fs.write('src/main.js')` is called, the CLI displays an interactive prompt:

```text
[Security] The 'refactor' rune is requesting to write: src/main.js
Do you want to allow this action? (y/n)
```

## Headless Agent Bypassing
Because AI agents operate in non-interactive environments, they cannot manually respond to `(y/n)` prompts. If an agent requires execution of a rune protected by a `!` permission, it must explicitly bypass the prompt using the standard global `--yes` (or `-y`) CLI flag:

```bash
crunes use refactor --yes
```

When the `--yes` flag is passed to the Crunes process, the framework will automatically approve any `!` permission checks without suspending execution.

## Implementation Groundwork
1. **Permission Parser:** Update the permission parser to identify strings prefixed with `!`.
2. **CLI Interception:** Refactor the `utils.fs` and `utils.json` host implementations to check if an allowed path has the `!` flag. If it does, check if the global `--yes` flag is present. If absent, suspend execution and render an interactive prompt (using `inquirer` or `readline`).
3. **Fail-safes:** If the environment is non-interactive (e.g., CI/CD) and the global `--yes` flag was NOT provided, prompted permissions must automatically default to denied, throwing a security error.
