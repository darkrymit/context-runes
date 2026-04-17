---
tags:
  - completed
---

# Proposal: Batch Query — Multiple Keys in One Invocation

## Overview

Currently each rune key requires a separate `crunes query` call. This means the ACI hook spawns one process per `$token` in a prompt, and scripts that need multiple rune outputs chain multiple invocations. Batch query lets callers request multiple keys in a single invocation, reducing process spawn overhead and simplifying scripting.

---

## CLI Syntax

```bash
crunes query structure git env            # query three runes, all output combined
crunes query structure git --format json  # combined JSON output
crunes -p query structure git env         # plain output
```

Multiple keys are positional arguments after the command. Single-key usage is unchanged — fully backward-compatible.

---

## Output

### Markdown (default)

Sections from each rune are printed sequentially in the order keys were given. Each rune's sections flow directly into the next with no separator — the existing per-rune rendering is unchanged.

### JSON

Returns a flat `Section[]` array combining all rune outputs in key order:

```json
[
  { "name": "tree",    "data": { "type": "tree", ... },     "title": "Project Structure" },
  { "name": "commits", "data": { "type": "markdown", ... }, "title": "Git Commits" },
  { "name": "env",     "data": { "type": "markdown", ... }, "title": "Environment" }
]
```

---

## Key-Specific Args

When using batch mode, args cannot be passed positionally (ambiguous which key they belong to). A `key:arg1,arg2` inline syntax is used instead:

```bash
crunes query "api:v2" git env
crunes query "api:v2" "schema:users,orders"
```

The `:` separator and comma-separated args mirror the ACI section-targeting syntax for consistency.

Without inline args, all keys receive an empty args array.

---

## Error Behaviour

By default, if one rune in a batch fails, the error is reported and the remaining runes still run — partial output is better than no output. The exit code is `1` if any rune failed.

With `--fail-fast`, the first error stops execution immediately.

```bash
crunes query structure git env --fail-fast
```

---

## ACI Hook Optimisation

The ACI hook-wrapper currently spawns one `crunes query` process per `$token`. With batch support, all tokens in a prompt can be resolved in a single process spawn:

```
Before: spawn('crunes', ['query', 'structure', '--format', 'json'])
        spawn('crunes', ['query', 'git', '--format', 'json'])
        spawn('crunes', ['query', 'env', '--format', 'json'])

After:  spawn('crunes', ['query', 'structure', 'git', 'env', '--format', 'json'])
```

This is the primary performance motivation. For prompts with multiple tokens, the improvement is proportional to the number of tokens — 3 tokens = 3× fewer process spawns and startup costs.

Tokens with args use the inline syntax: `spawn('crunes', ['query', 'api:v2', 'git', '--format', 'json'])`.

---

## Implementation Notes

- `query` command handler already receives `[key, ...args]` — extend to treat all non-flag positional arguments as keys when more than one is present.
- Inline arg parsing: split each key argument on the first `:`, then split the remainder on `,`.
- Runes run sequentially by default. A `--parallel` flag can be added later for concurrent execution once the performance tradeoff is understood.
- `crunes run` (alias for `query --format md`) gains batch support identically.
