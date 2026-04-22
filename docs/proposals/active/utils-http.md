---
tags:
  - proposed
---

# Proposal: `utils.http`

## Overview

Runes are currently limited to local project data. Many context gathering tasks require external data: fetching issue details from Jira/GitHub, pulling documentation from a wiki, or querying a status API. `utils.http` provides a sandboxed, permission-gated HTTP client for runes.

---

## API

A new `http` object is added to `utils`:

```js
await utils.http.fetch(url, options?)
// Returns: Promise<HttpResponse>
```

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

Plugins must explicitly declare which URLs and methods they are allowed to access. Permission strings follow the `http:[METHOD:]<pattern>` format:

```json
{
  "name": "my-plugin",
  "runes": {
    "jira-info": {
      "permissions": {
        "allow": [
          "http:GET:https://jira.company.com/rest/api/2/issue/*",
          "http:POST:https://analytics.internal.com/log"
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
- `http:GET:https://api.github.com/*` — Allow only GET requests to GitHub API.
- `http:*:https://staging.internal/*` — Allow any HTTP method to the staging server.
- `http:https://docs.local/*` — Implicitly allow only GET (default).

### Security
- **No recursive HTTP**: `utils.http` is not available to runes called via `utils.rune` unless the *calling* rune also has the required permissions.
- **Isolate safety**: The actual request is performed on the host side using Node's `fetch`. The isolate only sees the serialized response.
- **Local Runes**: Local runes (in `.context-runes/runes/`) have unrestricted HTTP access by default.

---

## Implementation Notes

1. **Host Side**: `src/api/utils/http.js` uses native `fetch` (Node 20+).
2. **Isolate Bridge**: `src/isolation/runner.js` exposes `$__utils_http_fetch` as an `ivm.Reference`.
3. **Permission Checker**: `src/isolation/permissions.js` is updated to handle `http:` prefixes.
4. **Timeout**: A hard limit is enforced on the host side to prevent runes from hanging the CLI.
5. **Redirects**: Followed automatically up to a limit (default 5).

---

## Use Cases

- **`github-issues`**: Fetch recent issues tagged with "context".
- **`api-spec`**: Pull the latest OpenAPI JSON from a remote staging server.
- **`internal-wiki`**: Search company documentation for specific project keywords.
