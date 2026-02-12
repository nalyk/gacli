# gacli - Command Reference for AI

Google Analytics 4 CLI. Covers Data API (reports, realtime, funnels, cohorts, audience exports) and Admin API (accounts, properties, streams, custom dims/metrics, key events, audiences, integrations).

## Global options (apply to ALL commands)

```
-p, --property <id>       GA4 property ID (numeric, e.g. 371981488)
-f, --format <format>     Output: table|json|csv|chart (default: table)
-o, --output <file>       Write to file instead of stdout
--no-color                Disable colors
-v, --verbose             Debug logging
```

Property resolution: --property flag > config.property > GA4_PROPERTY_ID env var.

---

## auth login

Interactive OAuth 2.0 authentication via browser consent flow with PKCE.

```
gacli auth login [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--client-secret-file <path>` | no | Path to OAuth client secret JSON file (downloaded from GCP Console). Falls back to `oauthClientSecretFile` config key. |

Starts a loopback HTTP server, prints an auth URL, waits for the browser callback (120s timeout), exchanges the code for tokens, and saves them to `~/.gacli/oauth-tokens.json`.

## auth logout

Remove saved OAuth tokens.

```
gacli auth logout [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--revoke` | no | Revoke the token at Google before deleting locally |

## auth status

Show the active authentication method and details.

```
gacli auth status
```

Displays whether OAuth or service account is active, token file path, expiry, and scopes.

---

## report run

Standard GA4 report. Most-used command.

```
gacli report run [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `-m, --metrics <m...>` | YES | Metrics (variadic). E.g. `-m activeUsers -m sessions` |
| `-d, --dimensions <d...>` | no | Dimensions (variadic). E.g. `-d date -d country` |
| `--start-date <date>` | no | Start date. Default `7daysAgo`. Accepts: YYYY-MM-DD, NdaysAgo, today, yesterday |
| `--end-date <date>` | no | End date. Default `today` |
| `--limit <n>` | no | Max rows (1-100000) |
| `--offset <n>` | no | Row offset for pagination |
| `--order-by <spec...>` | no | Ordering. Format: `metric:metricName:desc` or `dimension:dimName:asc` |
| `--dimension-filter <f...>` | no | Dimension filters. Shorthand: `field==value`, `field!=val`, `field=~regex`, `field>N` |
| `--metric-filter <f...>` | no | Metric filters. Same shorthand syntax |
| `--keep-empty-rows` | no | Include rows with all-zero metrics |

Example: `gacli report run -p 371981488 -m sessions -m activeUsers -d date -d country --start-date 30daysAgo --limit 50 --order-by "metric:sessions:desc"`

## report batch

Run multiple reports in one API call.

```
gacli report batch --requests <path>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--requests <path>` | YES | Path to JSON file with array of report request objects |

JSON file format: array of objects with same structure as runReport params (dateRanges, dimensions, metrics, etc.).

## report pivot

Pivot report with cross-tabulation.

```
gacli report pivot [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `-m, --metrics <m...>` | YES | Metrics |
| `-d, --dimensions <d...>` | YES | Dimensions |
| `--pivots <json>` | YES | Pivot definitions as JSON string. Format: `[{"fieldNames":["browser"],"limit":5}]` |
| `--start-date <date>` | no | Default `7daysAgo` |
| `--end-date <date>` | no | Default `today` |
| `--dimension-filter <f...>` | no | Dimension filters |
| `--metric-filter <f...>` | no | Metric filters |

## report batch-pivot

Multiple pivot reports in one call.

```
gacli report batch-pivot --requests <path>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--requests <path>` | YES | Path to JSON file with array of pivot report request objects |

## report realtime

Real-time data (last 30 minutes).

```
gacli report realtime [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `-m, --metrics <m...>` | YES | Metrics |
| `-d, --dimensions <d...>` | no | Dimensions |
| `--minute-ranges <json>` | no | JSON: `[{"startMinutesAgo":10,"endMinutesAgo":0}]` (max 29 min ago) |
| `--dimension-filter <f...>` | no | Dimension filters |
| `--metric-filter <f...>` | no | Metric filters |
| `--limit <n>` | no | Max rows |

## report funnel

Funnel exploration report.

```
gacli report funnel [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--steps <json>` | YES | Funnel steps as JSON: `[{"name":"Step 1","filterExpression":{...}}]` |
| `--open-funnel` | no | Open funnel (users enter at any step) |
| `--funnel-breakdown <dim>` | no | Dimension name for breakdown |
| `--start-date <date>` | no | Default `7daysAgo` |
| `--end-date <date>` | no | Default `today` |

## report cohort

Cohort analysis report.

```
gacli report cohort [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `-m, --metrics <m...>` | YES | Metrics |
| `--cohorts <json>` | YES | Cohort defs as JSON: `[{"name":"cohort1","dimension":"firstSessionDate","dateRange":{"startDate":"2025-01-01","endDate":"2025-01-07"}}]` |
| `--cohort-granularity <g>` | no | DAILY, WEEKLY, MONTHLY (default: DAILY) |
| `--end-offset <n>` | no | End offset (default: 5) |
| `--start-offset <n>` | no | Start offset |
| `-d, --dimensions <d...>` | no | Extra dimensions |
| `--accumulate` | no | Accumulate data over time |

---

## metadata get

List available dimensions and metrics for a property.

```
gacli metadata get [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--type <type>` | no | `dims`, `metrics`, or `all` (default: `all`) |
| `--search <term>` | no | Filter by apiName, uiName, or description |
| `--custom-only` | no | Show only custom definitions |

Requires `-p` property ID.

## metadata check-compatibility

Check if dimensions and metrics can be used together in a report.

```
gacli metadata check-compatibility [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `-m, --metrics <m...>` | YES | Metrics to check |
| `-d, --dimensions <d...>` | YES | Dimensions to check |

---

## audience export create

Create a one-time audience export.

```
gacli audience export create [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--audience <name>` | YES | Audience resource name (e.g. `properties/123/audiences/456`) |
| `--dimensions <d...>` | no | Dimensions to include |

## audience export get

Get status of an audience export.

```
gacli audience export get --name <resourceName>
```

## audience export list

List all audience exports for a property. Requires `-p`.

```
gacli audience export list
```

## audience export query

Query rows from a completed audience export.

```
gacli audience export query [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--name <name>` | YES | Audience export resource name |
| `--limit <n>` | no | Max rows |
| `--offset <n>` | no | Row offset |

## audience recurring create

Create a recurring audience list.

```
gacli audience recurring create --audience <name> [--dimensions <d...>]
```

## audience recurring get

```
gacli audience recurring get --name <resourceName>
```

## audience recurring list

List recurring audience lists. Requires `-p`.

```
gacli audience recurring list
```

---

## admin accounts list

List all GA4 accounts accessible with current credentials.

```
gacli admin accounts list
```

No options required.

## admin properties

CRUD for GA4 properties.

```
gacli admin properties list --account <accountId>
gacli admin properties get                           # uses -p
gacli admin properties create [options]
gacli admin properties update [options]               # uses -p
gacli admin properties delete                         # uses -p
```

**create options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--account <id>` | YES | Account ID |
| `--display-name <name>` | YES | Display name |
| `--time-zone <tz>` | YES | e.g. America/New_York |
| `--currency-code <code>` | no | e.g. USD |
| `--industry-category <cat>` | no | Industry category |

**update options:** `--display-name`, `--time-zone`, `--currency-code`, `--industry-category` (all optional, uses -p for target).

## admin datastreams

CRUD for data streams.

```
gacli admin datastreams list                          # uses -p
gacli admin datastreams get --name <resourceName>
gacli admin datastreams create [options]              # uses -p
gacli admin datastreams update --name <rn> --display-name <n>
gacli admin datastreams delete --name <resourceName>
```

**create options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--type <type>` | YES | WEB_DATA_STREAM, ANDROID_APP_DATA_STREAM, IOS_APP_DATA_STREAM |
| `--display-name <name>` | YES | Display name |
| `--uri <uri>` | no | For WEB type |
| `--package-name <pkg>` | no | For ANDROID type |
| `--bundle-id <id>` | no | For IOS type |

## admin custom-dimensions

CRUD + archive for custom dimensions.

```
gacli admin custom-dimensions list                    # uses -p
gacli admin custom-dimensions get --name <rn>
gacli admin custom-dimensions create [options]        # uses -p
gacli admin custom-dimensions update --name <rn> [options]
gacli admin custom-dimensions archive --name <rn>
```

**create options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--parameter-name <name>` | YES | Event parameter name |
| `--display-name <name>` | YES | Display name |
| `--scope <scope>` | YES | EVENT, USER, or ITEM |
| `--description <desc>` | no | Description |

**update options:** `--name` (required), `--display-name`, `--description` (optional).

## admin custom-metrics

CRUD + archive for custom metrics.

```
gacli admin custom-metrics list                       # uses -p
gacli admin custom-metrics get --name <rn>
gacli admin custom-metrics create [options]           # uses -p
gacli admin custom-metrics update --name <rn> [options]
gacli admin custom-metrics archive --name <rn>
```

**create options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--parameter-name <name>` | YES | Event parameter name |
| `--display-name <name>` | YES | Display name |
| `--scope <scope>` | YES | EVENT |
| `--measurement-unit <unit>` | YES | STANDARD, CURRENCY, FEET, METERS, KILOMETERS, MILES, MILLISECONDS, SECONDS, MINUTES, HOURS |
| `--description <desc>` | no | Description |

**update options:** `--name` (required), `--display-name`, `--description`, `--measurement-unit` (optional).

## admin key-events

CRUD for key events (conversions).

```
gacli admin key-events list                           # uses -p
gacli admin key-events get --name <rn>
gacli admin key-events create [options]               # uses -p
gacli admin key-events update --name <rn> [options]
gacli admin key-events delete --name <rn>
```

**create options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--event-name <name>` | YES | Event name |
| `--counting-method <m>` | no | ONCE_PER_EVENT (default), ONCE_PER_SESSION |
| `--default-value <n>` | no | Numeric default value |
| `--currency-code <code>` | no | Currency for default value |

**update options:** `--name` (required), `--counting-method`, `--default-value`, `--currency-code` (optional).

## admin audiences

CRUD + archive for audiences.

```
gacli admin audiences list                            # uses -p
gacli admin audiences get --name <rn>
gacli admin audiences create [options]                # uses -p
gacli admin audiences update --name <rn> [options]
gacli admin audiences archive --name <rn>
```

**create options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--display-name <name>` | YES | Display name |
| `--description <desc>` | no | Description |
| `--membership-duration-days <n>` | no | Days (default: 30) |
| `--filter-clauses <json>` | no | Filter clauses as JSON |

**update options:** `--name` (required), `--display-name`, `--description` (optional).

## admin access-bindings

CRUD for user access bindings.

```
gacli admin access-bindings list --parent <parent>
gacli admin access-bindings get --name <rn>
gacli admin access-bindings create --parent <p> --user <email> --roles <r...>
gacli admin access-bindings update --name <rn> --roles <r...>
gacli admin access-bindings delete --name <rn>
```

`--parent`: account or property resource name (e.g. `accounts/123` or `properties/456`).
`--roles`: variadic, e.g. `--roles predefinedRoles/viewer predefinedRoles/editor`.

## admin firebase-links

Manage Firebase integrations.

```
gacli admin firebase-links list                       # uses -p
gacli admin firebase-links get --name <rn>
gacli admin firebase-links create --project <projectId>  # uses -p
gacli admin firebase-links delete --name <rn>
```

## admin google-ads-links

Manage Google Ads integrations.

```
gacli admin google-ads-links list                     # uses -p
gacli admin google-ads-links get --name <rn>
gacli admin google-ads-links create --customer-id <id>  # uses -p
gacli admin google-ads-links update --name <rn> --ads-personalization-enabled <true|false>
gacli admin google-ads-links delete --name <rn>
```

## admin bigquery-links

Manage BigQuery integrations.

```
gacli admin bigquery-links list                       # uses -p
gacli admin bigquery-links get --name <rn>
gacli admin bigquery-links create --project <projectId> [--daily-export-enabled true] [--streaming-export-enabled false]  # uses -p
gacli admin bigquery-links delete --name <rn>
```

---

## config set

```
gacli config set <key> <value>
```

Keys: `credentials` (path to service account JSON), `property` (numeric ID), `format` (table|json|csv|chart), `noColor` (true|false), `verbose` (true|false), `oauthClientSecretFile` (path to OAuth client secret JSON).

## config get

```
gacli config get <key>
```

## config list

```
gacli config list
```

Shows all config keys with current values and descriptions. Stored in `~/.gacli/config.json`.

---

## Filter syntax

Shorthand for `--dimension-filter` and `--metric-filter`:

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Exact match | `country==US` |
| `!=` | Not equal | `country!=US` |
| `=~` | Regex match | `pagePath=~/blog/` |
| `!~` | Regex not match | `pagePath!~/admin/` |
| `>` | Greater than | `sessions>100` |
| `<` | Less than | `sessions<10` |
| `>=` | Greater or equal | `sessions>=50` |
| `<=` | Less or equal | `bounceRate<=0.5` |

Multiple filters are combined with AND.

## Notes for AI usage

- Auth priority: OAuth tokens > service account (`credentials` config / `GOOGLE_APPLICATION_CREDENTIALS` env var). Use `gacli auth status` to check which method is active.
- Property ID is always numeric (e.g. `371981488`), never with `properties/` prefix on CLI.
- Resource names in admin commands use full path: `properties/123/dataStreams/456`.
- `--name` in admin get/update/delete always expects the full resource name.
- Variadic options accept multiple values: `-m sessions -m activeUsers` or `-m sessions activeUsers`.
- Date formats: `YYYY-MM-DD`, `today`, `yesterday`, `NdaysAgo` (e.g. `7daysAgo`, `30daysAgo`).
- JSON string options must be valid JSON. Quote carefully in shell: `--pivots '[{"fieldNames":["browser"],"limit":5}]'`.
- `# uses -p` means the command reads property ID from the global `-p` option.
