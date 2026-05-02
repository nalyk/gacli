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
| `gacli auth status` | Show active auth method (OAuth vs service account), token file, expiry, scopes. | Single-row table |

## config

| Command | Purpose | Returns |
|---|---|---|
| `gacli config set <key> <value>` | Set a config key. Whitelist: `credentials`, `property`, `format`, `noColor`, `verbose`, `oauthClientSecretFile`. | Confirmation row |
| `gacli config get <key>` | Read a config key. | Single-cell row |
| `gacli config list` | Show all config keys + descriptions. Stored in `~/.gacli/config.json`. | Table |

## report

The 7 report types — every "give me data" question maps here.

| Command | Purpose | Required flags | Returns |
|---|---|---|---|
| `gacli report run` | Standard report. Workhorse. | `-m <metrics...>` | `ReportData` (headers + rows) |
| `gacli report batch --requests <path>` | Multiple reports in one call. JSON file = array of report request objects. | `--requests` | Array of `ReportData` |
| `gacli report pivot` | Cross-tabulation. | `-m`, `-d`, `--pivots <json>` | Pivoted `ReportData` |
| `gacli report batch-pivot --requests <path>` | Multiple pivots in one call. | `--requests` | Array |
| `gacli report realtime` | Last 30 minutes. Date flags ignored. | `-m` | `ReportData` |
| `gacli report funnel` | Funnel exploration. | `--steps <json>` | `ReportData` (one row per step) |
| `gacli report cohort` | Cohort analysis. | `-m`, `--cohorts <json>` | `ReportData` |

Common optional flags across `report run/realtime/pivot`:
`--start-date`, `--end-date`, `--limit`, `--offset`, `--order-by` (variadic
`metric:NAME:desc` / `dimension:NAME:asc`), `--dimension-filter` (variadic
shorthand — see `filter-grammar.md`), `--metric-filter` (variadic shorthand),
`--keep-empty-rows`.

## metadata

| Command | Purpose | Returns |
|---|---|---|
| `gacli metadata get [--type all\|dims\|metrics] [--search <term>] [--custom-only]` | List dimensions and metrics available on the property. | Table of name/uiName/scope/description |
| `gacli metadata check-compatibility -m <m...> -d <d...>` | Validate that a metric+dimension combination is queryable. Run BEFORE building exotic report combos. | Compatible/incompatible per pair |

## audience

| Command | Purpose | Returns |
|---|---|---|
| `gacli audience export create --audience <resourceName> [--dimensions <d...>]` | One-time export of an audience. Returns operation name; poll with `get`. | Operation row |
| `gacli audience export get --name <resourceName>` | Status of an export. | Status row |
| `gacli audience export list` | All exports for `-p` property. | Table |
| `gacli audience export query --name <resourceName> [--limit] [--offset]` | Query rows from a completed export. | `ReportData` |
| `gacli audience recurring create --audience <name> [--dimensions <d...>]` | Create a recurring audience list. | Resource row |
| `gacli audience recurring get --name <resourceName>` | Get status. | Row |
| `gacli audience recurring list` | List recurring lists for `-p` property. | Table |

## admin (10 sub-domains)

All admin operations go through the GA4 Admin API. Most need the `analytics.edit`
scope. `--name` ALWAYS takes the full resource name (e.g.
`properties/123/keyEvents/456`), not a numeric ID.

### admin accounts

| Command | Purpose |
|---|---|
| `gacli admin accounts list` | All accounts the active credentials can see |

### admin properties

| Command | Purpose | Required |
|---|---|---|
| `list --account <id>` | Properties under an account | `--account` |
| `get` (uses `-p`) | Get one property | — |
| `create --account --display-name --time-zone [--currency-code] [--industry-category]` | Create | listed |
| `update` (uses `-p`) | Patch fields | — |
| `delete` (uses `-p`) | Delete | — |

### admin datastreams

`list` (uses `-p`), `get --name`, `create --type --display-name [--uri\|--package-name\|--bundle-id]` (uses `-p`), `update --name --display-name`, `delete --name`.
`--type`: `WEB_DATA_STREAM`, `ANDROID_APP_DATA_STREAM`, `IOS_APP_DATA_STREAM`.

### admin custom-dimensions

`list` (uses `-p`), `get --name`, `create --parameter-name --display-name --scope [--description]` (uses `-p`), `update --name [--display-name] [--description]`, `archive --name`.
`--scope`: `EVENT`, `USER`, or `ITEM`. **Scope is immutable after create.**

### admin custom-metrics

`list` (uses `-p`), `get --name`, `create --parameter-name --display-name --scope --measurement-unit [--description]` (uses `-p`), `update --name [--display-name] [--description] [--measurement-unit]`, `archive --name`.
`--scope`: `EVENT` only. `--measurement-unit`: STANDARD, CURRENCY, FEET, METERS, KILOMETERS, MILES, MILLISECONDS, SECONDS, MINUTES, HOURS.

### admin key-events

`list` (uses `-p`), `get --name`, `create --event-name [--counting-method] [--default-value] [--currency-code]` (uses `-p`), `update --name [...]`, `delete --name`.
`--counting-method`: `ONCE_PER_EVENT` (default) or `ONCE_PER_SESSION`.

### admin audiences

`list` (uses `-p`), `get --name`, `create --display-name [--description] [--membership-duration-days] [--filter-clauses <json>]` (uses `-p`), `update --name [...]`, `archive --name`.

### admin access-bindings

`list --parent <p>`, `get --name`, `create --parent --user --roles <r...>`, `update --name --roles <r...>`, `delete --name`.
`--parent`: account or property resource name (`accounts/123` or `properties/456`). `--roles` variadic, e.g. `--roles predefinedRoles/viewer predefinedRoles/editor`.

### admin firebase-links

`list` (uses `-p`), `get --name`, `create --project <projectId>` (uses `-p`), `delete --name`.

### admin google-ads-links

`list` (uses `-p`), `get --name`, `create --customer-id <id>` (uses `-p`), `update --name --ads-personalization-enabled <true|false>`, `delete --name`.

### admin bigquery-links

`list` (uses `-p`), `get --name`, `create --project <projectId> [--daily-export-enabled true] [--streaming-export-enabled false]` (uses `-p`), `delete --name`.

## explore

| Command | Purpose |
|---|---|
| `gacli explore` | Interactive REPL for ad-hoc GA4 queries. Honors `-p`. |

## mcp

| Command | Purpose |
|---|---|
| `gacli mcp serve` | Stdio MCP server exposing 4 typed tools (`gacli_report_run`, `gacli_report_realtime`, `gacli_metadata`, `gacli_check_compatibility`). Useful when an AI host CLI prefers MCP — but skills shell out to gacli, so you rarely need this in skill workflows. |

## skills

| Command | Purpose |
|---|---|
| `gacli skills install [--agent ...] [--scope ...]` | Install this gacli skill into a target AI CLI (claude/codex/qwen/gemini/all). |
| `gacli skills uninstall [--agent ...] [--scope ...]` | Remove an installed gacli skill. |
| `gacli skills list` | Show all gacli installs across detected scopes. |
| `gacli skills path --agent <...>` | Print the install path the install command would use. |
| `gacli skills doctor` | Detect installed AI CLI agents, report which are on PATH. |
