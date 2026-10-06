# gacli - Command Reference for AI

Google Analytics 4 CLI. Covers Data API (reports, realtime, funnels, cohorts, audience exports) and Admin API (accounts, properties, streams, custom dims/metrics, key events, audiences, integrations).

## Global options (apply to ALL commands)

```
-p, --property <id>       GA4 property ID (numeric, e.g. 371981488)
-f, --format <format>     Output: table|json|ndjson|csv|chart; unknown values exit 2
-o, --output <file>       Write to file instead of stdout
--no-color                Disable colors (also honours NO_COLOR; colour is off when not a TTY unless FORCE_COLOR is set)
-v, --verbose             Debug logging
```

Property resolution: --property flag > config.property > GA4_PROPERTY_ID env var.

Format resolution: `-f` > `GACLI_FORMAT` env > config `format` > auto. Auto is `table` on an interactive terminal and **`json` (compact) when stdout is piped, in CI, or when an AI agent is detected** (`CLAUDECODE`, `CODEX_THREAD_ID`, `CURSOR_AGENT`, `AI_AGENT`, `GACLI_AGENT`).

Per-operation flags (on every catalogue operation):

```
--fields <paths>          Comma-separated output fields; dot paths for nested values (e.g. name,displayName). Unknown field exits 2
--dry-run                 (create/update/delete/action only) print the request instead of calling the API
-y, --yes                 (delete/archive only) confirm; required when not interactive, otherwise exit 4
```

Exit codes: `0` ok · `1` API/internal · `2` usage/validation · `3` auth (unauthenticated, permission denied, no credentials) · `4` confirmation required (`--yes`) · `5` not found · `6` quota exhausted.

With `-f json|ndjson` (or when piped), errors are one JSON line on stderr: `{"error":{"code":"NOT_FOUND","message":"…","hint":"…","grpcStatus":5,"exitCode":5}}`.

Introspection: `gacli schema [command...]` prints every operation (flags, category, input/output JSON Schema) as JSON; `gacli schema --llms` prints a Markdown reference.

---

## auth login

Interactive OAuth 2.0 authentication via browser consent flow with PKCE.

```
gacli auth login [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--client-secret-file <path>` | no | Path to OAuth client secret JSON file (downloaded from GCP Console). Falls back to `oauthClientSecretFile` config key. |
| `--scopes <preset>` | no | `readonly`, `edit` (default: read + write) or `chat` (adds `analytics.chatbot.read`, needed by `report chat`) |

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

Displays the credential source the resolution chain will use (`access-token`, `oauth`, `env-credentials`, `config-credentials` or `adc`), token file path, expiry and scopes. `-f json` for scripts. It does not contact Google: use `auth token` to prove the credentials work.

## auth token

Print an access token for the active credentials (stdout only; exit 3 when there are none).

```
gacli auth token
curl -H "Authorization: Bearer $(gacli auth token)" https://analyticsadmin.googleapis.com/v1beta/accountSummaries
```

Credential resolution order: `GACLI_ACCESS_TOKEN` env (agents/CI; wins over everything) → OAuth tokens (`auth login`) → `GOOGLE_APPLICATION_CREDENTIALS` → config `credentials` → Application Default Credentials. Service accounts get the chat scope with `GACLI_SCOPES=chat`.

---

<!-- BEGIN GENERATED: operations -->
## gacli report run

Run a standard GA4 report

Example: gacli report run -p 371981488 -m sessions activeUsers -d date country --start-date 30daysAgo --limit 50 --order-by metric:sessions:desc

```
gacli report run [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `-m, --metrics <metrics...>` | yes |  | Metrics to include in the report |
| `-d, --dimensions <dimensions...>` |  |  | Dimensions to include in the report |
| `--start-date <date>` |  | `"7daysAgo"` | Start date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--end-date <date>` |  | `"today"` | End date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--limit <number>` |  |  | Maximum number of rows to return |
| `--offset <number>` |  |  | Row offset for pagination |
| `--order-by <orderBys...>` |  |  | Order by specifications (e.g. "metric:sessions:desc") |
| `--dimension-filter <filters...>` |  |  | Dimension filters (e.g. "country==Romania") |
| `--metric-filter <filters...>` |  |  | Metric filters (e.g. "sessions>100") |
| `--keep-empty-rows` |  |  | Include rows with all zero metric values |
| `--return-property-quota` |  |  | Also return the property quota state; it lands in the report metadata as propertyQuota |
| `--conversion-spec <json>` |  |  | Conversion report spec as JSON (inline, @file or @-): {"conversionActions":["conversionActions/1234"],"attributionModel":"DATA_DRIVEN"\|"LAST_CLICK"}. When set the report runs on the v1alpha API |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli report pivot

Run a GA4 pivot report

```
gacli report pivot [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `-m, --metrics <metrics...>` | yes |  | Metrics to include in the report |
| `-d, --dimensions <dimensions...>` | yes |  | Dimensions to include in the report |
| `--pivots <json>` | yes |  | Pivot definitions as JSON (inline, @file or @-), e.g. [{"fieldNames":["browser"],"limit":5}] |
| `--start-date <date>` |  | `"7daysAgo"` | Start date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--end-date <date>` |  | `"today"` | End date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--dimension-filter <filters...>` |  |  | Dimension filters |
| `--metric-filter <filters...>` |  |  | Metric filters |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli report batch

Run multiple GA4 reports in a single batch request

--requests is a JSON array of RunReport request objects (dateRanges, dimensions, metrics, …) given as a file path, @file, @- or inline JSON. With several requests, -f json prints an array of report envelopes, -f ndjson tags each row with "report": <n>, and table/csv/chart print "--- Report N ---" sections; -o writes all reports to one file.

```
gacli report batch [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--requests <path>` | yes |  | Path to JSON file containing an array of report request objects |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → one report envelope, or an array of them for several requests.

## gacli report batch-pivot

Run multiple GA4 pivot reports in a single batch request

--requests is a JSON array of RunPivotReport request objects (dateRanges, dimensions, metrics, …) given as a file path, @file, @- or inline JSON. With several requests, -f json prints an array of report envelopes, -f ndjson tags each row with "report": <n>, and table/csv/chart print "--- Pivot Report N ---" sections; -o writes all reports to one file.

```
gacli report batch-pivot [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--requests <path>` | yes |  | Path to JSON file containing an array of pivot report request objects |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → one report envelope, or an array of them for several requests.

## gacli report realtime

Run a GA4 realtime report

```
gacli report realtime [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `-m, --metrics <metrics...>` | yes |  | Metrics to include in the report |
| `-d, --dimensions <dimensions...>` |  |  | Dimensions to include in the report |
| `--minute-ranges <json>` |  |  | Minute ranges as JSON, e.g. [{"startMinutesAgo":10,"endMinutesAgo":0}] (up to 29 minutes ago; 59 on Analytics 360) |
| `--dimension-filter <filters...>` |  |  | Dimension filters |
| `--metric-filter <filters...>` |  |  | Metric filters |
| `--limit <number>` |  |  | Maximum number of rows to return |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli report cohort

Run a GA4 cohort report

```
gacli report cohort [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `-m, --metrics <metrics...>` | yes |  | Metrics to include in the report |
| `--cohorts <json>` | yes |  | Cohort definitions as JSON (inline, @file or @-), e.g. [{"name":"c1","dimension":"firstSessionDate","dateRange":{"startDate":"2026-01-01","endDate":"2026-01-07"}}] |
| `--cohort-granularity <granularity>` |  |  | Cohort granularity: DAILY, WEEKLY, or MONTHLY |
| `--end-offset <number>` |  |  | End offset for the cohort report |
| `--start-offset <number>` |  |  | Start offset for the cohort report |
| `-d, --dimensions <dimensions...>` |  |  | Dimensions to include in the report |
| `--accumulate` |  |  | Accumulate cohort data over time (accepted for 1.x compatibility; RunReport ignores it) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli report funnel

Run a GA4 funnel report

```
gacli report funnel [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--steps <json>` | yes |  | Funnel steps as JSON (inline, @file or @-), e.g. [{"name":"View","filterExpression":{...}},{"name":"Buy","filterExpression":{...},"withinDurationFromPriorStep":"600s"}] |
| `--open-funnel` |  |  | Use an open funnel (users can enter at any step) |
| `--funnel-breakdown <dimension>` |  |  | Dimension name to break down the funnel by |
| `--start-date <date>` |  | `"7daysAgo"` | Start date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--end-date <date>` |  | `"today"` | End date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli report quota

Show the property quota snapshot (consumed / remaining per quota category)

```
gacli report quota [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli report tasks create

Create an asynchronous report task

Starts a report task (kept for 72 hours) and returns at once. Check it with `report tasks get` and read rows with `report tasks query` once its state is ACTIVE, or pass --watch to wait for it.

```
gacli report tasks create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `-m, --metrics <metrics...>` | yes |  | Metrics to include in the report |
| `-d, --dimensions <dimensions...>` |  |  | Dimensions to include in the report |
| `--start-date <date>` |  | `"7daysAgo"` | Start date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--end-date <date>` |  | `"today"` | End date: YYYY-MM-DD, today, yesterday or NdaysAgo |
| `--limit <number>` |  |  | Maximum number of rows the task produces (API default 10,000) |
| `--dimension-filter <filters...>` |  |  | Dimension filters (e.g. "country==Romania") |
| `--metric-filter <filters...>` |  |  | Metric filters (e.g. "sessions>100") |
| `--watch` |  | `false` | Wait for the task to finish (long-running operation) and return the finished task |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli report tasks get

Get a report task (definition and processing state)

```
gacli report tasks get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Report task resource name (properties/<id>/reportTasks/<task>) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli report tasks list

List report tasks for a property

```
gacli report tasks list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli report tasks query

Read the rows of a finished (ACTIVE) report task

Fails with the API error while the task is still CREATING; check `report tasks get` first.

```
gacli report tasks query [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Report task resource name (properties/<id>/reportTasks/<task>) |
| `--limit <number>` |  |  | Maximum number of rows to return |
| `--offset <number>` |  |  | Row offset for pagination |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli report chat

Ask a natural-language question about the property (GA4 Data API chat, alpha)

Needs the https://www.googleapis.com/auth/analytics.chatbot.read scope. Pass the returned session ID back with --session to continue the conversation. Answers are AI-generated and may be inaccurate.

```
gacli report chat [question] [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--question <text>` |  |  | The question to ask about this property's Analytics data |
| `--session <id>` |  |  | Session ID from a previous answer, to continue that conversation (omit to start a new one) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli metadata get

Get metadata (dimensions and metrics) for a GA4 property

```
gacli metadata get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--type <type>` |  | `"all"` | Type of metadata to retrieve (dims, metrics, all) |
| `--search <term>` |  |  | Filter results by name or description |
| `--custom-only` |  |  | Show only custom dimensions/metrics |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli metadata check-compatibility

Check compatibility of dimensions and metrics

```
gacli metadata check-compatibility [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `-m, --metrics <metrics...>` | yes |  | Metrics to check compatibility for |
| `-d, --dimensions <dimensions...>` | yes |  | Dimensions to check compatibility for |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli audience export create

Create an audience export

```
gacli audience export create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--audience <audience>` | yes |  | Audience resource name |
| `--dimensions <dimensions...>` |  |  | Dimensions to include in the export |
| `--watch` |  | `false` | Wait for the export to finish (long-running operation) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli audience export get

Get details of an audience export

```
gacli audience export get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <name>` | yes |  | Audience export resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli audience export list

List audience exports for a property

```
gacli audience export list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli audience export query

Query an audience export to retrieve audience members

```
gacli audience export query [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <name>` | yes |  | Audience export resource name |
| `--limit <number>` |  |  | Maximum number of rows to return |
| `--offset <number>` |  |  | Row offset for pagination |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli audience recurring create

Create a recurring audience list

```
gacli audience recurring create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--audience <audience>` | yes |  | Audience resource name |
| `--dimensions <dimensions...>` |  |  | Dimensions to include |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli audience recurring get

Get details of a recurring audience list

```
gacli audience recurring get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <name>` | yes |  | Recurring audience list resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli audience recurring list

List recurring audience lists for a property

```
gacli audience recurring list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin accounts list

List all GA4 accounts accessible by the caller

```
gacli admin accounts list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin accounts summaries

List summaries of all accessible accounts and their properties

```
gacli admin accounts summaries [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin properties list

List GA4 properties under an account

```
gacli admin properties list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--account <accountId>` | yes |  | GA4 account ID |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin properties get

Get a GA4 property

```
gacli admin properties get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin properties create

Create a new GA4 property

```
gacli admin properties create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--account <accountId>` | yes |  | GA4 account ID |
| `--display-name <name>` | yes |  | Display name for the property |
| `--time-zone <timeZone>` | yes |  | Reporting time zone (e.g., America/New_York) |
| `--currency-code <code>` |  |  | Currency code (e.g., USD) |
| `--industry-category <category>` |  |  | Industry category |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin properties update

Update a GA4 property

```
gacli admin properties update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--display-name <name>` |  |  | New display name |
| `--time-zone <timeZone>` |  |  | New reporting time zone |
| `--currency-code <code>` |  |  | New currency code |
| `--industry-category <category>` |  |  | New industry category |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin properties delete

Delete a GA4 property

```
gacli admin properties delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin datastreams list

List data streams for a property

```
gacli admin datastreams list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin datastreams get

Get a data stream

```
gacli admin datastreams get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Data stream resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin datastreams create

Create a data stream

```
gacli admin datastreams create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--type <streamType>` | yes |  | Data stream type (WEB_DATA_STREAM, ANDROID_APP_DATA_STREAM, IOS_APP_DATA_STREAM) |
| `--display-name <name>` | yes |  | Display name for the data stream |
| `--uri <uri>` |  |  | Web stream URI (for WEB_DATA_STREAM) |
| `--package-name <packageName>` |  |  | Android package name (for ANDROID_APP_DATA_STREAM) |
| `--bundle-id <bundleId>` |  |  | iOS bundle ID (for IOS_APP_DATA_STREAM) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin datastreams update

Update a data stream

```
gacli admin datastreams update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Data stream resource name |
| `--display-name <name>` | yes |  | New display name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin datastreams delete

Delete a data stream

```
gacli admin datastreams delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Data Stream resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-dimensions list

List custom dimensions for a property

```
gacli admin custom-dimensions list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin custom-dimensions get

Get a custom dimension

```
gacli admin custom-dimensions get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Custom dimension resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-dimensions create

Create a custom dimension

```
gacli admin custom-dimensions create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--parameter-name <parameterName>` | yes |  | Event parameter name |
| `--display-name <displayName>` | yes |  | Display name |
| `--description <description>` |  |  | Description of the custom dimension |
| `--scope <scope>` | yes |  | Dimension scope (EVENT, USER, ITEM) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-dimensions update

Update a custom dimension

```
gacli admin custom-dimensions update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Custom dimension resource name |
| `--display-name <displayName>` |  |  | New display name |
| `--description <description>` |  |  | New description |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-dimensions archive

Archive a custom dimension

```
gacli admin custom-dimensions archive [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Custom Dimension resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-metrics list

List custom metrics for a property

```
gacli admin custom-metrics list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin custom-metrics get

Get a custom metric

```
gacli admin custom-metrics get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Custom metric resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-metrics create

Create a custom metric

```
gacli admin custom-metrics create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--parameter-name <parameterName>` | yes |  | Event parameter name |
| `--display-name <displayName>` | yes |  | Display name |
| `--description <description>` |  |  | Description of the custom metric |
| `--scope <scope>` | yes |  | Metric scope (EVENT) |
| `--measurement-unit <unit>` | yes |  | Measurement unit (STANDARD, CURRENCY, FEET, METERS, KILOMETERS, MILES, MILLISECONDS, SECONDS, MINUTES, HOURS) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-metrics update

Update a custom metric

```
gacli admin custom-metrics update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Custom metric resource name |
| `--display-name <displayName>` |  |  | New display name |
| `--description <description>` |  |  | New description |
| `--measurement-unit <unit>` |  |  | New measurement unit |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin custom-metrics archive

Archive a custom metric

```
gacli admin custom-metrics archive [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Custom Metric resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin key-events list

List key events for a property

```
gacli admin key-events list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin key-events get

Get a key event

```
gacli admin key-events get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Key event resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin key-events create

Create a key event

```
gacli admin key-events create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--event-name <eventName>` | yes |  | Event name |
| `--counting-method <method>` |  | `"ONCE_PER_EVENT"` | Counting method (ONCE_PER_EVENT, ONCE_PER_SESSION) |
| `--default-value <value>` |  |  | Default value for the key event |
| `--currency-code <code>` |  |  | Currency code for the default value |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin key-events update

Update a key event

```
gacli admin key-events update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Key event resource name |
| `--counting-method <method>` |  |  | Counting method (ONCE_PER_EVENT, ONCE_PER_SESSION) |
| `--default-value <value>` |  |  | Default value for the key event |
| `--currency-code <code>` |  |  | Currency code for the default value |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin key-events delete

Delete a key event

```
gacli admin key-events delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Key Event resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin audiences list

List audiences for a property

```
gacli admin audiences list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin audiences get

Get an audience

```
gacli admin audiences get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Audience resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin audiences create

Create an audience

```
gacli admin audiences create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--display-name <displayName>` | yes |  | Display name |
| `--description <description>` |  |  | Description of the audience |
| `--membership-duration-days <days>` |  | `30` | Membership duration in days |
| `--filter-clauses <json>` |  |  | Filter clauses as JSON string |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin audiences update

Update an audience

```
gacli admin audiences update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Audience resource name |
| `--display-name <displayName>` |  |  | New display name |
| `--description <description>` |  |  | New description |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin audiences archive

Archive an audience

```
gacli admin audiences archive [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Audience resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin access-bindings list

List access bindings for an account or property

```
gacli admin access-bindings list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--parent <parent>` | yes |  | Account or property resource name (e.g., accounts/123 or properties/456) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin access-bindings get

Get an access binding

```
gacli admin access-bindings get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Access binding resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin access-bindings create

Create an access binding

Grants a user roles on an account or property. --parent is accounts/<id> or properties/<id>; --roles is variadic, e.g. --roles predefinedRoles/viewer predefinedRoles/editor.

```
gacli admin access-bindings create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--parent <parent>` | yes |  | Account or property resource name |
| `--user <email>` | yes |  | User email address |
| `--roles <roles...>` | yes |  | Roles to assign (variadic) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin access-bindings update

Update an access binding

```
gacli admin access-bindings update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Access binding resource name |
| `--roles <roles...>` | yes |  | New roles to assign (variadic) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin access-bindings delete

Delete an access binding

```
gacli admin access-bindings delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Access Binding resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin firebase-links list

List Firebase links for a property

```
gacli admin firebase-links list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin firebase-links get

Get a Firebase link

```
gacli admin firebase-links get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Firebase link resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin firebase-links create

Create a Firebase link

```
gacli admin firebase-links create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--project <projectId>` | yes |  | Firebase project ID or resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin firebase-links delete

Delete a Firebase link

```
gacli admin firebase-links delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Firebase Link resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin google-ads-links list

List Google Ads links for a property

```
gacli admin google-ads-links list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin google-ads-links get

Get a Google Ads link

```
gacli admin google-ads-links get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Google Ads link resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin google-ads-links create

Create a Google Ads link

```
gacli admin google-ads-links create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--customer-id <customerId>` | yes |  | Google Ads customer ID |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin google-ads-links update

Update a Google Ads link

```
gacli admin google-ads-links update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Google Ads link resource name |
| `--ads-personalization-enabled <enabled>` | yes |  | Enable/disable ads personalization (true/false) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin google-ads-links delete

Delete a Google Ads link

```
gacli admin google-ads-links delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Google Ads Link resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin bigquery-links list

List BigQuery links for a property

```
gacli admin bigquery-links list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin bigquery-links get

Get a BigQuery link

```
gacli admin bigquery-links get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | BigQuery link resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{data}` (single resource).

## gacli admin bigquery-links create

Create a BigQuery link

```
gacli admin bigquery-links create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--project <projectId>` | yes |  | Google Cloud project ID |
| `--daily-export-enabled <enabled>` |  | `"true"` | Enable daily export (true/false) |
| `--streaming-export-enabled <enabled>` |  | `"false"` | Enable streaming export (true/false) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin bigquery-links delete

Delete a BigQuery link

```
gacli admin bigquery-links delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | BigQuery Link resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin annotations list

List reporting data annotations for a property

```
gacli admin annotations list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin annotations create

Create a reporting data annotation

```
gacli admin annotations create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--title <title>` | yes |  | Annotation title |
| `--description <description>` |  |  | Annotation description |
| `--color <color>` | yes |  | Annotation color (PURPLE, BROWN, BLUE, GREEN, RED, CYAN, ORANGE) |
| `--annotation-date <date>` |  |  | Single annotation date (YYYY-MM-DD); mutually exclusive with --start-date/--end-date |
| `--start-date <date>` |  |  | Start of the annotated date range (YYYY-MM-DD); requires --end-date |
| `--end-date <date>` |  |  | End of the annotated date range (YYYY-MM-DD); requires --start-date |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin annotations update

Update a reporting data annotation

```
gacli admin annotations update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Annotation resource name (properties/<id>/reportingDataAnnotations/<id>) |
| `--title <title>` |  |  | New title |
| `--description <description>` |  |  | New description |
| `--color <color>` |  |  | New color (PURPLE, BROWN, BLUE, GREEN, RED, CYAN, ORANGE) |
| `--annotation-date <date>` |  |  | Single annotation date (YYYY-MM-DD); mutually exclusive with --start-date/--end-date |
| `--start-date <date>` |  |  | Start of the annotated date range (YYYY-MM-DD); requires --end-date |
| `--end-date <date>` |  |  | End of the annotated date range (YYYY-MM-DD); requires --start-date |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin annotations delete

Delete a reporting data annotation

```
gacli admin annotations delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Annotation resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin change-history search

Search change history events for an account

```
gacli admin change-history search [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--account <id>` | yes |  | Account to search (accounts/<id> or bare numeric ID) |
| `--filter-property <id>` |  |  | Only changes to this property (properties/<id> or numeric ID) |
| `--resource-type <types...>` |  |  | Only changes to these resource types (ACCOUNT, PROPERTY, FIREBASE_LINK, GOOGLE_ADS_LINK, GOOGLE_SIGNALS_SETTINGS, CONVERSION_EVENT, MEASUREMENT_PROTOCOL_SECRET, CUSTOM_DIMENSION, CUSTOM_METRIC, DATA_RETENTION_SETTINGS, DISPLAY_VIDEO_360_ADVERTISER_LINK, DISPLAY_VIDEO_360_ADVERTISER_LINK_PROPOSAL, SEARCH_ADS_360_LINK, DATA_STREAM, ATTRIBUTION_SETTINGS, EXPANDED_DATA_SET, CHANNEL_GROUP, BIGQUERY_LINK, ENHANCED_MEASUREMENT_SETTINGS, DATA_REDACTION_SETTINGS, SKADNETWORK_CONVERSION_VALUE_SCHEMA, ADSENSE_LINK, AUDIENCE, EVENT_CREATE_RULE, KEY_EVENT, CALCULATED_METRIC, REPORTING_DATA_ANNOTATION, SUBPROPERTY_SYNC_CONFIG, REPORTING_IDENTITY_SETTINGS, USER_PROVIDED_DATA_SETTINGS) |
| `--action <actions...>` |  |  | Only these actions (CREATED, UPDATED, DELETED) |
| `--earliest <datetime>` |  |  | Only changes at or after this ISO 8601 datetime |
| `--latest <datetime>` |  |  | Only changes at or before this ISO 8601 datetime |
| `--limit <number>` |  |  | Maximum number of events (one page, max 200); omit to fetch all pages |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin access-report run

Run a data access report (who read which data, when)

```
gacli admin access-report run [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--entity <entity>` |  |  | Report scope: properties/<id> or accounts/<id> (default: the global -p property) |
| `-d, --dimensions <dimensions...>` | yes |  | Access dimensions (e.g. userEmail, epochTimeMicros, reportType, dataApiQuotaCategory) |
| `-m, --metrics <metrics...>` | yes |  | Access metrics (e.g. accessCount) |
| `--start-date <date>` |  | `"30daysAgo"` | Start date (YYYY-MM-DD, NdaysAgo, yesterday, today) |
| `--end-date <date>` |  | `"today"` | End date (YYYY-MM-DD, NdaysAgo, yesterday, today) |
| `--limit <number>` |  |  | Maximum number of rows to return |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data: [{<dimension|metric>: string}], metadata?}`.

## gacli admin measurement-secrets list

List Measurement Protocol secrets for a data stream

```
gacli admin measurement-secrets list [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--stream <dataStreamName>` | yes |  | Data stream resource name (properties/<id>/dataStreams/<id>) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Output: `-f json` → `{rowCount, data}` (list).

## gacli admin measurement-secrets create

Create a Measurement Protocol secret

```
gacli admin measurement-secrets create [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--stream <dataStreamName>` | yes |  | Data stream resource name (properties/<id>/dataStreams/<id>) |
| `--display-name <displayName>` | yes |  | Human-readable name of the secret |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin measurement-secrets delete

Delete a Measurement Protocol secret

```
gacli admin measurement-secrets delete [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--name <resourceName>` | yes |  | Measurement Protocol secret resource name |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |
| `-y, --yes` |  |  | Confirm this destructive operation (required when not interactive) |

Destructive: requires `--yes` when not interactive. Supports `--dry-run`.

Output: `-f json` → `{data}` (single resource).

## gacli admin data-retention get

Get the data retention settings of a property

```
gacli admin data-retention get [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |

Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).

## gacli admin data-retention update

Update the data retention settings of a property

```
gacli admin data-retention update [options]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--event-data-retention <duration>` |  |  | How long event-level data is retained (TWO_MONTHS, FOURTEEN_MONTHS, TWENTY_SIX_MONTHS, THIRTY_EIGHT_MONTHS, FIFTY_MONTHS; over 14 months needs GA4 360) |
| `--user-data-retention <duration>` |  |  | How long user-level data is retained (TWO_MONTHS, FOURTEEN_MONTHS, TWENTY_SIX_MONTHS, THIRTY_EIGHT_MONTHS, FIFTY_MONTHS; over 14 months needs GA4 360) |
| `--reset-user-data-on-new-activity <boolean>` |  |  | Reset the user identifier retention period on new activity from that user (true\|false) |
| `--fields <paths>` |  |  | Comma-separated fields to output (dot paths for nested values) |
| `--dry-run` |  |  | Print the request that would be sent, without calling the API |

Supports `--dry-run`. Needs `-p <property>`.

Output: `-f json` → `{data}` (single resource).
<!-- END GENERATED: operations -->

---

## config set

```
gacli config set <key> <value>
```

Keys: `credentials` (path to service account JSON), `property` (numeric ID), `format` (table|json|ndjson|csv|chart), `noColor` (true|false), `verbose` (true|false), `oauthClientSecretFile` (path to OAuth client secret JSON).

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

---

## skills

Install the bundled gacli skill into a target AI CLI agent.

```
gacli skills install   [--agent claude|codex|qwen|gemini|all] [--scope user|project|<path>] [--force] [--dry-run]
gacli skills uninstall [--agent ...] [--scope ...] [--all] [--dry-run]
gacli skills list                                        # all detected installs
gacli skills path --agent <agent> [--scope <scope>]      # print install path
gacli skills doctor                                      # detect agent CLIs on PATH
```

Skills are CLI-only — the installed skill teaches the host AI CLI to operate
gacli via shell. Full guide and per-CLI install paths in
`extensions/README.md`.

---

## schema

Describe operations as JSON for scripts and AI agents: flags, category, input JSON Schema and the
`-f json` output envelope. `--llms` prints a compact Markdown reference (the same content as `llms.txt`).

```
gacli schema                         # every operation
gacli schema admin custom-dimensions # one group (prefix match)
gacli schema report run --llms
```

## api

Call any GA4 Admin/Data RPC by name — the escape hatch for methods without a dedicated command.

```
gacli api <admin|admin.v1beta|data|data.v1alpha> <Method> [--body <json|@file|@->] [--dry-run] [-y] [--fields a,b]
gacli api admin ListAccountSummaries
gacli api data.v1alpha GetPropertyQuotasSnapshot --body '{"name":"properties/1/propertyQuotasSnapshot"}'
```

The body is proto JSON (enum names, string int64s) validated against the SDK's request type; unknown
fields and typos (with suggestions) exit 2. `Delete*`/`Archive*`/`BatchDelete*`/`SubmitUserDeletion`
need `--yes`. Long-running methods return only the operation snapshot.

## mcp serve

Serve every operation as an MCP tool (`ga_<command>`, e.g. `ga_report_run`). See `MCP.md`.

```
gacli mcp serve [--allow-write] [--allow-delete] [--http <port>]
```

Read-only by default; `--allow-write` adds create/update tools; `--allow-delete` adds delete/archive
tools (which need `confirm: true` and an explicit `propertyId`). `--http` serves
`http://127.0.0.1:<port>/mcp` (local only, no auth).

---

## Notes for AI usage

- Auth priority: `GACLI_ACCESS_TOKEN` > OAuth tokens > `GOOGLE_APPLICATION_CREDENTIALS` > `credentials` config > Application Default Credentials. `gacli auth token >/dev/null` proves auth works (exit 3 = no); `gacli auth status` shows which source is used.
- Property ID is numeric (e.g. `371981488`); a `properties/` prefix is accepted and stripped.
- Resource names in admin commands use full path: `properties/123/dataStreams/456`.
- `--name` in admin get/update/delete always expects the full resource name.
- Metric/dimension lists: `-m sessions activeUsers`, `-m sessions,activeUsers` or `-m sessions -m activeUsers`.
- Date formats: `YYYY-MM-DD`, `today`, `yesterday`, `NdaysAgo` (e.g. `7daysAgo`, `30daysAgo`).
- JSON options take inline JSON, `@file` or `@-` (stdin). Quote carefully in shell: `--pivots '[{"fieldNames":["browser"],"limit":5}]'`.
- Each operation section says "Needs `-p <property>`" when it reads the global property.
- Exit codes: 0 ok, 1 API, 2 usage, 3 auth, 4 needs `--yes`, 5 not found, 6 quota. With JSON output, errors are one JSON line on stderr.
