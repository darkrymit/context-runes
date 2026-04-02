---
title: Rune Composition
status: proposal
depends: []
---

# Proposal: Rune Composition (`utils.rune`)

## Overview

Runes are currently isolated — each runs independently. Rune composition allows one rune to invoke another via `utils.rune(key, args)`, enabling aggregate runes that combine existing outputs without duplicating logic.

---

## API

A new helper is added to `utils`:

```js
utils.rune(key, args?, opts?)
// Returns: Section[]
// Throws:  if the rune key is not registered
// opts — same shape as generate's opts; pass { sections: [...] } to forward a section hint
```

Usage inside a rune:

```js
export function generate(dir, args, utils, opts) {
  const structureSections = await utils.rune('structure');
  const gitSections       = await utils.rune('git');

  return [
    ...structureSections,
    ...gitSections,
    utils.section('summary', buildSummary(dir), { title: 'Project Summary' }),
  ];
}
```

---

## Behaviour

- `utils.rune(key, args)` loads and executes the target rune exactly as `runRune` does — same `dir`, same `utils`, same `opts` forwarding.
- The `opts.sections` hint is **not** forwarded automatically to the called rune (the caller may want all sections from the dependency). Callers can pass explicit opts if needed: `utils.rune('api', [], { sections: ['endpoints'] })`.
- Circular calls (`rune A → rune B → rune A`) throw a `CircularRuneError` with the call chain in the message.
- A called rune that does not exist throws immediately — composition chains should be explicit, not silently skipped.

---

## Circular Call Detection

`runRune` receives an optional `_callStack: string[]` parameter (internal, not exposed to rune authors). Before executing a rune, the key is checked against the stack:

```js
if (_callStack.includes(key)) {
  throw new CircularRuneError(`Circular rune call: ${[..._callStack, key].join(' → ')}`);
}
```

`utils.rune` closes over the current stack and appends the new key before delegating to `runRune`.

---

## Core Changes

`runRune` in `core.js`:

```js
export async function runRune(dir, config, key, args, opts = {}, _callStack = []) {
  if (_callStack.includes(key)) throw new CircularRuneError(...);
  // ...
  const utils = createUtils(dir, config, [..._callStack, key]); // pass stack to utils
  const result = await generate(dir, args, utils, opts);
  // ...
}
```

`createUtils` gains a `runeHelper` that closes over `dir`, `config`, and the current `_callStack`.

---

## Use Cases

- **`overview` rune** — combines `structure`, `git`, and `env` into one block for onboarding prompts
- **`ci` rune** — combines `deps`, `env`, and `validate` output for CI context
- **`review` rune** — combines `git` (recent changes) and `tests` (test surface) before a code review
