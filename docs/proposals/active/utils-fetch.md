---
tags:
  - proposed
---

# Proposal: Remote Data Fetching (`utils.fetch`)

## Overview

Runes often need to enrich project context with external data — such as GitHub issues, Jira tickets, or package registry metadata. 

This proposal introduces **`utils.fetch`**, a permission-gated HTTP client that mirrors the standard Web Fetch API.

---

## API

The utility is exposed as `utils.fetch`, following the standard signature:

```js
const response = await utils.fetch(url, options?)
```

- **`url`**: The absolute URL to fetch.
- **`options`**: (Optional) Object containing `method`, `headers`, `body`, etc.

### `HttpResponse`
- `ok`: boolean
- `status`: number
- `statusText`: string
- `headers`: Record<string, string>
- `text()`: Promise<string>
- `json()`: Promise<any>
- `arrayBuffer()`: Promise<ArrayBuffer>

### `options`
- `method`: `'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'` (default: `GET`)
- `headers`: Record<string, string>
- `body`: string | Buffer | ArrayBuffer
- `timeout`: number (default: 30000ms)

---

## Permissions

Plugins must explicitly declare which URLs and methods they are allowed to access. Permission strings follow the `fetch:[METHOD:]<pattern>` format:

```json
{
  "name": "my-plugin",
  "runes": {
    "jira-info": {
      "permissions": {
        "allow": [
          "fetch:GET:https://jira.company.com/rest/api/2/issue/*",
          "fetch:POST:https://analytics.internal.com/log"
        ]
      }
    }
  }
}
```

### Pattern Matching
- **Method**: Optional. If omitted, `GET` is assumed. Use `*` to allow any method.
- **URL**: Patterns are matched against the full URL using glob-like logic (via `picomatch`).
- Protocol must be specified (`https://` or `http://`).
- Port matching is supported (`https://localhost:8080/*`).

### Examples
- `fetch:GET:https://api.github.com/*` — Allow only GET requests to GitHub API.
- `fetch:*:https://staging.internal/*` — Allow any HTTP method to the staging server.
- `fetch:https://docs.local/*` — Implicitly allow only GET (default).

### Security
- **No recursive HTTP**: `utils.fetch` is not available to runes called via `utils.rune` unless the *calling* rune also has the required permissions.
- **Isolate safety**: The actual request is performed on the host side using Node's `fetch`. The isolate only sees the serialized response.
- **Local Runes**: Local runes go through the same `makePermissionChecker` pipeline as plugin runes and must declare `fetch:` permissions in their `config.json` entry.

---

## Implementation Notes

1. **Host Side**: `src/api/utils/fetch.js` uses native `fetch` (Node 20+).
2. **Isolate Bridge**: `src/isolation/runner.js` exposes `$__utils_fetch` as an `ivm.Reference`.
3. **Permission Checker**: `src/isolation/permissions.js` is updated to handle `fetch:` prefixes.
4. **Timeout**: A hard limit is enforced on the host side to prevent runes from hanging the CLI.
5. **Redirects**: Followed automatically up to a limit (default 5).

---

## Use Cases

- **`github-issues`**: Fetch recent issues tagged with "context".
- **`api-spec`**: Pull the latest OpenAPI JSON from a remote staging server.
- **`internal-wiki`**: Search company documentation for specific project keywords.
