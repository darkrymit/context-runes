---
tags:
  - completed
---

# Proposal: Template Commands

## Overview

Rune templates live inside installed plugins but are not easily discoverable. The `--from` flag on `crunes create` is a hidden shortcut that mixes two concerns: blank-rune scaffolding and template-based creation. This proposal removes `--from` from `crunes create` and introduces a dedicated `crunes template` subcommand group, making templates first-class and `crunes create` simpler.

Templates come from two sources:

- **Local** — `.context-runes/templates/<name>.js` files in the project, registered in `config.json`
- **Plugin** — templates bundled inside an installed plugin's `templates/` directory

Both use the same folder name (`templates/`) and the same config key (`templates`) in their respective manifests (`config.json` for projects, `plugin.json` for plugins).

---

## Breaking Change

`crunes create --from <plugin> [key]` is removed. Template-based creation moves entirely to `crunes template use`.

---

## Template Sources

### Local templates

Stored in `.context-runes/templates/` and registered in `config.json` under a `templates` key:

```json
{
  "runes": { ... },
  "templates": {
    "api": {
      "path": ".context-runes/templates/api.js",
      "name": "API Overview",
      "description": "Starter for REST API runes"
    }
  }
}
```

A plain path string is also valid: `"api": ".context-runes/templates/api.js"`.

Local templates are project-specific and committed to version control — useful for standardising rune structure across a team.

### Plugin template shortcuts

A `templates` entry can also point to a plugin template using a `plugin` field, mirroring the rune alias pattern:

```json
{
  "templates": {
    "api": { "plugin": "my-plugin:api" },
    "schema": { "plugin": "my-plugin:schema", "name": "DB Schema" }
  }
}
```

This lets teams pin preferred plugin templates under short local names. `crunes template use api` resolves to `my-plugin:api` without the caller knowing the plugin name.

### Plugin templates

Bundled inside a plugin's `templates/` directory and declared in `plugin.json` under the `templates` key. Installed globally, available to any project that enables the plugin.

**Breaking change from current:** the plugin folder is renamed from `runes-templates/` → `templates/`. Existing plugins must rename the folder.

---

## Commands

### `crunes template list [source]`

List all available templates — local, shortcuts, and from installed plugins:

```bash
crunes template list                  # all sources
crunes template list local            # only project-local and shortcut entries
crunes template list my-plugin        # only templates from my-plugin
crunes template list --format json
```

Output (default):

```
Source             Template           Description
local              api                Starter for REST API runes
local              schema             Database schema overview  [→ my-plugin:schema]
my-plugin          env                Environment variable index
other-plugin       api                REST API endpoint summary
```

Shortcut entries show their target in brackets. Plain (`-p`): tab-separated `source\ttemplate\tdescription` per line. JSON: array of `{ source, template, name, description, plugin? }` objects.

---

### `crunes template use [source:]<template> [key]`

Copy a template into the project as a new rune:

```bash
crunes template use api                    # auto-resolve: local/shortcut first, then plugins
crunes template use local:api              # explicitly from local templates
crunes template use my-plugin:api          # explicitly from a plugin
crunes template use my-plugin:api myapi    # register under a custom key
crunes template use my-plugin              # interactive: pick template from my-plugin
```

Resolution when no `source:` prefix is given:
1. Local templates and shortcuts (from `config.json`)
2. Plugin templates (from installed plugins, alphabetically by plugin name)

If the same template name exists in multiple sources without a prefix, the command errors and asks for an explicit `source:` prefix.

Supports `--path`, `--name`, `--description` overrides and `-y` for non-interactive use.

---

### `crunes template create <name>`

Scaffold a new template file and register it in `config.json`:

```bash
crunes template create api
crunes template create api \
  --name "API Overview" \
  --description "Starter for REST API runes"
```

Creates `.context-runes/templates/<name>.js` with a blank `generate` stub and registers it under `templates` in `config.json`. Mirrors `crunes create` — supports `--path`, `--name`, `--description`, `-y`, and `-p`.

---

## Error Behaviour

| Situation | Error |
|-----------|-------|
| `template list` — no templates anywhere | Info: `No templates found. Add local ones with: crunes template create` |
| `template list <source>` — source not found | Error: `Plugin "<source>" is not installed.` |
| `template use <name>` — name ambiguous | Error: `"<name>" matches templates in multiple sources: local, my-plugin. Use source:<name>.` |
| `template use` — template not found | Error: `Template "<name>" not found. Run: crunes template list` |
| `template create` — key already registered | Prompts to confirm overwrite (skipped with `-y`) |
| Shortcut `plugin` target not installed | Error: `Template shortcut "<name>" → "<plugin:template>" is not enabled or installed.` |

---

## Implementation Notes

- `template list` merges: local/shortcut entries from `config.json` (source = `"local"`), and plugin entries from the registry.
- `template use` for local templates copies the file from the project-relative path; for shortcuts it resolves `plugin` field and copies from the plugin's `templates/` directory; for plugin templates, delegates to the existing `handleCreateFrom` logic (moved to `src/commands/template/use.js`).
- `template create` scaffolds `.context-runes/templates/<name>.js` with a blank stub and writes the config entry — same flow as `crunes create`.
- All commands live under a `crunes template` subcommand group, mirroring `crunes plugin`.
- Remove `--from` option and `handleCreateFrom` import from `crunes create` in `cli.js` and `src/commands/create.js`.
