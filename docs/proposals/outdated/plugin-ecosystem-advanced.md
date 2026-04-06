---
tags:
  - completed
---

## Dependencies

- [[plugin-ecosystem-base]]
- [[plugin-create]]

# Plugin Ecosystem — Advanced

## Overview

Advanced features building on top of the base plugin ecosystem. The base covers install, update, uninstall, marketplace sourcing, and permission gating. This proposal covers the remaining features deferred from the original design.

---

## 1. `runes-templates/` — Scaffoldable Rune Templates

Plugins can ship template runes alongside ready-to-run runes. A template is copied into the project on `crunes create --from` and becomes user-owned — the user edits and maintains their copy.

### Plugin structure addition

```
my-plugin/
├── runes/               ← runs from global cache (existing)
└── runes-templates/
    └── deps.js          ← copied into project on crunes create --from
```

### `plugin.json` addition

```json
{
  "templates": {
    "deps": {
      "name": "Dependencies",
      "description": "package.json dependency overview — customise for your stack"
    }
  }
}
```

### Usage

```bash
crunes create deps --from my-plugin
# copies runes-templates/deps.js → .context-runes/runes/deps.js
# registers "deps" in .context-runes/config.json
```

If the key already exists in config, the command prompts to confirm overwrite (skipped with `-y`).

---

## 2. `marketplace browse` Command

List all plugins from all configured marketplace sources in one view, without a search query.

```bash
crunes marketplace browse
```

Output (markdown table, one row per plugin per source):

```
marketplace       plugin        version  description
my-marketplace    my-plugin     1.0.0    ...
other-market      other-plugin  2.1.0    ...
```

Supports `--format json` for machine-readable output.

---

## 3. `${CONTEXT_RUNES_PLUGIN_ROOT}` Environment Variable

Set on the isolate context when executing a plugin rune — points to the plugin's cache directory. Mirrors `${CLAUDE_PLUGIN_ROOT}`.

```js
// inside a plugin rune
const assetPath = path.join(process.env.CONTEXT_RUNES_PLUGIN_ROOT, 'assets', 'schema.json')
```

Useful for plugins that bundle static assets alongside their rune scripts.

### Implementation note

Injected via `ivm.Context` before `generate` is called. Read-only — the rune cannot modify the path.

---

## 4. Per-Project `enable` / `disable`

Currently `crunes plugin enable/disable` flips a global flag in `plugins.json`, affecting all projects at once.

The advanced behaviour: `enable`/`disable` should add or remove the plugin from the **current project's** `.context-runes/config.json` `plugins` array, with the global `enabled` flag reserved as an emergency kill switch only.

```bash
cd ~/projects/api
crunes plugin enable my-plugin    # adds "my-plugin" to .context-runes/config.json
crunes plugin disable my-plugin   # removes it
```

### Migration

Requires a `--global` flag to preserve the current behaviour for the emergency kill-switch use case:

```bash
crunes plugin disable my-plugin           # per-project (new default)
crunes plugin disable my-plugin --global  # global kill switch (current behaviour)
```
