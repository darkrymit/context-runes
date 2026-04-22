---
tags:
  - proposed
---

# Proposal: `utils.env`

## Overview

Runes often need access to credentials (API keys, tokens) or environment-specific configuration that should not be hardcoded. `utils.env` provides a secure, permission-gated way to access environment variables from both the system `process.env` and project-local `.env` files.

---

## API

A new `env` object is added to `utils`:

```js
await utils.env.get(key, fallback?)
// Returns: string | undefined

await utils.env.has(key)
// Returns: boolean

await utils.env.all()
// Returns: Record<string, string> (only allowed keys)
```

---

## Permissions

Plugins must declare which environment variables they are allowed to read. Permission strings follow the `env:<pattern>` format:

```json
{
  "name": "my-plugin",
  "runes": {
    "github-stats": {
      "permissions": {
        "allow": ["env:GITHUB_TOKEN", "env:GH_*"]
      }
    }
  }
}
```

### Pattern Matching
- Simple strings match exactly.
- Glob-style patterns (e.g., `env:API_*`) allow reading multiple variables with a common prefix.
- Deny rules can block sensitive keys even if a glob would otherwise allow them.

---

## `.env` File Support

The CLI will automatically search for and load a `.env` file in the project root (the `--cwd` path) before executing any rune.

- Values from `.env` are merged into the environment seen by `utils.env`.
- Real `process.env` values take precedence over `.env` values (allowing shell overrides).
- `.env` files are **never** automatically committed or managed by `crunes`; they are assumed to be user-provided local configuration.

---

## Security

- **Isolation**: Plugins only see the variables explicitly granted to them. They cannot iterate over the entire system environment unless granted `env:*`.
- **Credential Safety**: By encouraging the use of `utils.env`, we discourage rune authors from hardcoding secrets in their scripts.
- **Local Runes**: Local runes have unrestricted access to all environment variables.

---

## Implementation Notes

1. **Host Side**: `src/api/utils/env.js` manages the merged environment and filtering logic.
2. **Isolate Bridge**: `src/isolation/runner.js` exposes `$__utils_env_get`, etc.
3. **Dotenv**: Use a lightweight parser (like `dotenv`) to load the project's `.env` file during `resolveProjectRoot` or `loadConfig`.
4. **Isolate Context**: Environment variables are NOT set as `process.env` inside the isolate (as `process` is not available). They are only accessible via `utils.env`.

---

## Use Cases

- **`github-rune`**: Uses `utils.env.get('GITHUB_TOKEN')` to authenticate its `http` calls.
- **`ci-info`**: Detects CI provider by checking `env:GITHUB_ACTIONS` or `env:CIRCLECI`.
- **`custom-api`**: Reads `env:API_BASE_URL` to point to a local vs production endpoint.
