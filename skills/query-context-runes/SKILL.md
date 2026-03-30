---
name: Query Context Runes
description: This skill should be used when the user explicitly asks to fetch, explore, or list dynamic project context defined by context-runes (e.g., "what context runes are available", "query the X rune"). Do NOT trigger this skill just because a prompt contains $key(args) tokens — those are resolved automatically by the UserPromptSubmit hook before reaching the LLM.
version: 1.0.0
---

# Query Context Runes

The `context-runes` plugin allows for injecting dynamic project context using inline `$key(args)` tokens.

Because this is handled automatically via a `UserPromptSubmit` hook (`scripts/enrich.js`), **you do not need to take any
action when a user's prompt contains a token.** The data will already be injected into the context by the time you see
it.

Only use the manual querying tool when the user explicitly asks you to fetch live project data mid-conversation, or asks
what runes are currently available.

## Discovering Available Runes

Because enrichers are dynamic and project-specific, you can find the currently available token keys by reading the
project's configuration file:

```bash
cat .context-runes/config.json
```

This file contains the `"enrichers"` object, mapping each token key to its respective script path.

## Fetching Data Directly

To query an enricher manually, run the `query.js` script from the project root:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/query.js <key> [arg1 arg2 ...]
```

**Examples:**

* `node ${CLAUDE_PLUGIN_ROOT}/scripts/query.js <key>` — Fetch the default/root output for a token.
* `node ${CLAUDE_PLUGIN_ROOT}/scripts/query.js <key> arg1` — Fetch specific context passing `arg1` to the enricher.
* `node ${CLAUDE_PLUGIN_ROOT}/scripts/query.js <key> arg1 arg2` — Pass multiple arguments.

## Adding Custom Enrichers

If the user wants to add a new custom context rune to their project:

1. Create an enricher script in the project (e.g., `.context-runes/enrichers/custom.js`) that exports an object with:
   * `sectionTag`: The XML tag to wrap the injected context in (defaulting to the key).
   * `generate(projectRoot, args)`: A function that returns a typed data object (`list`, `tree`, or `sections`) for
     `render.js` to format.
2. Register the mapping in the project's `.context-runes/config.json`:
   ```json
   {
     "enrichers": {
       "customKey": ".context-runes/enrichers/custom.js"
     }
   }
   ```