# Auth setup

gacli supports three authentication paths, resolved in this order (first
match wins, cached in process memory):

## 1. OAuth tokens (recommended for individual users)

Set up:
```bash
# One-time: download an OAuth client-secret JSON from the GCP Console.
# Then:
gacli auth login --client-secret-file path/to/client-secret.json
```

This launches a browser, runs the PKCE flow, and saves tokens to
`~/.gacli/oauth-tokens.json`. The token-refresh listener auto-persists new
tokens when the access token expires (~1h).

Required scopes: `analytics.readonly` (everything in `report`, `metadata`,
`audience`) plus `analytics.edit` (everything in `admin`).

After successful login, `gacli auth status` shows:
```
Active method: OAuth
Token file: ~/.gacli/oauth-tokens.json
Expires: 2026-05-02T11:30:00Z
Scopes: analytics.readonly, analytics.edit
```

## 2. Service account from config

Set up:
```bash
# After downloading a service-account JSON from a GCP project that has
# Analytics Admin/Data API enabled and the SA email added to the GA4
# property as a viewer/editor:
gacli config set credentials /path/to/service-account.json
```

`gacli auth status` will then show `Active method: Service account
(config)`.

## 3. Service account from env var

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Lowest precedence. Useful in CI where the env var is the standard
credential pattern.

## ~/.gacli/ layout

```
~/.gacli/
├── config.json           # gacli config (property, format, credentials path, etc.)
└── oauth-tokens.json     # OAuth tokens (only if auth login was used)
```

## Common failure messages and what they mean

| Message | Cause | Fix |
|---|---|---|
| `Property ID is required. Use -p <id>...` | No property resolved (no flag, no config, no env). | `gacli admin properties list --account <id>` to find one, then `gacli config set property <id>` (default) or pass `-p` per call. |
| `Unauthenticated: ...` (exit 16) | Token expired and refresh failed, or no auth path set up. | `gacli auth login` (OAuth) or check `gacli config get credentials` (SA). |
| `Permission denied: ...` (exit 7) | Auth works but the principal lacks access to the property. | Add the OAuth user / SA email to the GA4 property at the right role (Viewer for read, Editor for write). |
| `Invalid argument: ...` (exit 3) | Malformed request. Most often: invalid dimension/metric name, bad date, scope mismatch. | Run `gacli metadata get` to confirm names; run `gacli metadata check-compatibility` for combos. |
| `Resource exhausted (quota): ...` (exit 8) | API quota hit (Data API daily token quota or per-minute QPS). | Back off, retry in a few seconds; for sustained work, request quota increase in GCP Console. |

## After `gacli auth login`

The auth resolution cache is reset on the same process, but a long-running
process holding the old token won't pick up the new login. New shell
sessions always read fresh.
