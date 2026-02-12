# gacli

Full-featured CLI for Google Analytics 4 — Data API + Admin API. Reports, realtime, funnels, cohorts, audience exports, property management, streams, custom dimensions/metrics, key events, audiences, integrations (Firebase, Google Ads, BigQuery).

## Setup

```bash
pnpm install && pnpm build && pnpm link --global
```

Requires Node.js >= 22.

## Authentication

gacli supports two authentication methods: **OAuth 2.0** (interactive) and **service account** (JSON key file).

### OAuth 2.0 (recommended for personal use)

1. Create a **Desktop** OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Download the `client_secret_*.json` file
3. Run:

```bash
gacli auth login --client-secret-file ./client_secret.json
```

This opens a browser-based consent flow and saves tokens to `~/.gacli/oauth-tokens.json`.

To save the client secret path for future use:

```bash
gacli config set oauthClientSecretFile /path/to/client_secret.json
gacli auth login
```

### Service account

Set credentials via one of:

1. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. `gacli config set credentials /path/to/service-account.json`

### Auth priority

OAuth tokens (if present) > service account file > environment variable.

### Managing auth

```bash
gacli auth status              # Show active auth method
gacli auth logout              # Remove saved OAuth tokens
gacli auth logout --revoke     # Revoke token at Google, then remove
```

Scopes: `analytics.readonly`, `analytics.edit`.

## Global options

| Flag | Description |
|------|-------------|
| `-p, --property <id>` | GA4 property ID (overrides config/env) |
| `-f, --format <fmt>` | `table` (default), `json`, `csv`, `chart` |
| `-o, --output <file>` | Write output to file |
| `--no-color` | Disable colors |
| `-v, --verbose` | Verbose logging |

Property ID resolution: `--property` > `config.property` > `GA4_PROPERTY_ID` env var.

## Quick start

```bash
# Set default property
gacli config set property 371981488

# Simple report — activeUsers by day, last 7 days
gacli report run -m activeUsers -d date

# Same report as JSON
gacli report run -m activeUsers -d date -f json

# CSV for spreadsheets
gacli report run -m sessions -d country -f csv -o report.csv

# ASCII chart in terminal
gacli report run -m sessions -d date --start-date 30daysAgo -f chart

# Realtime
gacli report realtime -m activeUsers -d country

# List accounts
gacli admin accounts list

# List properties
gacli admin properties list --account 232284173

# Metadata — search dimensions
gacli metadata get --type dims --search "page"

# Dimension/metric compatibility check
gacli metadata check-compatibility -m sessions -m totalUsers -d country -d deviceCategory

# Top 10 pages by sessions
gacli report run -m sessions -d pagePath --order-by "metric:sessions:desc" --limit 10

# Custom dimensions
gacli admin custom-dimensions list

# Current config
gacli config list
```

## Command structure

```
gacli
  auth login|logout|status
  report run|batch|pivot|batch-pivot|realtime|funnel|cohort
  metadata get|check-compatibility
  audience export create|get|list|query
  audience recurring create|get|list
  admin accounts list
  admin properties list|get|create|update|delete
  admin datastreams list|get|create|update|delete
  admin custom-dimensions list|get|create|update|archive
  admin custom-metrics list|get|create|update|archive
  admin key-events list|get|create|update|delete
  admin audiences list|get|create|update|archive
  admin access-bindings list|get|create|update|delete
  admin firebase-links list|get|create|delete
  admin google-ads-links list|get|create|update|delete
  admin bigquery-links list|get|create|delete
  config set|get|list
```

## Output formats

| Format | Usage |
|--------|-------|
| `table` | Colored ASCII table (default) |
| `json` | Array of JSON objects, pipe to `jq` |
| `csv` | Properly escaped CSV, import into spreadsheets |
| `chart` | ASCII bar chart in terminal |

## Filters

Shorthand: `field==value`, `field!=value`, `field=~regex`, `field>100`, `field>=100`, `field<100`, `field<=100`.

```bash
gacli report run -m sessions -d country --dimension-filter "country==US"
gacli report run -m sessions -d pagePath --dimension-filter "pagePath=~/blog/"
gacli report run -m sessions -d date --metric-filter "sessions>100"
```

Multiple filters are combined with AND.

## Configuration

Stored in `~/.gacli/config.json`.

| Key | Description |
|-----|-------------|
| `credentials` | Path to service account JSON file |
| `property` | Default GA4 property ID |
| `format` | Default output format |
| `noColor` | Disable colors (`true`/`false`) |
| `verbose` | Verbose logging (`true`/`false`) |
| `oauthClientSecretFile` | Path to OAuth client secret JSON file |

## Tech stack

TypeScript 5.7+, ESM, Commander.js 14, `@google-analytics/data`, `@google-analytics/admin`, google-auth-library, chalk, ora, cli-table3, boxen, zod.
