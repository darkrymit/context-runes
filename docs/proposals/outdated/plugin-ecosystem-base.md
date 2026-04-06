---
tags:
  - completed
---

## Dependencies

- [[rune-permissions]]
- [[utils-fs]]
- [[utils-shell]]

# Plugin Ecosystem — Base

## Overview

Plugins are globally installed rune packs activated per-project. They run inside a V8 isolate with explicit permission grants (see [rune-permissions](../rune-permissions)).

---

## Plugin Structure

```
my-plugin/
├── .context-runes-plugin/
│   ├── plugin.json        ← identity, rune metadata, dependencies, permissions
│   └── marketplace.json   ← self-listing so the repo acts as a marketplace source
└── runes/
    └── <key>.js           ← ready-to-run runes
```

### `plugin.json`

```json
{
  "format": "1",
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "...",
  "dependencies": { "semver": "^7.0.0" },
  "runes": {
    "git": {
      "name": "Git Status",
      "permissions": {
        "allow": ["shell:git log *", "shell:git status"],
        "deny":  ["shell:git push *"]
      }
    }
  }
}
```

### `marketplace.json`

```json
{
  "format": "1",
  "name": "my-marketplace",
  "owner": { "name": "..." },
  "plugins": [
    {
      "name": "my-plugin",
      "version": "1.0.0",
      "source": "./"
    }
  ]
}
```

`source` resolves relative to the directory containing `marketplace.json`. When `marketplace.json` lives inside `.context-runes-plugin/`, `"./"` correctly resolves to the plugin root (one level up).

---

## Global Storage

```
~/.context-runes/
├── plugins.json          ← installed plugin registry
├── marketplaces.json     ← configured marketplace sources
├── plugins/
│   └── <name>@<version>/ ← real dir (remote) or symlink (local)
└── store/                ← pnpm content-addressable store
```

### `plugins.json`

```json
{
  "format": "1",
  "plugins": {
    "my-plugin": {
      "version": "1.0.0",
      "path": "/abs/path/to/plugins/my-plugin@1.0.0",
      "enabled": true,
      "installedAt": "2026-04-06T00:00:00.000Z",
      "marketplaceName": "my-marketplace",
      "pluginName": "my-plugin",
      "consentedPermissions": {
        "git": ["shell:git log *", "shell:git status"]
      }
    }
  }
}
```

`marketplaceName` + `pluginName` store provenance for `crunes plugin update`. `enabled` is a global kill switch — `false` disables across all projects without uninstalling.

### `marketplaces.json`

```json
{
  "format": "1",
  "sources": [
    "https://example.com/marketplace.json",
    "/abs/path/to/plugin/.context-runes-plugin"
  ]
}
```

Flat list of source URLs or absolute local paths. Fetched on demand — no local clone.

---

## Per-Project Config

`.context-runes/config.json`:

```json
{
  "format": "1",
  "plugins": ["my-plugin"],
  "runes": { "api": ".context-runes/runes/api.js" },
  "permissions": {
    "my-plugin:git": {
      "allow": ["shell:git log --oneline *"],
      "deny":  ["shell:git commit *"]
    }
  }
}
```

`plugins` is populated automatically by `crunes plugin install`. Plugin runes are addressed as `pluginName:runeKey`.

---

## Install Flow

```bash
crunes marketplace add <url-or-path>
crunes plugin install <marketplace-name>@<plugin-name>
```

1. Fetch marketplace, locate plugin entry, resolve `source`
2. Download to staging dir (GitHub tarball / git clone / npm pack / local symlink)
3. Read and validate `plugin.json`
4. If already installed → update flow (re-consent if new permissions)
5. Copy to `~/.context-runes/plugins/<name>@<version>/` (symlink for local)
6. Install deps — pnpm → bun → npm, always `--ignore-scripts`
7. Display permissions, require explicit consent
8. Write to `plugins.json` and `.context-runes/config.json`

---

## Dependency Installation

| PM | Command | Deduplication |
|----|---------|---------------|
| pnpm | `pnpm add <dep> --dir <cache> --ignore-scripts --store-dir ~/.context-runes/store` | Content-addressable hardlinks |
| bun | `bun add <dep> --cwd <cache> --ignore-scripts` | bun global cache |
| npm | `npm pack` + tarball extract | None — per-plugin copy |

First found in PATH wins. npm fallback shows a one-time hint to install pnpm or bun.

---

## CLI Commands

```
crunes plugin install <marketplace>@<plugin>   Install from a configured marketplace
crunes plugin uninstall <name>                 Remove globally and from project config
crunes plugin list [--format md|json]          List installed plugins
crunes plugin update [name]                    Re-resolve from marketplace and reinstall
crunes plugin enable <name>                    Set enabled: true globally
crunes plugin disable <name>                   Set enabled: false globally

crunes marketplace add <url>                   Add a source
crunes marketplace remove <url>                Remove a source
crunes marketplace list                        List configured sources
crunes marketplace search <query>              Search plugins across all sources
```
