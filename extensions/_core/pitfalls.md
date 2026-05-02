# 15 gacli footguns to avoid

The non-obvious failure modes a fresh AI agent will hit. Read once.

## Output / format

1. **stderr ≠ stdout.** Status messages, spinners, and warnings go to stderr;
   only the data payload goes to stdout. Pipe `gacli ... -f json | jq` works
   correctly. `gacli ... 2>&1 | jq` will fail because spinner ANSI bytes mix in.
2. **Default `--format` is `table`**, which is human-readable and NOT
   parseable. Use `-f json` whenever you intend to pipe or parse.
3. **`-f ndjson` is for `report batch`** — one report per line. For single
   reports use `-f json`.
4. **`-f chart`** renders a sparkline. Visual only; do NOT pipe it.

## CLI arg syntax

5. **Variadic flags repeat the flag**: `-m sessions -m activeUsers` works.
   `-m sessions activeUsers` does NOT — Commander interprets the second value
   as a positional argument.
6. **JSON-string options need single-quoting in shell**: `--pivots '[{...}]'`.
   Double-quotes require escaping every inner quote.
7. **Date keywords are case-sensitive**: `7daysAgo` ✓, `7DaysAgo` ✗,
   `7 days ago` ✗.

## Property + auth

8. **Property ID is numeric** on the CLI (`371981488`), never with the
   `properties/` prefix. The prefix DOES appear in `--name` arguments to
   admin commands (full resource names).
9. **Property resolution order**: `--property` flag → `~/.gacli/config.json`
   `property` key → `GA4_PROPERTY_ID` env var. If all empty, every
   property-requiring command exits with a setup hint.
10. **Auth precedence**: OAuth tokens at `~/.gacli/oauth-tokens.json` →
    service account from `gacli config set credentials <path>` →
    service account from `GOOGLE_APPLICATION_CREDENTIALS` env var. Use
    `gacli auth status` to confirm which is active.

## Admin / write surface

11. **`--name` in admin commands expects the full resource name**, e.g.
    `properties/123/keyEvents/456`. Numeric ID alone fails. Get the full
    name from a `list` call (`-f json | jq -r '.rows[0].name'`).
12. **Custom dimension `--scope` is immutable** after create (EVENT/USER/ITEM).
    Wrong scope = delete and recreate.
13. **Realtime ignores `--start-date`/`--end-date`** — always last 30 minutes.

## Pipeline / shape

14. **Every result is `ReportData`** (`{headers, rows, rowCount}`). Even
    "Deleted X" responses get coerced into a 1×N row. Formatters depend on
    this. `gacli ... -f json` always returns this shape.
15. **`metadata check-compatibility` BEFORE exotic combos.** Mixing
    user-scope dimensions with session-scope metrics often returns sparse
    or empty data. Validate first: `gacli metadata check-compatibility -p <P>
    -m firstUserSource -d engagementRate`.
