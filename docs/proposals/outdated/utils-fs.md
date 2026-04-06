---
tags:
  - completed
---

# Proposal: `utils.fs` — Project-Aware File Helpers

## Overview

Rune authors frequently need to read files and glob paths within the project. Doing this correctly requires joining with `dir`, handling Windows path separators, and dealing with missing files gracefully. `utils.fs` provides a small set of project-aware helpers so authors never import `node:fs` or manually construct paths.

---

## API

```js
// Read a file as a UTF-8 string — throws if not found
const content = await utils.fs.read('package.json');

// Read a file, return null if not found
const content = await utils.fs.read('package.json', { throw: false });

// Check existence
const exists = await utils.fs.exists('.env.example');

// Glob files relative to project root — returns relative paths
const files = await utils.fs.glob('src/**/*.ts');
const mdFiles = await utils.fs.glob('docs/**/*.md', { ignore: ['**/node_modules/**'] });
```

All paths are relative to `dir` (the project root). Absolute paths are also accepted and used as-is.

---

## Return Values

| Method | Returns |
|--------|---------|
| `fs.read(path)` | `string` — file contents |
| `fs.read(path, { throw: false })` | `string \| null` |
| `fs.exists(path)` | `boolean` |
| `fs.glob(pattern, opts?)` | `string[]` — relative paths, forward slashes on all platforms |

---

## Cross-Platform Behaviour

| Concern | Handled by `utils.fs` |
|---------|-----------------------|
| Path joining | All paths joined with `dir` using `path.join` — correct separators per OS |
| Glob results | Always returned with forward slashes regardless of OS |
| File not found | Clear error message including the resolved absolute path |
| Encoding | Always UTF-8 — no BOM stripping needed on Windows (handled internally) |

---

## Implementation Notes

- Backed by `node:fs/promises` — fully async, no event loop blocking.
- Glob backed by a dependency like `fast-glob` or `tinyglobby` — does not shell out, works on Windows without `shell: true`.
- `utils.fs` is created inside `createUtils(dir, ...)` in `core.js` with `dir` closed over — authors never pass the root manually.
- BOM stripping: `content.replace(/^\uFEFF/, '')` — Windows editors sometimes write UTF-8 BOM.

---

## Usage Examples

```js
// Read package.json and extract dependencies
export async function generate(dir, args, utils) {
  const pkg = JSON.parse(await utils.fs.read('package.json'));
  const deps = Object.keys(pkg.dependencies ?? {});
  return utils.section('deps', {
    type: 'markdown',
    content: utils.md.ul(deps),
  });
}

// Aggregate all markdown docs
export async function generate(dir, args, utils) {
  const files = await utils.fs.glob('docs/**/*.md');
  const contents = await Promise.all(files.map(f => utils.fs.read(f)));
  return utils.section('docs', {
    type: 'markdown',
    content: contents.join('\n\n---\n\n'),
  });
}

// Graceful fallback when file is absent
export async function generate(dir, args, utils) {
  const env = await utils.fs.read('.env.example', { throw: false });
  if (!env) return [];
  // parse and return env vars...
}
```
