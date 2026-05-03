---
tags:
  - proposed
---

# Proposal: Per-Rune Framework Options (Bracket Syntax)

## Overview
This proposal introduces the ability to pass **framework-level options** directly to a specific rune invocation using bracket syntax (`[]`). This syntax will be fully supported in both the ACI markdown format and the terminal CLI.

## Motivation
When chaining multiple runes or passing complex options, using global CLI flags (like `--yes` or `--strict`) can be dangerous. A global flag bleeds into every rune executed in that process. 

For example, if you run `crunes use refactor chat --yes`, you might intend to auto-approve permissions for `refactor`, but you accidentally pass `--yes` to the `chat` rune as well.

By supporting bracket syntax directly on the rune key, users and AI agents can tightly bind framework directives to exactly one execution context, allowing for completely safe chaining.

## Example Usage

### 1. ACI Markdown Syntax
AI agents can pass framework options directly in their markdown blocks:

```text
$refactor[--yes]
# or shorthand:
$refactor[-y]
```

### 2. CLI Syntax
Users and agents can safely chain execution in the terminal:

```bash
# Binds the -y flag strictly to 'refactor'
crunes use "refactor[-y]" chat
```

## Implementation Groundwork
1. **CLI Parser Upgrade:** Update the CLI argument tokenization to recognize `[options]` appended to a rune key string.
2. **Framework Context:** Ensure that when the Crunes framework evaluates framework-level directives (like auto-approving `!` permissions), it checks the *rune-specific context* (from the brackets) before falling back to the global CLI process context.
