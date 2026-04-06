---
tags:
  - completed
---

## Dependencies

- [[plugin-ecosystem]]

# Proposal: Rune Permission Model

## Overview

Plugin runes execute inside a **separate V8 isolate** — a completely independent JavaScript engine instance with its own heap, no shared globals, and no Node.js APIs. The rune's `generate` function sees only what the host explicitly injects via `utils`.

This is the same mechanism used by Cloudflare Workers and Figma plugins.

Local runes (paths starting with `.`) are fully trusted, run in-process normally.

---

## Core: `isolated-vm` + ESM Module API

[`isolated-vm`](https://github.com/laverdet/isolated-vm) exposes V8's isolate API. Each isolate is a completely separate V8 heap — no shared memory, no accessible prototype chain, no `globalThis` to escape through.

Runes are evaluated as ESM modules via `compileModule`, keeping the existing `export function generate(...)` API unchanged. The module resolver is the security boundary — every `import` statement is intercepted and decided by the host.

```
Host process (Node.js)
├── creates V8 Isolate (separate heap, memory-limited)
│   └── Context (blank — no globals except V8 built-ins)
│       ├── inject: utils   ← ivm.Reference — only door to I/O
│       └── inject: console ← stdout/stderr only
├── compileModule(runeSource)
│   └── instantiate(context, moduleResolver)
│             every import → resolver decides allow/deny
├── module.namespace.generate(dir, args, utils, opts)
└── receives serialised Section[] back
```

---

## Plugin-Owned Dependencies

Dependencies are declared in `plugin.json` — the single source of truth. `package.json` is **completely ignored** at all times, even if present in the plugin directory.

```json
{
  "format": "1",
  "name": "runes-node",
  "version": "1.0.0",
  "dependencies": {
    "semver": "^7.0.0",
    "date-fns": "^3.0.0"
  },
  "runes": { ... }
}
```

### Why `package.json` is ignored

`package.json` scripts (`postinstall`, `prepare`, `preinstall`) execute arbitrary code when `npm install` runs in a directory. A malicious plugin could put anything there. The CLI never runs `npm install` inside a plugin directory — it never reads `package.json` at all, even to check if it exists.

### Shared Module Store

Instead of building a content-addressable store from scratch, the CLI delegates to a detected package manager. The detection runs once at startup and is cached for the session.

**Detection order — first found wins:**

| Priority | Package manager | Store behaviour |
|----------|----------------|-----------------|
| 1 | **pnpm** | Content-addressable store + hardlinks — best deduplication |
| 2 | **bun** | Global install cache + hardlinks — fast, increasingly common |
| 3 | **npm** | Tarball extraction fallback — no deduplication, always available |

Yarn is intentionally excluded — Yarn Classic has no shared store, and Yarn Berry's PnP layout is incompatible with Node's standard module resolution used inside the isolate.

### Dependency installation

Dependencies are read from `plugin.json`. The CLI never operates inside the plugin source directory — it always targets the plugin's cache directory:

**pnpm:**
```bash
pnpm add <name>@<version> \
  --dir <plugin-cache-dir> \
  --ignore-scripts \
  --store-dir ~/.context-runes/store        ← owned by context-runes, separate from user's pnpm; consistent with global storage layout
```

**bun:**
```bash
bun add <name>@<version> \
  --cwd <plugin-cache-dir> \
  --ignore-scripts
  # bun uses its own global cache automatically (~/.bun/install/cache)
```

**npm fallback:**
```bash
npm pack <name>@<version> --pack-destination <tmp>
# extract tarball into <plugin-cache-dir>/node_modules/<name>/
```
No deduplication in fallback mode — each plugin gets its own copy.

### Package manager availability hint

If neither pnpm nor bun is found, a one-time hint is shown after install:

```
Hint: install pnpm or bun for smaller plugin storage.
  npm install -g pnpm
```

`crunes plugin install` flow:
```
1. clone / download plugin to cache dir
2. read plugin.json — ignore everything else in the directory
3. detect: pnpm → bun → npm
4. for each dependency in plugin.json:
     <pm> add <dep>@<ver> --ignore-scripts (targeting cache dir)
5. show permissions consent
6. register in plugins.json
```

`crunes store prune` cleans orphaned packages from the pnpm/bun store that no installed plugin references.

### npm distribution

Plugin authors who publish to npm can include a `package.json` for npm tooling — the CLI simply never touches it. Authors are responsible for keeping it consistent with `plugin.json` if they choose to maintain one. `crunes plugin pack` is available to generate it:

```bash
crunes plugin pack   # generates package.json from plugin.json for npm publish
npm publish
```

---

## Module Resolver — Allow First, Deny as Last Guard

The resolver follows a strict priority order. The deny list is the **last guard** — it exists to provide clear, actionable messages for known dangerous modules, not as the primary security mechanism.

```
import specifier
  │
  ├── 1. Relative / absolute path → ALLOW (plugin's own files)
  │
  ├── 2. Safe Node built-in (allow list) → ALLOW
  │
  ├── 3. Declared module permission + in plugin node_modules → ALLOW
  │        (module:semver in permissions AND semver in plugin's package.json)
  │
  ├── 4. Known dangerous built-in (deny list) → DENY with message + utils alternative
  │        (last guard — documents WHY and points to the correct utils method)
  │
  └── 5. Everything else → DENY (zero-trust default)
             unknown packages, undeclared deps, future built-ins — all blocked
```

### Allow list — safe Node built-ins (step 2)

Always available, no declaration needed. Pure computation, no I/O:

`node:path`, `node:url`, `node:util`, `node:buffer`, `node:crypto`, `node:events`, `node:string_decoder`, `node:querystring`, `node:assert`, `node:punycode`

### Deny list — last guard (step 4)

Reached only if steps 1–3 did not match. Provides human-readable messages for known dangerous modules:

| Module | Message |
|--------|---------|
| `node:fs`, `node:fs/promises` | Blocked — use `utils.fs` instead |
| `node:child_process` | Blocked — use `utils.shell` instead |
| `node:net` | Blocked — direct TCP not permitted |
| `node:http`, `node:https` | Blocked — use `utils.http` (coming soon) |
| `node:os` | Blocked — OS access not permitted |
| `node:vm` | Blocked — VM access not permitted |
| `node:worker_threads` | Blocked — not permitted in plugin runes |
| `node:inspector` | Blocked — not permitted |

Without the deny list, these would still be denied at step 5 (zero-trust default). The deny list exists purely to give authors a useful error message rather than a silent "module not found".

### Pure utility modules — just work (step 3)

Modules like `semver`, `date-fns`, `lodash`, `zod` are pure JavaScript. Their internal `import` statements only reference each other or safe Node built-ins (step 2). They load cleanly inside the isolate with no security concerns.

Modules that internally depend on `node:http` or `node:fs` (e.g. `axios`, `got`) fail at step 4 or 5 when their own transitive imports are resolved — they self-exclude without any special handling.

---

## Module Resolver Implementation

```js
async function moduleResolver(specifier, context) {
  // Step 1 — relative / absolute: plugin's own files
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const source = await fs.readFile(resolve(pluginDir, specifier), 'utf8');
    return compileAndCacheModule(isolate, specifier, source);
  }

  // Step 2 — safe Node built-ins
  if (ALLOW_BUILTINS.has(normalise(specifier))) {
    return getPrecompiledBuiltin(isolate, specifier); // pre-compiled for the isolate
  }

  // Step 3 — in effective allow (a Set<string>) AND declared in plugin.json dependencies
  //           effectiveAllow = new Set(projectConfig[rune]?.allow ?? pluginJson[rune].allow)
  if (effectiveAllow.has(specifier) && specifier in pluginJsonDependencies) {
    const modPath = resolveFrom(pluginNodeModules, specifier); // plugin-local only
    const source  = await fs.readFile(modPath, 'utf8');
    return compileAndCacheModule(isolate, specifier, source);
  }

  // Step 4 — deny list (last guard — effective.deny = plugin.deny ∪ project.deny, always combined)
  const denyMsg = DENY_BUILTINS.get(normalise(specifier)) ?? effectiveDeny.get(specifier);
  if (denyMsg) throw new Error(`PermissionError: '${specifier}' — ${denyMsg}`);

  // Step 5 — zero-trust default
  throw new Error(
    `PermissionError: '${specifier}' is not available.\n` +
    `Add "module:${specifier}" to allow in permissions and "${specifier}" to dependencies.`
  );
}
```

---

## Permission Declaration Format

Permissions use an `allow`/`deny` object inside each rune entry — both are flat arrays of `"capability:pattern"` strings, one per line for clean git diffs.

- **`allow`** — what the rune explicitly needs. Checked at step 3 of the resolver.
- **`deny`** — what the rune explicitly declares it should never use. Acts as the last guard (step 4) alongside the built-in deny list. Plugin authors use this defensively to constrain their own rune against unintended future changes.

```json
{
  "format": "1",
  "name": "runes-node",
  "runes": {
    "git": {
      "name": "Git Status",
      "permissions": {
        "allow": [
          "shell:git log *",
          "shell:git status",
          "shell:git branch *"
        ],
        "deny": [
          "shell:rm *",
          "shell:curl *",
          "network:*"
        ]
      }
    },
    "deps": {
      "name": "Dependencies",
      "permissions": {
        "allow": [
          "fs.read:package.json",
          "fs.read:package-lock.json",
          "shell:npm list *",
          "module:semver"
        ],
        "deny": [
          "shell:npm install *",
          "shell:npm publish *"
        ]
      }
    }
  }
}
```

Git diff when adding to allow — one line:
```diff
       "allow": [
         "shell:git log *",
+        "shell:git diff *",
         "shell:git status"
       ]
```

`module:` entries in `allow` must also appear in the plugin's `plugin.json` `dependencies` field. `package.json` is not consulted — it exists only for npm tooling compatibility and carries no authority in the permission system.

### Capability catalogue

| Capability | Pattern | Example |
|------------|---------|---------|
| `shell` | Command glob | `shell:git log *` |
| `fs.read` | Path relative to project root | `fs.read:src/**` |
| `fs.glob` | Glob pattern string | `fs.glob:**/*.ts` |
| `network` | Hostname glob | `network:registry.npmjs.org` |
| `module` | Exact package name | `module:semver` |

---

## Project-Level Whitelisting

`.context-runes/config.json` narrows permissions per rune using the same `allow`/`deny` structure, fully overriding the plugin declaration for that rune:

```json
{
  "format": "1",
  "plugins": ["runes-node"],
  "permissions": {
    "runes-node:git": {
      "allow": [
        "shell:git log --oneline *",
        "shell:git status"
      ],
      "deny": [
        "shell:git push *",
        "shell:git commit *"
      ]
    }
  }
}
```

**Effective permissions follow different rules for `allow` and `deny`:**

- **`allow` replaces** — project `allow` fully replaces the plugin's `allow`. The project owner lists exactly what is permitted; nothing else.
- **`deny` combines** — project `deny` is merged with the plugin's `deny`. A denial at any level is permanent; it cannot be removed by a higher level.

```
effective.allow = projectConfig[rune].allow ?? pluginJson[rune].allow
effective.deny  = pluginJson[rune].deny ∪ projectConfig[rune].deny
```

A request is permitted only if it matches `effective.allow` AND does not match `effective.deny`.

---

## User Consent at Install Time

```
runes-node requests the following permissions:

  git     shell:git log *
          shell:git status
          shell:git branch *

  deps    fs.read:package.json
          fs.read:package-lock.json
          shell:npm list *
          module:semver

Allow? (y/N)
```

Stored in `plugins/plugins.json`. New patterns on update trigger re-consent.

---

## Enforced Limits

| Limit | Default | Override in config |
|-------|---------|-------------------|
| Memory per isolate | 128 MB | `isolateMemoryMb` |
| CPU timeout | 30 s | `isolateTimeoutMs` |

---

## Trust Levels

| Rune source | Execution | Isolation |
|-------------|-----------|-----------|
| Local (`.`) | In-process Node.js | None — fully trusted |
| Plugin | `isolated-vm` ESM module | Separate heap, plugin-owned deps, resolver-gated imports |
