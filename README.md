# gacli

[![CI](https://github.com/nalyk/gacli/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nalyk/gacli/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen)
![ESM](https://img.shields.io/badge/ESM-only-blue)

Full-featured CLI for Google Analytics 4 — Data API + Admin API. Reports, realtime, funnels,
cohorts, audience exports, property management, streams, custom dimensions/metrics, key events,
audiences, integrations (Firebase, Google Ads, BigQuery). Also ships an
[MCP server](#model-context-protocol) so any LLM client (Claude Desktop, Cursor, Cline, Zed)
can call it as a tool, plus an interactive [`explore`](#interactive-explore) REPL for browsing
metric/dimension catalogs.

## Setup

Install from npm:

```bash
npm install -g @nalyk/gacli
```

Or build from source:

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
| `-f, --format <fmt>` | `table` (default), `json`, `ndjson`, `csv`, `chart` |
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

# NDJSON — one row per line, ideal for jq pipelines
gacli report run -m sessions -d country -f ndjson | jq 'select(.sessions | tonumber > 100)'

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

# Audience export, blocking until done
gacli audience export create --audience properties/371981488/audiences/12345 --watch

# Browse the metric/dimension catalog interactively
gacli explore

# Run as an MCP server (stdio) — see MCP.md
gacli mcp serve

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
  explore
  mcp serve
```

## Output formats

| Format | Usage |
|--------|-------|
| `table` | Colored ASCII table (default) |
| `json` | `{rowCount, data:[{...}]}` shape — pipe to `jq` |
| `ndjson` | One JSON object per line, newline-separated — clean piping into `jq -c`, ClickHouse, BigQuery loads |
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

## Environment variables

| Variable | Default | Effect |
|---|---|---|
| `GA4_PROPERTY_ID` | — | Default property when neither `--property` nor `config.property` is set |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service-account JSON; lowest-priority auth source |
| `GACLI_VERBOSE` | `0` | When `1`, error stack traces are printed alongside the human-readable error |
| `GACLI_MAX_RETRIES` | `3` | Max retries on retriable gRPC errors (codes 8 quota, 14 unavailable). Other errors never retry |
| `GACLI_RETRY_BASE_MS` | `500` | Base delay for exponential-backoff-with-jitter; capped at `base * 2^attempt` |

## Model Context Protocol

```bash
gacli mcp serve
```

Starts a stdio MCP server exposing four read-only tools — `gacli_report_run`,
`gacli_report_realtime`, `gacli_metadata`, `gacli_check_compatibility` — to any MCP client. The
server reuses gacli's existing auth chain, retry policy, and property resolution.

Wire-up examples for Claude Desktop, Cursor, Cline, and Zed are in [MCP.md](./MCP.md), including
how to pin different properties per client via the env block.

## Interactive explore

```bash
gacli explore
```

Loads the property's metric and dimension catalog and drops into a REPL with `list`, `search`,
`show <apiName>`, `custom`, and `help` commands. Tab-completion is available on `show <apiName>`.
Useful when you don't remember field names.

## Development

```bash
pnpm install
pnpm verify        # lint + type-check + test + build
pnpm test:watch    # vitest watch mode
pnpm dev <args>    # run from source (no build step)
```

Lint/format is [Biome](https://biomejs.dev), tests are [Vitest](https://vitest.dev). The CI
workflow runs `pnpm verify` on Node 22 and Node 24 for every push and PR.

## Documentation

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | This file — user setup and quick reference |
| [`help.md`](./help.md) | Verbose human-readable command reference (every flag, every example) |
| [`MCP.md`](./MCP.md) | MCP server setup for Claude Desktop, Cursor, Cline, Zed |
| [`PUBLISHING.md`](./PUBLISHING.md) | npm publish workflow (user-side steps for releasing this) |
| [`DISTRIBUTION.md`](./DISTRIBUTION.md) | Single-binary (Node SEA) build notes; multi-platform release tradeoffs |
| [`CLAUDE.md`](./CLAUDE.md) | Conventions Claude follows when working in this repo |

## Tech stack

Node 22+, ESM-only TypeScript 6, Commander 14, `@google-analytics/data` v5 + `/admin` v9,
`google-auth-library` v9, `@modelcontextprotocol/sdk` 1.x, zod, ora, chalk, cli-table3, boxen.
Dev: Vitest, Biome, tsx.
