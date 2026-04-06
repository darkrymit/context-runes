---
tags:
  - proposed
---

## Dependencies

- [[utils-fs]]

# Proposal: `utils.json` — Project JSON File Reader

## Overview

Reading and parsing JSON files from the project is one of the most common patterns in rune authoring — `package.json`, `tsconfig.json`, `.eslintrc.json`, `pyproject.toml`-adjacent files, and more. `utils.json` wraps `utils.fs.read` with JSON parsing, schema-friendly access, and helpful error messages that point to the file and the problem.

---

## API

```js
// Read and parse — throws if not found or invalid JSON
const pkg = await utils.json.read('package.json');

// Return null if file not found, still throws on invalid JSON
const tsconfig = await utils.json.read('tsconfig.json', { throw: false });

// Read a specific key path (dot-notation)
const deps = await utils.json.get('package.json', 'dependencies');
const main = await utils.json.get('package.json', 'scripts.build');
```

---

## Return Values

| Method | Returns |
|--------|---------|
| `json.read(path)` | `object` — parsed JSON |
| `json.read(path, { throw: false })` | `object \| null` |
| `json.get(path, keyPath)` | `any` — value at dot-notation key path, or `undefined` |
| `json.get(path, keyPath, defaultValue)` | `any` — value or default if missing |

---

## Error Messages

Errors include the resolved file path and, for parse errors, the line and column:

```
Failed to parse .context-runes/config.json:
  Unexpected token '}' at line 12, column 3

Hint: check for a trailing comma on line 11.
```

This is significantly more actionable than a raw `JSON.parse` throw.

---

## Implementation Notes

- Backed by `utils.fs.read` — inherits all cross-platform path handling and BOM stripping.
- Parse errors caught and re-thrown as `JsonParseError` with file path and position extracted from the native error message.
- `json.get` uses a simple dot-path traversal — does not support bracket notation or arrays (keep it minimal).
- `utils.json` is added to `createUtils` in `core.js` alongside `utils.fs`.

---

## Usage Examples

```js
// Node.js dependencies rune
export async function generate(dir, args, utils) {
  const pkg = await utils.json.read('package.json', { throw: false });
  if (!pkg) return [];

  const prod = Object.entries(pkg.dependencies ?? {});
  const dev  = Object.entries(pkg.devDependencies ?? {});

  return utils.section('deps', {
    type: 'markdown',
    content: [
      utils.md.h3('Dependencies'),
      utils.md.table(['Package', 'Version'], prod),
      utils.md.h3('Dev Dependencies'),
      utils.md.table(['Package', 'Version'], dev),
    ].join('\n'),
  });
}

// Read a specific value without loading the whole file
export async function generate(dir, args, utils) {
  const nodeVersion = await utils.json.get('package.json', 'engines.node', 'unspecified');
  return utils.section('node-version', {
    type: 'markdown',
    content: `Required Node.js: ${nodeVersion}`,
  });
}
```
