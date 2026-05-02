# gacli reference (Qwen-conventional)

This is a Qwen-conventional condensed reference. For the full per-domain
catalog see [references/command-catalog.md](references/command-catalog.md).

## Pre-flight

```bash
gacli auth status                              # Check authentication
gacli config get property                      # Default property (numeric)
gacli admin accounts list                      # If no default, find account
gacli admin properties list --account <id>     # Find a property
gacli config set property <id>                 # Persist default
```

## Reports (Data API)

```bash
gacli report run -m <metrics...> -d <dimensions...> [opts]      # standard
gacli report realtime -m <metrics...> -d <dimensions...>        # last 30 min
gacli report batch --requests <file.json>                       # multiple
gacli report pivot -m -d --pivots '<json>'                      # cross-tab
gacli report funnel --steps '<json>'                            # funnel
gacli report cohort -m --cohorts '<json>'                       # cohort
```

Common opts: `--start-date`, `--end-date`, `--limit`, `--offset`,
`--order-by` (variadic `metric:N:desc` or `dimension:N:asc`),
`--dimension-filter` (variadic), `--metric-filter` (variadic),
`--keep-empty-rows`.

## Metadata

```bash
gacli metadata get [--type all|dims|metrics] [--search <term>] [--custom-only]
gacli metadata check-compatibility -m <metrics...> -d <dimensions...>
```

## Admin (10 sub-domains)

```bash
gacli admin accounts list
gacli admin properties        [list|get|create|update|delete]
gacli admin datastreams       [list|get|create|update|delete]
gacli admin custom-dimensions [list|get|create|update|archive]
gacli admin custom-metrics    [list|get|create|update|archive]
gacli admin key-events        [list|get|create|update|delete]
gacli admin audiences         [list|get|create|update|archive]
gacli admin access-bindings   [list|get|create|update|delete]
gacli admin firebase-links    [list|get|create|delete]
gacli admin google-ads-links  [list|get|create|update|delete]
gacli admin bigquery-links    [list|get|create|delete]
```

Most operations need `-p` (numeric property ID). `--name` arguments take the
**full resource name** like `properties/123/keyEvents/456`.

## Audience export

```bash
gacli audience export create  --audience <resourceName>
gacli audience export get     --name <resourceName>
gacli audience export list                       # uses -p
gacli audience export query   --name <resourceName> [--limit] [--offset]
gacli audience recurring [create|get|list]
```

## Auth & config

```bash
gacli auth [login|status|logout]
gacli config [set <key> <value>|get <key>|list]
```

## Filter shorthand

`field<op>value`, repeat for AND. Operators: `==`, `!=`, `=~`, `!~`, `>`,
`>=`, `<`, `<=`. See [references/filter-grammar.md](references/filter-grammar.md).

## Output formats

`-f table` (default, human), `-f json` (piping), `-f csv` (export),
`-f chart` (sparkline), `-f ndjson` (`report batch`). Status messages
to stderr, data to stdout.

## Date keywords

`today`, `yesterday`, `NdaysAgo` (case-sensitive: `7daysAgo` not `7DaysAgo`),
or `YYYY-MM-DD`.
