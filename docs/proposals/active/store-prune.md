---
tags:
  - proposed
---

## Dependencies

- [[plugin-ecosystem]]
- [[rune-permissions]]

# Proposal: `crunes store prune`

## Overview

When a plugin is uninstalled, its cache directory (`~/.context-runes/plugins/<name>@<version>/`) is deleted. However, if pnpm was used to install dependencies, the actual package files remain in the content-addressable store at `~/.context-runes/store/` — they are hardlinked into the plugin cache, so deleting the cache dir orphans them in the store.

`crunes store prune` removes packages from the context-runes pnpm store that no installed plugin references, reclaiming disk space.

> **Background:** The [rune-permissions](../rune-permissions) proposal establishes a dedicated pnpm store at `~/.context-runes/store` (passed via `--store-dir` during `crunes plugin install`). This store is owned exclusively by context-runes — `crunes store prune` is its garbage collector.

---

## Command

```bash
crunes store prune [--dry-run]
```

---

## What Gets Pruned

Three categories of orphaned storage are cleaned:

| Category | Condition | Action |
|----------|-----------|--------|
| Plugin cache dirs | Not referenced by any entry in `plugins.json` | Delete the directory |
| pnpm store packages | Not referenced by any installed plugin's `node_modules` | `pnpm store prune --store-dir ~/.context-runes/store` |
| Leftover tmp dirs | `crunes-install-*` or `crunes-dep-*` dirs in system temp | Delete |

Plugin cache dirs that are **symlinks** (local development installs) are skipped — the target is never touched.

---

## Output

```
Scanning ~/.context-runes/plugins/...
  orphaned: runes-node@0.9.0 (removed)

Pruning pnpm store at ~/.context-runes/store...
  freed: 12.4 MB

No orphaned tmp dirs found.

Done. Freed 12.4 MB.
```

With `--dry-run`, nothing is deleted and all lines are prefixed with `[dry-run]`.

---

## When to Run

Pruning is never automatic — it is always an explicit user action. Suggested use:

- After `crunes plugin uninstall` when disk space is a concern
- Periodically in CI environments where plugins are reinstalled frequently

---

## Implementation Notes

- **Orphaned cache dirs:** read `plugins.json` registry, collect all `path` values, list `~/.context-runes/plugins/`, delete any directory not in the registry (skip symlinks).
- **pnpm store prune:** only runs if `~/.context-runes/store/` exists. Delegates to `pnpm store prune --store-dir ~/.context-runes/store`. If pnpm is not installed, skips with a notice.
- **bun:** bun manages its own global cache (`~/.bun/install/cache`) — context-runes has no ownership of it and does not prune it.
- **npm fallback:** packages are extracted directly into `plugin-cache-dir/node_modules/` with no shared store; deleting the cache dir (step 1) is sufficient.
- **Tmp dirs:** glob `os.tmpdir()/crunes-install-*` and `os.tmpdir()/crunes-dep-*`, delete any that are older than 1 hour (guards against pruning an in-progress install).
