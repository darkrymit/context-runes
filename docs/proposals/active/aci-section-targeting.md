---
tags:
  - proposed
---

# Proposal: ACI Section Targeting (`$key:section`)

## Overview

Runes can return multiple named sections. Today, `$key` injects all of them. A `:section` suffix lets users inject one or more specific sections, reducing noise in focused prompts.

---

## Token Syntax

```
$key                              inject all sections (existing behaviour)
$key:sectionName                  inject one section
$key:(section1, section2)         inject multiple sections
$key(arg1):sectionName            args + single section
$key(arg1):(section1, section2)   args + multiple sections
```

Examples:

```
Give me a summary of the public API. $api:endpoints
Review these tables. $schema:(users, orders)
What changed recently? $git:commits
Check types and errors. $api:(types, errors)
```

---

## Behaviour

- If no section filter is given, all sections are injected (unchanged from today).
- If a filter is given, only matching sections are injected.
- Sections not matched by the filter are silently skipped — no error.
- If none of the requested sections exist, the token produces no output (silently skipped), consistent with the general policy of not failing on missing rune output.
- Section name matching is case-sensitive and matches the `name` field of the `Section` object returned by `utils.section(name, data, opts)`.

---

## Hook-Wrapper Changes

The token regex in `hook-wrapper.js` is extended to capture the optional section suffix — either a bare name or a `(...)` list:

```
Before: /\$([\w-]+)(?:\(([^)]*)\))?/g
After:  /\$([\w-]+)(?:\(([^)]*)\))?(?::([\w-]+|\([^)]*\)))?/g
```

Captured groups:
1. Rune key
2. Args string (optional)
3. Section filter — bare name or `(name1, name2, ...)` (optional)

Parsing the section filter and applying it:

```js
let sections = JSON.parse(result.stdout);
if (sectionPart) {
  const names = sectionPart.startsWith('(')
    ? sectionPart.slice(1, -1).split(',').map(s => s.trim())
    : [sectionPart];
  const nameSet = new Set(names);
  sections = sections.filter(s => nameSet.has(s.name));
}
```

---

## `opts` Parameter on `generate`

The `generate` function gains a fourth parameter, `opts`, so rune authors can inspect the requested sections and skip expensive work they know won't be used:

```js
export function generate(dir, args, utils, opts) {
  // opts.sections — string[] of requested section names, or null if all requested
}
```

`opts.sections` is `null` when no filter is given (all sections wanted). When a filter is present it is the parsed name array, e.g. `['endpoints']` or `['endpoints', 'errors']`.

Example — a rune that only scans routes when that section is actually needed:

```js
export function generate(dir, args, utils, opts) {
  const want = opts.sections ? new Set(opts.sections) : null;
  const sections = [];

  if (!want || want.has('summary')) {
    sections.push(utils.section('summary', buildSummary(dir), { title: 'Summary' }));
  }
  if (!want || want.has('endpoints')) {
    sections.push(utils.section('endpoints', scanRoutes(dir), { title: 'Endpoints' }));
  }
  if (!want || want.has('errors')) {
    sections.push(utils.section('errors', collectErrors(dir), { title: 'Error Codes' }));
  }

  return sections;
}
```

This is opt-in — runes that ignore `opts` continue to work unchanged. The CLI filters the returned sections regardless, so a rune that returns extra sections is still correct; `opts` is purely a performance hint.

### CLI flag

`crunes query` passes `--section` through to the rune via `opts`:

```bash
crunes query api --section endpoints        # opts.sections = ['endpoints']
crunes query api --section endpoints,errors # opts.sections = ['endpoints', 'errors']
crunes query api                            # opts.sections = null
```

### Core changes

`runRune` in `core.js` is updated to accept and forward opts:

```js
export async function runRune(dir, config, key, args, opts = {}) {
  // ...
  const result = await generate(dir, args, utils, opts);
  // ...
}
```

---

## Rune Authoring Guidance

For section targeting to be useful, rune authors should give sections stable, descriptive `kebab-case` names. Spaces in section names are not allowed — the token regex uses `[\w-]+` as a delimiter and a space would terminate the match early.

```js
return [
  utils.section('summary',   summaryData,   { title: 'Summary' }),
  utils.section('endpoints', endpointData,  { title: 'Endpoints' }),
  utils.section('errors',    errorData,     { title: 'Error Codes' }),
];
```

Users can then target `$api:endpoints`, `$api:errors`, or `$api:(endpoints, errors)` independently.

---

## ACI Skill Update

The `context-runes-query` skill should document the `:section` syntax:

```bash
crunes query api                          # all sections
crunes query api --section endpoints      # one section
crunes query api --section endpoints,errors  # multiple sections (CLI equivalent)
```

A `--section <names>` flag on `crunes query` mirrors the token syntax for CLI use, accepting a comma-separated list.
