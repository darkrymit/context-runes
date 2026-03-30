# context-runes

A Claude Code plugin that intercepts user prompts and injects dynamic project context using inline `$key(args)` tokens. 

By moving context definitions out of the plugin and into your specific projects, `context-runes` acts as a generic engine to run any custom enricher you define.

## How It Works

A `UserPromptSubmit` hook runs `scripts/enrich.js` before each prompt reaches the LLM. The script scans for `$key` or `$key(arg1, arg2)` tokens, looks up the mapping in the project's local config, calls the matching enricher module, and appends the result as XML-tagged `additionalContext`.

## Setup & Configuration

Since enrichers are dynamic and project-specific, you define them in the target project, not in the plugin itself. 

1. Create a `.context-runes/config.json` file in your project root:
   ```json
   {
     "enrichers": {
       "docs": ".context-runes/enrichers/docs.js",
       "api": ".context-runes/enrichers/api-docs.js"
     }
   }
   ```
2. When a user types `$docs(setup)` in their prompt, the plugin will execute `.context-runes/enrichers/docs.js` from the project root, passing `["setup"]` as the arguments.

## Installation

Install the plugin directly from the GitHub repository via your local marketplace.

```shell
/plugin marketplace add https://github.com/darkrymit/context-runes
/plugin install context-runes
```

Claude Code will auto-enable it via `enabledPlugins` in `.claude/settings.json`. Run `/reload-plugins` to activate in the current session without restarting.

## Writing Custom Enrichers

An enricher is a standard Node module in your project that returns typed data (`list`, `tree`, or `sections`) for the plugin's internal `render.js` to format.

1. Create your script (e.g., `.context-runes/enrichers/docs.js`).
2. Implement `{ sectionTag, generate(projectRoot, args) }`:

```javascript
module.exports = {
  // Optional: The XML tag to wrap the injected text (defaults to the token key)
  sectionTag: 'docs',
  
  // Required: Returns a data object that render.js can parse
  generate: (projectRoot, args) => {
    // Example: returning a list format
    return {
      type: 'list',
      items: [
        { name: 'setup', description: 'Install via npm install' }
      ]
    };
  }
};
```

## Testing

You can test your project's enrichers directly via the CLI without invoking Claude. From your project root:

```bash
# Test the token parser and XML output directly
echo '{"prompt": "Review $docs(setup)"}' | node <path-to-plugin>/scripts/enrich.js

# Query an enricher manually via the built-in tool
node <path-to-plugin>/scripts/query.js docs setup
```

Expected output for `enrich.js` is a JSON object with a `hookSpecificOutput.additionalContext` field containing the injected XML sections.

## Plugin Structure

```text
context-runes/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── hooks/
│   └── hooks.json              # UserPromptSubmit hook registration
├── scripts/
│   ├── enrich.js               # Token parser and hook entry point
│   ├── query.js                # CLI tool for direct queries
│   └── render.js               # Renders 'list', 'tree', or 'sections' into strings
├── skills/
│   └── query-context-runes/
│       └── SKILL.md            # Skill for querying available runes
├── LICENSE
└── README.md
```