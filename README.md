# context-runes

New session. The AI runs `find . -type f` *again*. Your `CLAUDE.md` has a file tree from three weeks ago. You're pasting the exact same API reference into your prompt for the fifth time today.

**context-runes** fixes this. It lets you define **enrichers**—small, project-local scripts that generate context on demand. 

Query them from the CLI, pipe them into scripts, or let a native integration inject them automatically into your AI tool. No stale snapshots. No repeated bash commands. No bloated config files.

## How It Works

An enricher is simply a JavaScript module living inside your project:

```js
// .context-runes/enrichers/structure.js
export function generate(dir, args, utils) {
  // Build and return your live file tree, docs, or API surface
  // This executes on demand, ensuring 100% up-to-date context
  return generateLiveProjectTree(dir); 
}
```

You can query it directly from the CLI with optional arguments:

```bash
crunes query structure
crunes query api v2
```

If your AI tool supports a native integration (like our Agentic Coder Interface), enrichers are resolved automatically and injected directly into the model's context.

## Why Context Runes?

You might be wondering why you can't just use the tools you already have. Here is where standard approaches fall short:

* **Static files (`CLAUDE.md`, `AGENTS.md`) go stale.** Your architecture today isn't your architecture next week. Plus, dumping your entire project structure into a static file wastes tokens on tasks that don't need it. Enrichers are dynamic and parameterized (e.g., `v2` vs `v3`).
* **Skills describe behavior, not data.** A skill can tell an AI *how* to explore a project, but an enricher gives it the exact, current state immediately. (Pro tip: The best pattern is a skill that invokes an enricher).
* **Plugins and hooks lock you in.** Generic hooks are usually tool-specific plumbing. A Claude Code hook does nothing for you in a standard terminal, a CI pipeline, or a different AI assistant. Context-runes keeps the logic in your project, versioned with your code, usable anywhere.

## Ecosystem

Context-runes is split into modular packages so you only use what you need:

| Repository | Description |
|---|---|
| [context-runes-cli](https://github.com/darkrymit/context-runes-cli) | Core CLI (`crunes`) — init, create, query, and validate enrichers. Works standalone in any environment. |
| [context-runes-aci](https://github.com/darkrymit/context-runes-aci) | Agentic Coder Interface — native integrations built on top of the CLI (Claude Code integration available; more planned). |

## License

MIT — [Tamerlan Hurbanov (DarkRymit)](https://github.com/darkrymit)