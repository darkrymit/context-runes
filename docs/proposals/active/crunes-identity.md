---
tags:
  - proposed
---

# Proposal: The `crunes` Identity

## Overview

To simplify the user experience and maximize performance, we are standardizing the project's identity around the **`crunes`** brand. 

As there is no stable version currently, we are making a clean break from the legacy "context-runes" terminology to establish a high-performance, professional foundation. This is a **global rename** affecting the CLI, configuration folders, environment variables, and repository structure.

---

## 1. CLI Command: `crunes`

The primary CLI command is **`crunes`**. 

- **Binary**: The `@darkrymit/crunes` (formerly `context-runes`) package will export only the `crunes` binary.
- **Consistency**: All documentation and examples will use `crunes`.

---

## 2. Project & Global Folders

### Local Project Folder: `.crunes/`
All project-level configuration and runes are stored in a hidden **`.crunes/`** directory.
- Previous name: `.context-runes/`

### Plugin Manifest Folder: `.crunes-plugin/`
Plugin metadata and assets are stored in **`.crunes-plugin/`**.
- Previous name: `.context-runes-plugin/`

### User Global Folder: `~/.crunes/`
Global configuration, plugin registry, and the shared pnpm store are stored in the user's home directory under **`~/.crunes/`**.
- Previous name: `~/.context-runes/`

---

## 3. Environment Variables

All environment variables used by the system are prefixed with `CRUNES_`.

| Variable | Description |
| :--- | :--- |
| `CRUNES_PLUGIN_ROOT` | Points to the root of the executing plugin. |
| `CRUNES_HOME` | Overrides the default `~/.crunes/` global path. |
| `CRUNES_VERBOSE` | Enables debug logging (alternative to `--verbose`). |

---

## 4. Repository Structure

The sub-projects within the monorepo are renamed for consistency:

- `context-runes-cli` → **`crunes-cli`**
- `context-runes-aci` → **`crunes-aci`**

---

## 5. Brand Philosophy

- **The Brand**: **crunes** (Context Runes).
- **The Entity**: **Rune**.
- **The Action**: `use` (Context) and `cast` (Action).

---

## 6. Implementation Checklist

- [ ] Rename directories in the monorepo.
- [ ] Update `package.json` names and binary exports.
- [ ] Update all `path.join` and `resolve` calls in the source code to use new folder names.
- [ ] Update environment variable lookups in `runner.js`.
- [ ] Universal find-and-replace of `context-runes` in all READMEs and documentation.
