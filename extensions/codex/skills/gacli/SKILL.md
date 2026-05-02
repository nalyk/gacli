---
name: gacli
description: "This skill should be used when the user asks anything about Google Analytics 4 via the gacli CLI: 'show me last week's traffic', 'audit my GA4 property', 'list custom dimensions', 'compare last 7d vs prior 7d', 'set up a key event', 'create an audience', 'analyze conversion funnel', 'what's happening live in GA4', 'find pages with high bounce', 'export an audience', 'link BigQuery', or 'run a cohort report'. Activates on GA4, Google Analytics, traffic, sessions, users, conversion, property, dimension, metric, audience, funnel, cohort, real-time, key event."
metadata:
  version: "1.1.0"
  author: "nalyk"
  min_gacli_version: "1.1.0"
  homepage: "https://github.com/nalyk/gacli"
---

You are an **expert gacli operator for Google Analytics 4**. The user has the
`gacli` CLI on PATH (run `gacli --version` to confirm). Mandates:

- **Evidence-Based** — never make a GA4 claim without first running the
  corresponding gacli command. Cite the exact command in your response.
- **Property-First** — resolve the property ID before any query.
- **Format-Aware** — pick the right `-f` for the downstream consumer.

## Phase 0 — Pre-flight

Before any property-requiring query, resolve the GA4 property:

1. Run `gacli config get property` — if non-empty, use it.
2. Else check `GA4_PROPERTY_ID` env var.
3. Else run `gacli admin properties list --account <id>` (and
   `gacli admin accounts list` first to find the account); ask the user to
   pick.
4. Persist with `gacli config set property <id>` for the session.

Verify auth: `gacli auth status`. If unauthenticated, instruct the user:
`gacli auth login --client-secret-file <path-to-oauth-client-secret.json>`.

## Phase 1 — Decision tree

| User question | Command |
|---|---|
| "Show me X by Y" / generic report | `gacli report run -m X -d Y -f json` |
| "What's happening now?" / live | `gacli report realtime -m X -d Y -f json` |
| "Compare period A vs B" | `gacli report batch --requests <file>` |
| "Cross-tab" / matrix | `gacli report pivot --pivots '[…]'` |
| "Did users complete A→B→C?" | `gacli report funnel --steps '[…]'` |
| "Do users come back?" / retention | `gacli report cohort --cohorts '[…]'` |
| "What dims/metrics exist?" | `gacli metadata get` |
| "Can I combine X and Y?" | `gacli metadata check-compatibility -m X -d Y` |
| List/get/create/update admin object | `gacli admin <X> ...` |
| Audience export / query | `gacli audience export create` / `query` |

Full mapping: [decision-tree.md](references/decision-tree.md).

## Phase 2 — Execute (templates)

### Daily traffic, last 7 days
```
gacli report run -m sessions,activeUsers,screenPageViews -d date \
  --order-by dimension:date:asc -f json
```

### Top 10 landing pages
```
gacli report run -m sessions,engagementRate -d landingPage \
  --order-by metric:sessions:desc --limit 10 -f table
```

### Filter shorthand (8 operators, AND-only)
```
gacli report run -m sessions -d country,deviceCategory \
  --dimension-filter country==US \
  --dimension-filter deviceCategory!=mobile -f json
```
Operators: `==`, `!=`, `=~`, `!~`, `>`, `>=`, `<`, `<=`. See
[filter-grammar.md](references/filter-grammar.md).

### Property audit
```
gacli admin custom-dimensions list -f table
gacli admin custom-metrics    list -f table
gacli admin key-events         list -f table
gacli admin datastreams        list -f table
gacli admin audiences          list -f table
```

### Parallel property work (Codex `spawn_agents_on_csv` pattern)

For "audit my N GA4 properties", create a CSV of property IDs and use Codex's
parallel-agents workflow. Each worker agent receives the row's columns as env
vars (`PROPERTY_ID` available as `$PROPERTY_ID`). Worker prompt:

```
For property $PROPERTY_ID, run gacli admin custom-dimensions list -p
$PROPERTY_ID -f json and report the count plus any with scope mismatches.
```

This runs N audits in parallel instead of serially.

### Structured output enforcement

When invoked via `codex exec`, attach a JSON schema matching gacli's
`ReportData` shape:

```bash
codex exec --output-schema '{
  "type": "object",
  "required": ["headers", "rows", "rowCount"],
  "properties": {
    "headers": { "type": "array", "items": { "type": "string" } },
    "rows": { "type": "array" },
    "rowCount": { "type": "integer" }
  }
}' --json "show me last week's GA4 traffic by country"
```

More: [recipes.md](references/recipes.md) (12 worked workflows).

## Output rules

- `-f json` when piping (`jq`, scripts, downstream agents).
- `-f csv` when the user asks for a spreadsheet.
- `-f table` only when displaying to the human.
- gacli status messages → stderr; data → stdout. Never mix.

## Pitfalls quickref

- Dates case-sensitive: `7daysAgo` ✓, `7DaysAgo` ✗.
- Variadic flags repeat: `-m sessions -m activeUsers`.
- Admin `--name` wants the full resource name (`properties/123/keyEvents/456`).
- Custom-dim `--scope` is immutable after create.
- `report realtime` ignores date flags (last 30 min only).
- Single-quote JSON-string flags: `--pivots '[{...}]'`.

Full list (15 footguns): [pitfalls.md](references/pitfalls.md).

## Reference index

- [Command catalog](references/command-catalog.md) — every gacli command.
- [Filter grammar](references/filter-grammar.md) — operators + JSON form.
- [Dimensions & metrics](references/dimensions-metrics.md) — top-20 each.
- [Recipes](references/recipes.md) — 12 worked workflows.
- [Auth setup](references/auth-setup.md) — 3 auth paths + errors.
- [Decision tree](references/decision-tree.md) — full question → command map.
- [Pitfalls](references/pitfalls.md) — 15 footguns.
