---
title: utils.shell
status: proposal
depends: []
---

# Proposal: `utils.shell` — Cross-Platform Shell Helper

## Overview

Rune authors can already call `child_process.spawnSync` directly, but doing so correctly on Windows requires non-obvious setup: `shell: true` for PATH resolution, `cmd.exe` quoting rules, CRLF in output, and PATHEXT handling. Without a shared helper, each rune author reimplements this — or gets it wrong and ships a rune that silently breaks on Windows.

`utils.shell` abstracts cross-platform shell execution behind a clean, consistent API that works correctly on Windows, macOS, and Linux without any author effort.

---

## API

```js
// Simple — returns trimmed stdout, throws on non-zero exit
const log = await utils.shell('git log --oneline -10');

// With options — full control
const { stdout, stderr, exitCode } = await utils.shell('npm test', {
  throw: false,      // don't throw on non-zero exit (default: true)
  trim: false,       // don't trim output (default: true)
  env: { FOO: '1' }, // additional env vars merged with process.env
  timeout: 5000,     // ms, default: 30000
});
```

### Return value

When called with no options (or `throw: true`): returns `stdout` as a string directly.

When called with `throw: false`: returns `{ stdout, stderr, exitCode }`.

---

## Cross-Platform Behaviour

| Concern | Handled by `utils.shell` |
|---------|------------------------|
| `shell: true` on Windows | Always set — ensures PATH is resolved via `cmd.exe` / `sh` |
| CRLF line endings | Output is normalised to `\n` before returning |
| ANSI escape codes | Stripped from output — rune output targets AI context, not a terminal |
| `cwd` | Always set to `dir` (project root) — no need to pass manually |
| Timeout | Default 30s, configurable — never hangs indefinitely |
| Non-zero exit | Throws `ShellError` with `{ message, stdout, stderr, exitCode }` by default |

---

## Error Handling

On non-zero exit (with default `throw: true`):

```js
throw new ShellError(`Command failed (exit ${exitCode}): git log --oneline -10`, {
  stdout,
  stderr,
  exitCode,
});
```

Rune authors can catch selectively:

```js
import { ShellError } from '@darkrymit/context-runes/utils'; // re-exported for instanceof checks

try {
  const result = await utils.shell('git log --oneline -10');
} catch (e) {
  if (e instanceof ShellError && e.exitCode === 128) {
    return utils.section('git', { type: 'markdown', content: '_Not a git repository._' });
  }
  throw e;
}
```

---

## Implementation Notes

- Implemented as `async` wrapping `child_process.spawn` (not `spawnSync`) so it does not block the event loop for slow commands.
- `shell: true` is always set — required on Windows for PATH resolution; harmless on Unix.
- CRLF normalisation: `stdout.replace(/\r\n/g, '\n')`.
- ANSI stripping: simple regex `stdout.replace(/\x1b\[[0-9;]*m/g, '')` — no extra dependency.
- `cwd` defaults to `dir` (the project root passed to `generate`), not `process.cwd()`.
- `utils.shell` is added to `createUtils(dir, ...)` in `core.js` — `dir` is closed over so authors never need to pass it.

---

## Usage Examples

```js
// git log — works on Windows and Unix
export function generate(dir, args, utils) {
  const log = await utils.shell('git log --oneline -20');
  return utils.section('commits', {
    type: 'markdown',
    content: utils.md.codeBlock(log, 'text'),
  });
}

// npm list — graceful fallback if not a Node project
export function generate(dir, args, utils) {
  const { stdout, exitCode } = await utils.shell('npm list --depth=0', { throw: false });
  if (exitCode !== 0) return [];
  return utils.section('deps', { type: 'markdown', content: utils.md.codeBlock(stdout) });
}
```
