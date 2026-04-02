---
title: Shell Completions
status: proposal
depends: []
---

# Proposal: Shell Completions

## Overview

Tab completion for `crunes` makes daily use significantly faster and signals CLI maturity. Commander.js ships built-in completion support; the main value-add is completing dynamic values like registered rune keys from the current project's config.

---

## Command

```bash
crunes completions bash    # print bash completion script
crunes completions zsh     # print zsh completion script
crunes completions fish    # print fish completion script
```

Users add the output to their shell profile once:

```bash
# bash (~/.bashrc)
eval "$(crunes completions bash)"

# zsh (~/.zshrc)
eval "$(crunes completions zsh)"

# fish (~/.config/fish/config.fish)
crunes completions fish | source
```

---

## What Gets Completed

| Position | Completions |
|----------|-------------|
| Subcommand | `query run list validate init create plugin marketplace completions` |
| `query <key>` | Rune keys from `.context-runes/config.json` resolved via `--cwd` if provided, otherwise `process.cwd()` |
| `run <key>` | Same as `query` |
| `create [key]` | No dynamic completions (free-form key name) |
| `plugin <sub>` | `install uninstall list update enable disable` |
| `marketplace <sub>` | `list add remove search browse` |
| `completions <shell>` | `bash zsh fish` |
| Global flags | `--cwd --yes --plain` |
| `query --format` | `md json` |

Dynamic rune key completion requires reading the project config at completion time. This is fast (single JSON parse) and fails silently if no config is present.

---

## Implementation Notes

- Commander v12 exposes `program.createHelp()` and completion hooks; use the official completion API rather than manual script generation where possible.
- For dynamic rune key completion, a small completion handler calls `loadConfig(cwd)` and returns `Object.keys(config.runes ?? {})`.
- The `fish` format requires a different output structure from bash/zsh; handle as separate template.
- Completion scripts should not produce errors or warnings if `.context-runes/config.json` is absent.
