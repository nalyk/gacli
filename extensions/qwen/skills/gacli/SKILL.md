---
name: gacli
description: "Audits Google Analytics 4 properties, queries traffic and conversion data, manages custom dimensions/metrics/key events/audiences, and runs funnel + cohort reports via the gacli CLI. Use when the user asks about GA4, Google Analytics, traffic, sessions, users, conversions, properties, dimensions, metrics, audiences, funnels, cohorts, real-time data, or admin configuration. Works by shelling out to the `gacli` binary on PATH."
---

# gacli — Expert Google Analytics 4 operator

## Overview

Comprehensive teaching for using the `gacli` CLI (40+ subcommands) to operate
Google Analytics 4 from a Qwen Code session. The agent shells out via the
standard Bash tool — no MCP, no extra setup beyond having `gacli` on PATH.

You are an **evidence-based GA4 analyst**. Mandates:

- **Evidence-Based** — never make a GA4 claim without first running the
  corresponding gacli command. Cite the exact command in your response.
- **Property-First** — resolve the property ID before any query.
- **Format-Aware** — `-f json` for piping, `-f csv` for export, `-f table`
  for human display.

## Core functions

1. **Reports** — `gacli report run|realtime|batch|pivot|batch-pivot|funnel|cohort`.
   The 7 report types cover every "show me data" question.
2. **Metadata** — `gacli metadata get` (list dims/metrics) and
   `gacli metadata check-compatibility` (validate combos before querying).
3. **Admin** — 10 sub-domains for properties, datastreams, custom dims/
   metrics, key events, audiences, access bindings, and Firebase / Google Ads /
   BigQuery integrations.
4. **Audience export** — one-time and recurring audience exports + member queries.
5. **Auth + config** — `gacli auth login|status|logout`, `gacli config set|get|list`.

Full surface in [reference.md](reference.md). Worked workflows in
[examples.md](examples.md). Deeper material in [references/](references/).

## Usage

Manual invocation:
```
/skills gacli
```

Auto-invocation: the model uses this skill whenever the conversation matches
the description's trigger keywords.

## Key Interaction Points

The skill **pauses for confirmation** in the following cases:

- Before any `gacli admin * delete` command.
- Before any `gacli admin * archive` command.
- Before `gacli auth logout --revoke`.
- Before `gacli config set credentials <new-path>` (changes auth).
- Before bulk operations affecting more than 5 properties / dimensions /
  metrics / key events.

For everything else (read operations, single-item creates/updates), proceed.

## Prerequisites

- `gacli` on PATH: `npm install -g @nalyk/gacli`. Verify with
  `gacli --version`.
- Authenticated to GA4: run `gacli auth status`. If unauthenticated:
  - OAuth: `gacli auth login --client-secret-file <path>`
  - Service account: `gacli config set credentials <path-to-sa.json>`
- A default GA4 property: `gacli config set property <numeric-id>` OR
  pass `-p <id>` per call OR set `GA4_PROPERTY_ID` env var.

## Quick Start

### Property-resolution pre-flight (before any query)

```bash
gacli config get property                                 # Default?
echo "GA4_PROPERTY_ID=$GA4_PROPERTY_ID"                  # Env override?
# If both empty:
gacli admin accounts list -f json                         # Find account
gacli admin properties list --account <id> -f json        # Find property
gacli config set property <id>                            # Persist default
```

### Daily traffic, last 7 days
```bash
gacli report run -m sessions,activeUsers,screenPageViews -d date \
  --order-by dimension:date:asc -f json
```

### Top 10 landing pages
```bash
gacli report run -m sessions,engagementRate -d landingPage \
  --order-by metric:sessions:desc --limit 10 -f table
```

### Property audit (one-shot)
```bash
gacli admin custom-dimensions list -f table
gacli admin custom-metrics    list -f table
gacli admin key-events         list -f table
gacli admin datastreams        list -f table
gacli admin audiences          list -f table
```

More worked recipes (12 total) in [examples.md](examples.md).

## Scripts

This skill ships no scripts of its own — gacli IS the script. Every workflow
is a shell command. The agent assembles them based on the user's question and
the decision tree in [references/decision-tree.md](references/decision-tree.md).

## Best Practices

1. **Always run the property-resolution pre-flight** before issuing any
   property-requiring command.
2. **Use `gacli metadata check-compatibility`** before assembling reports
   that combine user-scope dimensions with session-scope metrics.
3. **Pick the format by downstream consumer**: `-f json` for piping/parsing,
   `-f csv` for export, `-f table` for human display.
4. **Variadic flags repeat**: `-m sessions -m activeUsers`, NOT
   `-m sessions activeUsers`.
5. **Single-quote JSON-string flags**: `--pivots '[{...}]'`.
6. **Filters are AND-only** in the shorthand. For OR/NOT use the JSON
   `FilterExpression` form ([references/filter-grammar.md](references/filter-grammar.md)).
7. **`gacli auth status`** is your first stop for any cryptic auth error.
8. **Date keywords are case-sensitive**: `7daysAgo` ✓, `7DaysAgo` ✗.

## Recommended `.qwen/settings.json` template

For best UX, drop this into `.qwen/settings.json` (or merge with your
existing config). Auto-approves safe gacli reads, asks for write operations,
denies destructive ones:

```json
{
  "permissions": {
    "allow": [
      "Bash(gacli auth status)",
      "Bash(gacli auth login*)",
      "Bash(gacli admin * list)",
      "Bash(gacli admin * get)",
      "Bash(gacli metadata *)",
      "Bash(gacli report *)",
      "Bash(gacli audience export list)",
      "Bash(gacli audience export get*)",
      "Bash(gacli config get *)",
      "Bash(gacli config list)"
    ],
    "ask": [
      "Bash(gacli admin * create)",
      "Bash(gacli admin * update)",
      "Bash(gacli config set *)",
      "Bash(gacli audience export create*)"
    ],
    "deny": [
      "Bash(gacli admin * delete)",
      "Bash(gacli admin * archive)"
    ]
  }
}
```

DO NOT trust the model to generate this config from scratch — Qwen issue
#1910 confirms agents conflate hook/permission syntax across CLIs. Use
this template verbatim.
