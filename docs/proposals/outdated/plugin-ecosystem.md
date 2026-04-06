---
tags:
  - closed
---

# Plugin Ecosystem (Closed)

> This proposal has been split and superseded:
> - **Implemented** → [[plugin-ecosystem-base]]
> - **Remaining work** → [[plugin-ecosystem-advanced]]

---

# Original Proposal: Rune Plugin Ecosystem

## Overview

Context-runes currently supports locally authored runes registered in a per-project config. This proposal extends that model with a **plugin ecosystem** — a way to install, share, and activate rune packs across projects — mirroring Claude Code's plugin and marketplace system.

A **rune plugin** is a directory (usually a Git repo or npm package) that bundles ready-to-run runes and/or rune templates. Plugins are installed globally once and activated per-project. A **marketplace** is a hosted JSON file that lists available plugins; multiple marketplace sources are supported so teams can maintain private registries alongside the official one.

Every JSON file in the ecosystem carries a `format` field (integer) so the CLI can detect and migrate stale schemas without ambiguity.

---

## Plugin Folder Structure

Every rune plugin has this layout (mirrors `.claude-plugin/` pattern):

```
my-plugin/
├── .context-runes-plugin/
│   ├── plugin.json           ← plugin identity and rune metadata
│   └── marketplace.json      ← self-listing (lets this repo act as a single-plugin marketplace source)
├── runes/
│   ├── structure.js          ← ready-to-run rune (runs from global install location)
│   └── git.js
├── runes-templates/
│   ├── deps.js               ← template rune (copied into project on crunes create --from)
│   └── api.js
├── package.json              ← present when distributed via npm
├── README.md
├── CHANGELOG.md
└── LICENSE
```

Folder placement determines install mode — no extra config needed:

| Folder | Mode | Behaviour |
|--------|------|-----------|
| `runes/` | plugin | Runs directly from the global cache. Updates when plugin updates. |
| `runes-templates/` | template | File is copied into `.context-runes/runes/` on `crunes create --from`. User owns and edits the copy. |

File paths are derived by convention: `runes/<key>.js` and `runes-templates/<key>.js`. No path enumeration is needed in `plugin.json`.

---

## `.context-runes-plugin/plugin.json`

Mirrors `.claude-plugin/plugin.json`. `format` versions the schema; `version` is the plugin's own release version:

```json
{
  "format": "1",
  "name": "runes-node",
  "version": "1.0.0",
  "description": "Ready-to-use runes and templates for Node.js projects",
  "author": { "name": "DarkRymit" },
  "homepage": "https://github.com/darkrymit/context-runes-node",
  "repository": "https://github.com/darkrymit/context-runes-node",
  "license": "MIT",
  "keywords": ["node", "javascript"],
  "runes": {
    "structure": {
      "name": "Project Structure",
      "description": "Live file tree respecting .gitignore"
    },
    "git": {
      "name": "Git Status",
      "description": "Branch, recent commits, uncommitted diff stats"
    }
  },
  "templates": {
    "deps": {
      "name": "Dependencies",
      "description": "package.json dependencies overview — customize for your project"
    }
  }
}
```

---

## `.context-runes-plugin/marketplace.json`

Allows the plugin repo itself to be added as a marketplace source URL. Uses `owner` (not `author`) to identify the marketplace maintainer — mirrors Claude Code's marketplace format where `owner` refers to who operates the listing, distinct from the `author` of each individual plugin entry:

```json
{
  "format": "1",
  "name": "runes-node",
  "description": "Ready-to-use runes and templates for Node.js projects",
  "owner": { "name": "DarkRymit" },
  "plugins": [
    {
      "name": "runes-node",
      "description": "Ready-to-use runes and templates for Node.js projects",
      "version": "1.0.0",
      "author": { "name": "DarkRymit" },
      "source": "./",
      "category": "runes",
      "homepage": "https://github.com/darkrymit/context-runes-node"
    }
  ]
}
```

A curated marketplace repo can aggregate many plugins in its `plugins` array.

---

## Global Storage

Plugins are installed globally, shared across all projects:

```
~/.context-runes/
└── plugins/
    ├── plugins.json               ← tracks installed plugins
    ├── marketplaces.json          ← tracks registered marketplace sources
    ├── cache/
    │   └── <marketplace>/
    │       └── <plugin-name>/
    │           └── <version>/     ← versioned plugin content
    ├── local/
    │   └── <plugin-name>/         ← locally developed plugins (not from marketplace)
    └── marketplaces/
        └── <marketplace-id>/      ← cloned marketplace repos
```

### `plugins/plugins.json`

```json
{
  "format": "1",
  "plugins": {
    "runes-node@context-runes-marketplace": {
      "installPath": "~/.context-runes/plugins/cache/context-runes-marketplace/runes-node/1.0.0",
      "version": "1.0.0",
      "installedAt": "2026-04-03T00:00:00.000Z",
      "lastUpdated": "2026-04-03T00:00:00.000Z"
    }
  }
}
```

### `plugins/marketplaces.json`

```json
{
  "format": "1",
  "marketplaces": {
    "context-runes-marketplace": {
      "source": "https://github.com/darkrymit/context-runes-marketplace",
      "installLocation": "~/.context-runes/plugins/marketplaces/context-runes-marketplace",
      "lastUpdated": "2026-04-03T00:00:00.000Z"
    }
  }
}
```

---

## Per-Project Config

`.context-runes/config.json` also carries `format` so the CLI can detect and migrate old project configs:

```json
{
  "format": "1",
  "plugins": ["runes-node"],
  "runes": {
    "api": ".context-runes/runes/api.js"
  }
}
```

Enabling a plugin makes **all** of its `runes/` entries available automatically — no manual registration per rune. `crunes list` shows plugin runes and local runes together, with a `source` column indicating origin.

---

## Distribution Methods

Plugins can be distributed and installed from multiple sources:

| Source type | Example | Notes |
|-------------|---------|-------|
| GitHub repo | `darkrymit/context-runes-node` | Cloned via git |
| Git URL | `https://gitlab.com/org/runes-node.git` | Any git host |
| npm package | `@darkrymit/context-runes-node` | Downloaded from npm registry; plugin must include `.context-runes-plugin/` folder |
| Local path | `./path/to/plugin` | For local development; symlinked into `plugins/local/` |

For npm-distributed plugins, the `package.json` is the standard npm manifest and the `.context-runes-plugin/` folder sits alongside it. The CLI detects npm packages by the `@scope/name` or bare `name` format (no slashes, no `.git` suffix, no path prefix).

---

## Path Resolution

- Path starts with `.` → local file, resolved relative to project root (existing behaviour, unchanged)
- Plugin rune → resolved to `~/.context-runes/plugins/cache/<marketplace>/<name>/<version>/runes/<key>.js`

The `${CONTEXT_RUNES_PLUGIN_ROOT}` environment variable points to the plugin's versioned install directory, mirroring `${CLAUDE_PLUGIN_ROOT}`.

---

## CLI Commands

### Plugin management

```bash
crunes plugin install <source>     # Install globally (GitHub, git URL, npm package, or local path)
crunes plugin uninstall <name>     # Remove from global store
crunes plugin list                 # List all globally installed plugins
crunes plugin update [name]        # Update one plugin, or all if name omitted
crunes plugin enable <name>        # Add plugin to current project's config
crunes plugin disable <name>       # Remove plugin from current project's config
```

### Marketplace

```bash
crunes marketplace list            # Show configured marketplace sources
crunes marketplace add <url>       # Add a marketplace source (global)
crunes marketplace remove <url>    # Remove a marketplace source
crunes marketplace search <term>   # Search available plugins across all sources
crunes marketplace browse          # List all plugins from all sources
```

### Template scaffolding

`crunes create` gains a `--from` flag for template runes:

```bash
crunes create deps --from runes-node
# Copies the deps template from the installed plugin
# into .context-runes/runes/deps.js and registers it in config
```

---

## First Official Plugin — `runes-common`

A universal starter pack:

| Type | Key | Description |
|------|-----|-------------|
| rune | `structure` | File tree respecting .gitignore, configurable depth |
| rune | `git` | Current branch, recent commits, uncommitted diff stats |
| rune | `env` | Expected env vars parsed from `.env.example` with inline docs |
| template | `deps` | Dependency list — user picks format for their stack |
| template | `docs` | Markdown aggregator — user sets the glob pattern |
| template | `api` | HTTP route scanner — user wires it to their framework |
