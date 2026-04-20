---
tags:
  - completed
---

## Dependencies

- [[plugin-ecosystem]]

# Proposal: `crunes plugin create` — Plugin Scaffolder

## Overview

`crunes create` scaffolds individual runes. There is no equivalent for scaffolding an entire plugin. `crunes plugin create` generates the full `.context-runes-plugin/` structure, `runes/` and `templates/` folders, and supporting files so a plugin author can go from zero to a publishable plugin in one command.

---

## Command

```bash
crunes plugin create [name]
crunes -y plugin create my-plugin --description "Runes for Django projects"
```

In interactive mode, the command prompts for name and description. With `-y`, all required fields must be provided as flags.

---

## Flags

| Flag | Description |
|------|-------------|
| `--description <text>` | Short description for `plugin.json` and `marketplace.json` |
| `--author <name>` | Author name (defaults to git `user.name` if available) |
| `--license <spdx>` | License identifier (default: `MIT`) |
| `--out <path>` | Output directory (default: `./<name>`) |

---

## Generated Structure

```
<name>/
├── .context-runes-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── runes/
│   └── example.js            ← annotated starter rune
├── templates/
│   └── example-template.js   ← annotated starter template
├── README.md
├── CHANGELOG.md
└── package.json              ← for npm distribution
```

---

## Generated Files

### `.context-runes-plugin/plugin.json`

```json
{
  "format": "1",
  "name": "<name>",
  "version": "1.0.0",
  "description": "<description>",
  "author": { "name": "<author>" },
  "license": "<license>",
  "keywords": [],
  "runes": {
    "example": {
      "name": "Example Rune",
      "description": "Replace with your rune description"
    }
  },
  "templates": {
    "example-template": {
      "name": "Example Template",
      "description": "Replace with your template description"
    }
  }
}
```

### `.context-runes-plugin/marketplace.json`

```json
{
  "format": "1",
  "name": "<name>",
  "description": "<description>",
  "owner": { "name": "<author>" },
  "plugins": [
    {
      "name": "<name>",
      "description": "<description>",
      "version": "1.0.0",
      "author": { "name": "<author>" },
      "source": "./",
      "category": "runes"
    }
  ]
}
```

### `runes/example.js`

Annotated starter showing the full `generate` signature and a working section return:

```js
// Ready-to-run rune — runs directly from the plugin install location.
// Users activate it by adding your plugin to their project config.

export async function generate(dir, args, utils, opts) {
  // dir  — absolute path to the user's project root
  // args — string[] passed via $example(arg1, arg2)
  // utils — { md, tree, section, fs, json, shell, rune }
  // opts.sections — string[] | null — requested sections (performance hint)

  return utils.section('example', {
    type: 'markdown',
    content: utils.md.h3('Example') + utils.md.ul(['Replace with real output']),
  });
}
```

### `templates/example-template.js`

Annotated starter for template runes — identical signature, with a comment explaining the copy-on-scaffold behaviour.

### `package.json`

Minimal npm manifest for publishing:

```json
{
  "name": "<name>",
  "version": "1.0.0",
  "description": "<description>",
  "type": "module",
  "license": "<license>",
  "author": "<author>",
  "keywords": ["context-runes"]
}
```

---

## Implementation Notes

- Author name is read from `git config user.name` via `child_process.spawnSync` — falls back to empty string if git is unavailable.
- `--out` defaults to `./<name>` relative to `--cwd` or `process.cwd()`.
- If the output directory already exists and is non-empty, the command prompts to confirm overwrite (skipped with `-y`).
- Files are written using the same template approach as `crunes create` — small inline string templates, no template engine dependency.
