# gacli

[![Listed on Yoda Digital Open Source](https://img.shields.io/badge/listed%20on-opensource.yoda.digital-af9568?style=flat-square)](https://opensource.yoda.digital/en/projects/gacli/)
[![CI](https://github.com/nalyk/gacli/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nalyk/gacli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@nalyk/gacli?color=cb3837&logo=npm)](https://www.npmjs.com/package/@nalyk/gacli)
[![License: MIT](https://img.shields.io/github/license/nalyk/gacli?color=blue)](./LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A522.12-brightgreen)

A command-line client for the Google Analytics 4 Data and Admin APIs. It runs reports (standard,
realtime, pivot, funnel, cohort), audience exports and report tasks, and manages properties, data
streams, custom dimensions and metrics, key events, audiences and the Firebase, Google Ads and
BigQuery links. The same commands are available to AI clients through an
[MCP server](#model-context-protocol), and [`explore`](#interactive-explore) is a small REPL for
browsing a property's metric and dimension catalog.

gacli also ships skill packages for Claude Code, Codex, Qwen Code and Gemini CLI. One command
installs them, and from then on the agent knows how to drive gacli:

```bash
gacli skills install --agent claude --scope user
# or: --agent codex / qwen / gemini / all
```

Full guide: [extensions/README.md](extensions/README.md).

## What's new in 2.0

In 2.0 every GA4 command became a typed operation. One catalogue now drives the CLI, `gacli schema`,
the MCP server and the generated docs, so they can't drift apart. What that means in practice:

- When stdout is piped or an AI agent runs gacli, output is compact JSON and errors are one JSON
  line on stderr. Exit codes are stable: `2` usage, `3` auth, `4` needs `--yes`, `5` not found,
  `6` quota.
- Writes take `--dry-run`. Deletes and archives refuse to run without `--yes` unless someone is at
  the terminal to confirm. Every API command takes `--fields a,b.c` to trim its output.
- `gacli schema [command…]` prints the flags and the input/output JSON Schema of any command, and
  `llms.txt` is generated from the same data.
- Every operation is also an MCP tool with an `outputSchema`. The server is read-only unless you
  start it with `--allow-write` or `--allow-delete`.
- New commands cover the property quota, report tasks, chat, annotations, change history, access
  reports, Measurement Protocol secrets and data retention. For anything else, `gacli api <service>
  <Method>` calls the RPC by name.
- For CI and agents there is `GACLI_ACCESS_TOKEN`, a fallback to Application Default Credentials,
  and `gacli auth token`.
- `--help` returns in about 70 ms. The Google SDKs only load when a command actually calls the API.

If you have scripts written against 1.x, read [MIGRATION.md](./MIGRATION.md) first. The default
output when piped, the exit codes and the MCP tool names all changed.

## Setup

Install from npm:

```bash
npm install -g @nalyk/gacli
```

Verify the install was built from this exact GitHub repo at the published commit
(via [npm provenance](https://docs.npmjs.com/generating-provenance-statements) /
Sigstore attestation):

```bash
npm audit signatures
```

Or build from source:

```bash
pnpm install && pnpm build && pnpm link --global
```

Requires Node.js >= 22.12.

No Node? Each [GitHub release](https://github.com/nalyk/gacli/releases) also has standalone
binaries for Linux x64, macOS arm64 and Windows x64. They are experimental and about 160 MB each,
since they bundle the Node runtime. `gacli skills install` doesn't work from them; use the npm
package for that. See [DISTRIBUTION.md](./DISTRIBUTION.md).

### Updating an existing install

```bash
# See what's installed and what's available
npm view @nalyk/gacli version            # latest published version
gacli --version                          # your current version

# Upgrade in place (most users)
npm install -g @nalyk/gacli@latest

# Pin to a specific version
npm install -g @nalyk/gacli@1.2.3        # adjust to taste

# Pre-release channel (semantic-release publishes here from the `next` branch)
npm install -g @nalyk/gacli@next

# Verify the new install is signed by the GitHub repo
npm audit signatures
```

After upgrading, re-run `gacli skills install --agent <agent>`. Installed skills are copies, so a
new gacli version doesn't refresh them by itself. `--force` overwrites without asking:

```bash
gacli skills install --agent all --force
```

## Authentication

You can sign in interactively with OAuth 2.0 or use a service account key. Agents and CI can pass
an access token instead (see [Auth priority](#auth-priority)).

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

`GACLI_ACCESS_TOKEN` (agents/CI) > OAuth tokens > `GOOGLE_APPLICATION_CREDENTIALS` > `config set credentials`
file > Application Default Credentials. `gacli auth token >/dev/null` proves the credentials work (exit 3 if not).

### Managing auth

```bash
gacli auth status              # Show active auth method
gacli auth logout              # Remove saved OAuth tokens
gacli auth logout --revoke     # Revoke token at Google, then remove
```

`gacli auth login` requests `analytics.readonly` and `analytics.edit` by default. Use `--scopes
readonly` for read-only access, or `--scopes chat` to also get `analytics.chatbot.read`, which
`report chat` needs.

## Global options

| Flag | Description |
|------|-------------|
| `-p, --property <id>` | GA4 property ID (overrides config/env) |
| `-f, --format <fmt>` | `table`, `json`, `ndjson`, `csv`, `chart`. Default: `table` on a terminal, compact `json` when piped / in CI / under an AI agent (`GACLI_FORMAT` env overrides) |
| `-o, --output <file>` | Write output to file |
| `--no-color` | Disable colors (`NO_COLOR` honoured; colour off when piped unless `FORCE_COLOR`) |
| `-v, --verbose` | Verbose logging |

Property ID resolution: `--property` > `config.property` > `GA4_PROPERTY_ID` env var.

Every API operation also accepts `--fields a,b.c` (output projection); mutations accept `--dry-run`; deletes/archives need `-y, --yes` when not interactive. Exit codes: `0` ok, `1` API, `2` usage, `3` auth, `4` needs `--yes`, `5` not found, `6` quota. `gacli schema` describes every operation as JSON for scripts and AI agents.

## Quick start

```bash
# Set default property
gacli config set property 371981488

# activeUsers by day for the last 7 days
gacli report run -m activeUsers -d date

# Same report as JSON
gacli report run -m activeUsers -d date -f json

# NDJSON: one row per line, easy to filter with jq
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

# Search the dimension catalog
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

# Run as an MCP server over stdio (see MCP.md)
gacli mcp serve

# Current config
gacli config list
```

## Command structure

```
gacli
  auth login|logout|status|token
  report run|batch|pivot|batch-pivot|realtime|funnel|cohort|quota|chat
  report tasks create|get|list|query
  metadata get|check-compatibility
  audience export create|get|list|query
  audience recurring create|get|list
  admin accounts list|summaries
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
  admin annotations list|create|update|delete
  admin change-history search
  admin access-report run
  admin measurement-secrets list|create|delete
  admin data-retention get|update
  api <service> <Method>          # any Admin/Data RPC by name
  schema [command...]             # operations as JSON (flags, JSON Schema)
  config set|get|list
  skills install|uninstall|list|path|doctor
  explore
  mcp serve
```

## Output formats

| Format | Usage |
|--------|-------|
| `table` | Colored ASCII table, the default on an interactive terminal |
| `json` | Default when piped / in CI / under an AI agent (compact). Reports: `{rowCount, data:[{...}], metadata?}`; lists: `{rowCount, data}`; single resources: `{data}`. `gacli schema <cmd>` shows each shape |
| `ndjson` | One JSON object per line, handy for `jq -c`, ClickHouse or BigQuery loads |
| `csv` | RFC 4180 CSV for spreadsheets |
| `chart` | ASCII bar chart in terminal (unframed title + bars) |

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
| `GA4_PROPERTY_ID` | | Default property when neither `--property` nor `config.property` is set |
| `GOOGLE_APPLICATION_CREDENTIALS` | | Path to service-account JSON; used when no OAuth tokens exist, and takes precedence over `config.credentials` |
| `GACLI_ACCESS_TOKEN` | | Pre-obtained OAuth access token (agents/CI); wins over every other credential source |
| `GACLI_SCOPES` | | `chat` adds `analytics.chatbot.read` for service accounts / ADC |
| `GACLI_FORMAT` | | Default output format (overrides config, overridden by `-f`) |
| `GACLI_VERBOSE` | `0` | When `1`, error stack traces are printed alongside the human-readable error |
| `GACLI_MAX_RETRIES` | `3` | Max retries on retriable gRPC errors (codes 8 quota, 14 unavailable). Other errors never retry |
| `GACLI_RETRY_BASE_MS` | `500` | Base delay for exponential-backoff-with-jitter; capped at `base * 2^attempt` |

## Model Context Protocol

```bash
gacli mcp serve
```

This starts an MCP server over stdio (or local HTTP with `--http <port>`) where every gacli
operation is a typed tool: `ga_report_run`, `ga_admin_custom_dimensions_list` and so on. Tools
return `structuredContent` that matches their `outputSchema` and carry read-only or destructive
annotations. Only read tools are exposed unless you add `--allow-write` (create/update) or
`--allow-delete` (delete/archive, which also need `confirm: true`). Auth, retries and the default
property work the same as on the command line.

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
pnpm verify        # lint + type-check + build + test + skill-lint + docs:check
pnpm docs          # regenerate help.md / command catalog / llms.txt after changing operations
pnpm test:watch    # vitest watch mode
pnpm dev <args>    # run from source (no build step)
```

Lint/format is [Biome](https://biomejs.dev), tests are [Vitest](https://vitest.dev). CI runs lint,
type-check, build and tests (including the generated-docs drift check) on Node 22, 24 and 26 for every
push and PR to `main`/`next`, plus a startup-budget check and a packed-install smoke test on Node 24.

## Release automation

[semantic-release](https://github.com/semantic-release/semantic-release) cuts every release from
CI, based on [Conventional Commits](https://www.conventionalcommits.org/):

| Commit prefix | Release |
|---|---|
| `feat: …` | minor (`2.0.0` → `2.1.0`) |
| `fix: …`, `perf: …`, `refactor: …` | patch (`2.0.0` → `2.0.1`) |
| `docs(readme): …` | patch |
| `chore:`, `docs:`, `test:`, `ci:`, `build:`, `style:` | no release |
| `BREAKING CHANGE:` in the commit body | major (`2.0.0` → `3.0.0`) |

When commits land on `main`, `.github/workflows/release.yml` runs the verify gate, installs the
packed tarball as a smoke test, and then semantic-release picks the version. It tags `vX.Y.Z`,
publishes to npm with OIDC trusted publishing (no `NPM_TOKEN`), and creates the GitHub release.
The job then installs the published version from npm to check it, and starts the workflow that
attaches the standalone binaries.

`main` is a protected branch, so releases from it are tag-only. The bot doesn't commit the new
version back, which means `package.json` and `CHANGELOG.md` on `main` lag behind; the git tags,
npm and the GitHub release notes are authoritative. Pushes to `next` publish pre-releases under the
`@next` dist-tag (`x.y.z-next.N`), and those do get a `chore(release)` commit on `next`.

## Documentation

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | Setup and quick reference (this file) |
| [`MIGRATION.md`](./MIGRATION.md) | Upgrading from 1.x: output, exit codes, safety, MCP tool names |
| [`help.md`](./help.md) | Command reference; the operation sections are generated from the catalogue (`pnpm docs`) |
| [`llms.txt`](./llms.txt) | Compact operation reference for LLMs (generated) |
| [`MCP.md`](./MCP.md) | MCP server setup for Claude Desktop, Cursor, Cline, Zed |
| [`PUBLISHING.md`](./PUBLISHING.md) | npm release process: OIDC trusted publishing, first-time setup, day-to-day flow |
| [`DISTRIBUTION.md`](./DISTRIBUTION.md) | npm channels (latest / next) and experimental single-executable binaries |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute, the verify gate, architectural rules |
| [`SECURITY.md`](./SECURITY.md) | Security policy, vulnerability disclosure, hardening notes |
| [`LICENSE`](./LICENSE) | MIT |
| [`CLAUDE.md`](./CLAUDE.md) | Conventions Claude follows when working in this repo |

## Tech stack

Node ≥ 22.12, ESM TypeScript 6 bundled with tsdown, Commander 15, zod 4,
`@google-analytics/data` 7 + `/admin` 10, `google-auth-library` 11, MCP TypeScript SDK v2
(`@modelcontextprotocol/server` + `/node`), ora and cli-table3 (loaded on demand), `node:util`
`styleText` for colour. Dev: Vitest 5, Biome 2.5, tsx.
