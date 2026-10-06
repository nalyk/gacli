# gacli command catalog

Every `gacli` subcommand, grouped by domain. One-line purpose + key flags +
what it returns. For full flag tables see the project's `help.md`.

`-p, --property <id>` (numeric GA4 property ID) is the most common global flag.
Property resolution: `--property` flag → `~/.gacli/config.json` `property` key
→ `GA4_PROPERTY_ID` env var.

## auth

| Command | Purpose | Returns |
|---|---|---|
| `gacli auth login [--client-secret-file <path>]` | OAuth 2.0 login (browser PKCE), saves tokens to `~/.gacli/oauth-tokens.json`. | Status line on stderr |
| `gacli auth logout [--revoke]` | Remove saved OAuth tokens. `--revoke` revokes at Google first. | Status line |
| `gacli auth login --scopes readonly\|edit\|chat` | Request read-only, read+write (default) or chat access (`report chat` needs `chat`). | Status line |
| `gacli auth status` | Show the active credential source (access token, OAuth, service account, ADC), token file, expiry, scopes. `-f json` for scripts. | Status lines / JSON |
| `gacli auth token` | Print an access token for the active credentials (stdout only). | Token string |

Agents/CI: export `GACLI_ACCESS_TOKEN` (wins over everything); with nothing configured gacli falls back to Google Application Default Credentials.

## config

| Command | Purpose | Returns |
|---|---|---|
| `gacli config set <key> <value>` | Set a config key. Whitelist: `credentials`, `property`, `format`, `noColor`, `verbose`, `oauthClientSecretFile`. | Confirmation row |
| `gacli config get <key>` | Read a config key. | Single-cell row |
| `gacli config list` | Show all config keys + descriptions. Stored in `~/.gacli/config.json`. | Table |

## Operations

Generated from the operation catalogue (`pnpm docs`). For flags, defaults and input/output
JSON Schema of any command run `gacli schema <command...>`; destructive commands need `--yes`.

<!-- BEGIN GENERATED: operations-index -->
### report

| Command | Category | Purpose |
|---|---|---|
| `gacli report run` | read | Run a standard GA4 report |
| `gacli report pivot` | read | Run a GA4 pivot report |
| `gacli report batch` | read | Run multiple GA4 reports in a single batch request |
| `gacli report batch-pivot` | read | Run multiple GA4 pivot reports in a single batch request |
| `gacli report realtime` | read | Run a GA4 realtime report |
| `gacli report cohort` | read | Run a GA4 cohort report |
| `gacli report funnel` | read | Run a GA4 funnel report |
| `gacli report quota` | read | Show the property quota snapshot (consumed / remaining per quota category) |
| `gacli report tasks create` | create | Create an asynchronous report task |
| `gacli report tasks get` | read | Get a report task (definition and processing state) |
| `gacli report tasks list` | read | List report tasks for a property |
| `gacli report tasks query` | read | Read the rows of a finished (ACTIVE) report task |
| `gacli report chat` | read | Ask a natural-language question about the property (GA4 Data API chat, alpha) |

### metadata

| Command | Category | Purpose |
|---|---|---|
| `gacli metadata get` | read | Get metadata (dimensions and metrics) for a GA4 property |
| `gacli metadata check-compatibility` | read | Check compatibility of dimensions and metrics |

### audience

| Command | Category | Purpose |
|---|---|---|
| `gacli audience export create` | create | Create an audience export |
| `gacli audience export get` | read | Get details of an audience export |
| `gacli audience export list` | read | List audience exports for a property |
| `gacli audience export query` | read | Query an audience export to retrieve audience members |
| `gacli audience recurring create` | create | Create a recurring audience list |
| `gacli audience recurring get` | read | Get details of a recurring audience list |
| `gacli audience recurring list` | read | List recurring audience lists for a property |

### admin

| Command | Category | Purpose |
|---|---|---|
| `gacli admin accounts list` | read | List all GA4 accounts accessible by the caller |
| `gacli admin accounts summaries` | read | List summaries of all accessible accounts and their properties |
| `gacli admin properties list` | read | List GA4 properties under an account |
| `gacli admin properties get` | read | Get a GA4 property |
| `gacli admin properties create` | create | Create a new GA4 property |
| `gacli admin properties update` | update | Update a GA4 property |
| `gacli admin properties delete` | delete | Delete a GA4 property |
| `gacli admin datastreams list` | read | List data streams for a property |
| `gacli admin datastreams get` | read | Get a data stream |
| `gacli admin datastreams create` | create | Create a data stream |
| `gacli admin datastreams update` | update | Update a data stream |
| `gacli admin datastreams delete` | delete | Delete a data stream |
| `gacli admin custom-dimensions list` | read | List custom dimensions for a property |
| `gacli admin custom-dimensions get` | read | Get a custom dimension |
| `gacli admin custom-dimensions create` | create | Create a custom dimension |
| `gacli admin custom-dimensions update` | update | Update a custom dimension |
| `gacli admin custom-dimensions archive` | delete | Archive a custom dimension |
| `gacli admin custom-metrics list` | read | List custom metrics for a property |
| `gacli admin custom-metrics get` | read | Get a custom metric |
| `gacli admin custom-metrics create` | create | Create a custom metric |
| `gacli admin custom-metrics update` | update | Update a custom metric |
| `gacli admin custom-metrics archive` | delete | Archive a custom metric |
| `gacli admin key-events list` | read | List key events for a property |
| `gacli admin key-events get` | read | Get a key event |
| `gacli admin key-events create` | create | Create a key event |
| `gacli admin key-events update` | update | Update a key event |
| `gacli admin key-events delete` | delete | Delete a key event |
| `gacli admin audiences list` | read | List audiences for a property |
| `gacli admin audiences get` | read | Get an audience |
| `gacli admin audiences create` | create | Create an audience |
| `gacli admin audiences update` | update | Update an audience |
| `gacli admin audiences archive` | delete | Archive an audience |
| `gacli admin access-bindings list` | read | List access bindings for an account or property |
| `gacli admin access-bindings get` | read | Get an access binding |
| `gacli admin access-bindings create` | create | Create an access binding |
| `gacli admin access-bindings update` | update | Update an access binding |
| `gacli admin access-bindings delete` | delete | Delete an access binding |
| `gacli admin firebase-links list` | read | List Firebase links for a property |
| `gacli admin firebase-links get` | read | Get a Firebase link |
| `gacli admin firebase-links create` | create | Create a Firebase link |
| `gacli admin firebase-links delete` | delete | Delete a Firebase link |
| `gacli admin google-ads-links list` | read | List Google Ads links for a property |
| `gacli admin google-ads-links get` | read | Get a Google Ads link |
| `gacli admin google-ads-links create` | create | Create a Google Ads link |
| `gacli admin google-ads-links update` | update | Update a Google Ads link |
| `gacli admin google-ads-links delete` | delete | Delete a Google Ads link |
| `gacli admin bigquery-links list` | read | List BigQuery links for a property |
| `gacli admin bigquery-links get` | read | Get a BigQuery link |
| `gacli admin bigquery-links create` | create | Create a BigQuery link |
| `gacli admin bigquery-links delete` | delete | Delete a BigQuery link |
| `gacli admin annotations list` | read | List reporting data annotations for a property |
| `gacli admin annotations create` | create | Create a reporting data annotation |
| `gacli admin annotations update` | update | Update a reporting data annotation |
| `gacli admin annotations delete` | delete | Delete a reporting data annotation |
| `gacli admin change-history search` | read | Search change history events for an account |
| `gacli admin access-report run` | read | Run a data access report (who read which data, when) |
| `gacli admin measurement-secrets list` | read | List Measurement Protocol secrets for a data stream |
| `gacli admin measurement-secrets create` | create | Create a Measurement Protocol secret |
| `gacli admin measurement-secrets delete` | delete | Delete a Measurement Protocol secret |
| `gacli admin data-retention get` | read | Get the data retention settings of a property |
| `gacli admin data-retention update` | update | Update the data retention settings of a property |
<!-- END GENERATED: operations-index -->

### Report flags worth knowing

Common optional flags across `report run/realtime/pivot`:
`--start-date`, `--end-date`, `--limit`, `--offset`, `--order-by` (variadic
`metric:NAME:desc` / `dimension:NAME:asc`), `--dimension-filter` (variadic
shorthand — see `filter-grammar.md`), `--metric-filter` (variadic shorthand),
`--keep-empty-rows`.

`report run` also takes `--return-property-quota` (quota in `metadata.propertyQuota`) and
`--conversion-spec <json>` (key-event attribution, v1alpha). JSON-valued flags accept inline JSON,
`@file` or `@-` (stdin).

### Anything else: `gacli api`

`gacli api <admin|admin.v1beta|data|data.v1alpha> <Method> --body '<json>'` calls any RPC by name
(e.g. `gacli api admin ListAccountSummaries`). Typos get suggestions; `Delete*`/`Archive*` need
`--yes`; `--dry-run` previews.

## explore

| Command | Purpose |
|---|---|
| `gacli explore` | Interactive REPL to browse the property's metric and dimension catalog (`list`, `search`, `show`, `custom`). Honors `-p`. |

## mcp

| Command | Purpose |
|---|---|
| `gacli mcp serve [--allow-write] [--allow-delete] [--http <port>]` | MCP server exposing every operation as a `ga_<command>` tool (read-only by default). Useful when an AI host prefers MCP — but skills shell out to gacli, so you rarely need this in skill workflows. |

## skills

| Command | Purpose |
|---|---|
| `gacli skills install [--agent ...] [--scope ...]` | Install this gacli skill into a target AI CLI (claude/codex/qwen/gemini/all). |
| `gacli skills uninstall [--agent ...] [--scope ...]` | Remove an installed gacli skill. |
| `gacli skills list` | Show all gacli installs across detected scopes. |
| `gacli skills path --agent <...>` | Print the install path the install command would use. |
| `gacli skills doctor` | Detect installed AI CLI agents, report which are on PATH. |
