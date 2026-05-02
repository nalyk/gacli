# Decision tree: which gacli command for which question?

Use this map to pick the right command on the first try.

## Property-resolution pre-flight (run BEFORE any property-requiring command)

1. `gacli config get property` — is there a default? If yes, use it.
2. Else check `GA4_PROPERTY_ID` env var.
3. Else: caller must supply `-p <id>`. Find one via
   `gacli admin properties list --account <accountId>` (and you'll need to
   `gacli admin accounts list` first to find the accountId).
4. If nothing works, halt and tell the user.

## Question → command

### Reads (Data API)

| User question | Command | Notes |
|---|---|---|
| "Show me X by Y" | `gacli report run -m X -d Y` | The default workhorse. |
| "What's happening right now?" / "Live stats" | `gacli report realtime -m X -d Y` | Last 30 min. |
| "Compare period A vs period B" | `gacli report batch --requests <file>` | Two report objects, two `dateRanges`. |
| "Cross-tab" / "matrix" | `gacli report pivot -m X -d A,B --pivots '[{"fieldNames":["A"]}]'` | |
| "Did users complete steps A→B→C?" | `gacli report funnel --steps '[…]'` | Requires JSON steps. |
| "Do users come back?" / "Retention by week" | `gacli report cohort -m X --cohorts '[…]'` | Requires cohort JSON. |
| "What dimensions/metrics exist?" | `gacli metadata get [--type dims\|metrics] [--search <term>]` | |
| "Can I combine these dims/metrics?" | `gacli metadata check-compatibility -m X -d Y` | Run BEFORE exotic combos. |

### Audience operations

| User question | Command |
|---|---|
| "Export this audience" | `gacli audience export create --audience properties/<P>/audiences/<aid>` |
| "Who's in this audience?" | `gacli audience export query --name <exportResourceName>` |
| "List active exports" | `gacli audience export list` |

### Writes (Admin API)

| User question | Command |
|---|---|
| "List/get/create/update/delete property" | `gacli admin properties [list\|get\|create\|update\|delete]` |
| "List/get/create/delete data stream" | `gacli admin datastreams ...` |
| "Custom dimensions" | `gacli admin custom-dimensions [list\|get\|create\|update\|archive]` |
| "Custom metrics" | `gacli admin custom-metrics ...` |
| "Mark a conversion / key event" | `gacli admin key-events ...` |
| "Audiences" | `gacli admin audiences [list\|get\|create\|update\|archive]` |
| "Who has access?" / "Add user" | `gacli admin access-bindings ...` |
| "Link Firebase" | `gacli admin firebase-links create --project <gcpProj>` |
| "Link Google Ads" | `gacli admin google-ads-links create --customer-id <id>` |
| "Link BigQuery" | `gacli admin bigquery-links create --project <gcpProj> [--daily-export-enabled true]` |

### Setup / introspection

| User question | Command |
|---|---|
| "Am I authenticated?" | `gacli auth status` |
| "How do I log in?" | `gacli auth login [--client-secret-file <path>]` |
| "What config values are set?" | `gacli config list` |
| "Set my default property" | `gacli config set property <id>` |
| "Interactive query session" | `gacli explore` |

## Format-selection rules

After picking the command, pick `-f`:

- **You will pipe to `jq` / parse / hand to another agent** → `-f json`.
- **User wants a spreadsheet / file** → `-f csv -o report.csv`.
- **Display directly to the human** → `-f table` (the default).
- **Trend over time, single metric** → `-f chart` for a quick sparkline.
- **`gacli report batch` only** → `-f ndjson` to get one report per line.

## Error-recovery routing

| Error | Probable cause | Action |
|---|---|---|
| Exit 1 / "Property ID required" | No `-p` and no default | Property-resolution pre-flight above. |
| Exit 16 / "Unauthenticated" | Token issue | `gacli auth status` then `gacli auth login` if needed. |
| Exit 7 / "Permission denied" | Principal lacks access | Confirm the OAuth user / SA email is added to the property. |
| Exit 3 / "Invalid argument" | Bad dim/metric name, scope mismatch, malformed JSON | `gacli metadata get` + `gacli metadata check-compatibility`. |
| Exit 8 / "Resource exhausted" | API quota | Back off and retry. Don't hammer. |
