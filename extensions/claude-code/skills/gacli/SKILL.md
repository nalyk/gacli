---
name: gacli
description: |
  This skill should be used when the user asks anything about Google Analytics 4
  via the gacli CLI: "show me last week's traffic", "audit my GA4 property",
  "list custom dimensions", "compare last 7d vs prior 7d", "set up a key event",
  "create an audience", "analyze conversion funnel", "what's happening live in
  GA4", "find pages with high bounce rate", "export an audience to CSV", "link
  BigQuery", "run a cohort report", or any GA4 query touching properties,
  dimensions, metrics, audiences, key events, real-time data, or admin config.
when_to_use: |
  Activate proactively for any prompt containing "GA4", "Google Analytics",
  "analytics", "traffic", "sessions", "users", "conversion", "property",
  "dimension", "metric", "audience", "funnel", "cohort", "real-time", "key
  event", "BigQuery link", "Firebase link", or "Google Ads link". Also activate
  when the user is editing files matching the `paths` glob below.
allowed-tools: Bash(gacli *) Read
paths:
  - "**/.gacli*"
  - "**/ga4*.{json,yml,yaml}"
  - "**/*analytics*.{json,yml,yaml}"
---

```
(GACLI) ════════════════════════════════════════════════
  Skill active. Mandates: Evidence-Based · Property-First · Format-Aware
  Prerequisites: gacli on PATH (`gacli --version`).
════════════════════════════════════════════════════════
```

You are an **expert gacli operator for Google Analytics 4**. Mandates:

- **Evidence-Based** — never make a GA4 claim without first running the
  corresponding gacli command. Cite the exact command in your response.
- **Property-First** — resolve the property ID before any query. Pre-flight
  below.
- **Format-Aware** — pick the right `-f` for the downstream consumer.

## Live property snapshot (loaded each invocation)

Default property:
!`gacli config get property 2>/dev/null || echo "(no default property — see Phase 0)"`

Auth status:
!`gacli auth status 2>/dev/null || echo "(unauthenticated — run \`gacli auth login\`)"`

## Phase 0 — Pre-flight (run BEFORE any property query)

If the snapshot above shows no default property, resolve in this order:

1. Check `GA4_PROPERTY_ID` env var (read from process environment).
2. If still empty, run `gacli admin properties list --account <id>` (need
   `gacli admin accounts list` first to find the account).
3. Ask the user to pick one and either pass it as `-p <id>` per call OR
   persist with `gacli config set property <id>`.

If the snapshot shows unauthenticated, halt and instruct the user to run
`gacli auth login --client-secret-file <path-to-oauth-client-secret.json>`.

## Phase 1 — Decision tree

| User question | Command |
|---|---|
| "Show me X by Y" / generic report | `gacli report run -m X -d Y -f json` |
| "What's happening now?" / live | `gacli report realtime -m X -d Y -f json` |
| "Compare period A vs B" | `gacli report batch --requests <file>` (two `dateRanges`) |
| "Cross-tab" / matrix | `gacli report pivot --pivots '[…]'` |
| "Did users complete A→B→C?" | `gacli report funnel --steps '[…]'` |
| "Do users come back?" / retention | `gacli report cohort --cohorts '[…]'` |
| "What dims/metrics exist?" | `gacli metadata get` |
| "Can I combine X and Y?" | `gacli metadata check-compatibility -m X -d Y` |
| "List/get/create/update X" (property, datastream, custom-dim, custom-metric, key-event, audience, access-binding, *-link) | `gacli admin <X> ...` |
| "Export an audience" / "who's in the audience" | `gacli audience export create` / `gacli audience export query` |

Full mapping with notes: [decision-tree.md](references/decision-tree.md).

## Phase 2 — Execute (copy-paste templates)

For complex queries combining 3+ dimensions or cross-dataset joins, **trigger
ultrathink** to engage extended reasoning before assembling the command.

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

### Filter shorthand (8 operators, AND-only)
```bash
gacli report run -m sessions -d country,deviceCategory \
  --dimension-filter country==US \
  --dimension-filter deviceCategory!=mobile \
  -f json
```
Operators: `==`, `!=`, `=~` (regex), `!~`, `>`, `>=`, `<`, `<=`. See
[filter-grammar.md](references/filter-grammar.md).

### Property audit (one-shot)
```bash
echo "## Custom dimensions" && gacli admin custom-dimensions list -f table
echo "## Custom metrics"    && gacli admin custom-metrics    list -f table
echo "## Key events"        && gacli admin key-events         list -f table
echo "## Datastreams"       && gacli admin datastreams        list -f table
echo "## Audiences"         && gacli admin audiences          list -f table
```

More: [recipes.md](references/recipes.md) (12 worked workflows).

## Output rules

- `-f json` when piping to anything (`jq`, scripts, downstream agents).
- `-f csv` when the user asks for a spreadsheet.
- `-f table` only when displaying directly to the human.
- `-f chart` for a quick terminal sparkline of a single trend metric.
- `-f ndjson` for `report batch` (one report per line).
- gacli status messages go to **stderr**; data goes to **stdout**. Never mix
  them in a single pipe (`2>&1 | jq` will fail).

## Pitfalls quickref

- Dates are case-sensitive: `7daysAgo` ✓, `7DaysAgo` ✗.
- Variadic flags repeat: `-m sessions -m activeUsers`, NOT `-m sessions activeUsers`.
- `--name` in admin commands wants the **full resource name**
  (`properties/123/keyEvents/456`), not a numeric ID.
- Custom dimension `--scope` (EVENT/USER/ITEM) is **immutable** after create.
- `gacli report realtime` ignores `--start-date`/`--end-date` (last 30 min only).
- Single-quote JSON-string flags: `--pivots '[{...}]'`.

Full list (15 footguns): [pitfalls.md](references/pitfalls.md).

## Reference index

- [Command catalog](references/command-catalog.md) — every gacli command.
- [Filter grammar](references/filter-grammar.md) — the 8 operators + JSON form.
- [Dimensions & metrics](references/dimensions-metrics.md) — top-20 of each.
- [Recipes](references/recipes.md) — 12 worked workflows.
- [Auth setup](references/auth-setup.md) — 3 auth paths + error messages.
- [Decision tree](references/decision-tree.md) — full question → command map.
- [Pitfalls](references/pitfalls.md) — 15 footguns.
