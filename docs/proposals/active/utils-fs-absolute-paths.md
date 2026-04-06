---
tags:
  - proposed
---

## Dependencies

- [[utils-fs]]
- [[unified-rune-permissions]]

# Proposal: `utils.fs` — Absolute Path Support

## Overview

`utils.fs` resolves all paths relative to the project root and rejects anything that escapes it via `assertInsideDir`. This blocks reading files at known absolute locations — most commonly a plugin's own bundled assets via `CONTEXT_RUNES_PLUGIN_ROOT`.

The fix: if a path is absolute, use it as-is. Relative paths continue to resolve against the project root. Behaviour is identical for local and plugin runes.

---

## API (unchanged)

```js
// Relative — resolves against project root (unchanged)
const pkg = await utils.fs.read('package.json')

// Absolute — used as-is (new)
const schema = await utils.fs.read(
  path.join(globalThis.CONTEXT_RUNES_PLUGIN_ROOT, 'assets/schema.json')
)
```

---

## Implementation

In `createFsUtils`, update path resolution in `read` and `exists`:

```js
const abs = path.isAbsolute(relPath) ? relPath : path.resolve(dir, relPath)
checkPermission('fs.read', relPath)   // relative or absolute — same checker, no structural guard
```

`assertInsideDir` is removed entirely. Containment within the project root is not enforced at the structural level — it is a permission concern. A rune that needs `../sibling/file` or `/etc/myapp/config` declares it in `allow`; one that does not has no access outside the project root because its `allow` list will not match those paths.

With [[unified-rune-permissions]], `checkPermission` is always a real checker for both rune types — no special-casing needed.

`glob` does not support absolute patterns (tinyglobby operates relative to `cwd`). Passing an absolute pattern throws a clear error:

```
utils.fs.glob does not support absolute patterns — use a relative pattern.
```

---

## Plugin Root Implicit Allow

Plugin runes always have implicit read access to their own plugin directory — no `allow` declaration needed:

```js
// Always permitted for plugin runes — pluginDir is implicitly in the allow list
const schema = await utils.fs.read(
  path.join(globalThis.CONTEXT_RUNES_PLUGIN_ROOT, 'assets/schema.json')
)
```

Implementation: `createFsUtils` receives an optional `pluginDir` argument. Before calling `checkPermission`, paths that resolve inside `pluginDir` are let through unconditionally:

```js
if (pluginDir && abs.startsWith(pluginDir + path.sep)) {
  // implicit allow — no checkPermission call
} else {
  checkPermission('fs.read', relPath)
}
```

`deny` entries can still override this — an explicit `deny: ["fs.read:<pluginDir>/secrets/**"]` is respected.

---

## Security Model

All paths — relative, traversing (`../`), or absolute — go through `checkPermission` unless they resolve inside the plugin's own directory (implicit allow). Access is granted if and only if the path matches an `allow` entry and no `deny` entry. There is no structural containment guard; the permission list is the sole gatekeeper.

Default `allow: []` means no file access outside the plugin root unless explicitly declared.
