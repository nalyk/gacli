# Migrating from gacli 1.x to 2.0

2.0 turns every GA4 command into a typed **operation**. One catalogue drives the CLI, `gacli schema`,
the MCP server and the docs. Every 1.x command name and flag string still works; what changed is
output defaults, exit codes, validation and safety. Each item below ends with the one-line fix for
scripts.

## Output

| 1.x | 2.0 | Fix |
|---|---|---|
| Table output unless `-f` was given | **Compact JSON when stdout is not a terminal**, in CI, or under an AI agent (`CLAUDECODE`, `CODEX_THREAD_ID`, `CURSOR_AGENT`, `AI_AGENT`, `GACLI_AGENT`). Tables on an interactive terminal. | Pass `-f table` (or `GACLI_FORMAT=table`) where a script parses tables. |
| Resource commands (`admin …`, `metadata get`) printed JSON keyed by table headers (`"Display Name": "…"`) | JSON is the API object: camelCase fields with typed values, `{rowCount, data}` for lists and `{data}` for single resources. Report commands keep `{rowCount, data, metadata}`. | Read `.data[].displayName` instead of `.data[]["Display Name"]`; `gacli schema <command>` shows each output schema. |
| `config set format …` was ignored (the `-f` default always won) | Config `format` now applies. | Remove stale `format` entries from `~/.gacli/config.json`, or keep them on purpose. |
| `chart` drew a box frame | Unframed chart. | — |
| OAuth login URL on stdout | On stderr. | — |

## Exit codes

| Meaning | 1.x | 2.0 |
|---|---|---|
| OK | 0 | 0 |
| API / internal error | 1 | 1 |
| Usage / validation error | 1 or 3 | **2** |
| Authentication / permission | 7, 16 | **3** |
| Confirmation required (`--yes`) | — | **4** |
| Not found | 5 | 5 |
| Quota exhausted | 8 | **6** |

With JSON output (or when piped), errors are a single line on stderr:
`{"error":{"code","message","hint","grpcStatus","exitCode"}}`.

**Fix:** update `case $?` blocks, using the 2.0 column above.

## Safety

- **Delete and archive commands need `--yes`** when not interactive; otherwise they exit 4 and print
  the exact command to re-run. On a terminal they ask `[y/N]`. **Fix:** add `--yes` to automated
  deletes and archives.
- Every create, update and delete command accepts `--dry-run`, which prints the request instead of
  calling the API.

## Stricter validation

- Property IDs must be numeric (`properties/` prefix allowed).
- Enum flags only accept their documented values:
  - custom-dimension and custom-metric scope
  - measurement unit
  - key-event counting method
  - audience clause type
  - data-stream type
  - `metadata get --type`
- Numeric flags must be numbers: `--limit`, `--offset`, `--default-value`, `--membership-duration-days`
  and cohort offsets. (In 1.x `report run --limit` always failed validation; it now works.)
- `--order-by` must be `metric:<name>[:desc]` or `dimension:<name>[:desc]`.
- `admin google-ads-links update` requires `--ads-personalization-enabled true|false`. In 1.x,
  omitting it cleared the setting.
- `admin datastreams create` requires the type-specific flag: `--uri`, `--package-name` or
  `--bundle-id`.

**Fix:** a script that relied on lenient parsing now gets exit 2 with a message naming the flag.

## MCP server

| 1.x | 2.0 |
|---|---|
| 4 read-only tools named `gacli_*` | Every operation is a tool named `ga_<command>` (e.g. `ga_report_run`, `ga_admin_custom_dimensions_list`) |
| — | Read-only by default; `--allow-write` adds create and update tools; `--allow-delete` adds delete and archive tools (which also need `confirm: true` and an explicit `propertyId`) |
| stdio only | stdio, or `--http <port>` (127.0.0.1 only) |
| JSON text results | `structuredContent` plus `outputSchema` per tool, and read-only/destructive annotations |

**Fix:** update tool names in prompts and allow-lists, and add `--allow-write` to the server args
where the model should change GA4 configuration.

## Platform

- Node.js **≥ 22.12** (commander 15, ESM-only).
- `main` was removed from `package.json`: gacli is a CLI, not an importable library.
- Credential precedence is documented and unchanged: `GACLI_ACCESS_TOKEN` (new) → OAuth tokens →
  `GOOGLE_APPLICATION_CREDENTIALS` → config `credentials` → Application Default Credentials (new
  fallback).

## New in 2.0

- `gacli schema [command…]` (JSON, or `--llms` Markdown) and `--fields a,b.c` on every operation.
- `gacli api <admin|data>[.version] <Method>`: call any of the 160+ GA4 RPCs by name.
- Data API: `report quota`, `report tasks create|get|list|query`, `report chat "<question>"`,
  `report run --return-property-quota` and `--conversion-spec`.
- Admin API: `accounts summaries`, `annotations`, `change-history search`, `access-report run`,
  `measurement-secrets`, `data-retention`.
- Auth for agents and CI: `GACLI_ACCESS_TOKEN`, `auth token`, `auth status -f json`,
  `auth login --scopes readonly|edit|chat`.
- JSON-valued flags accept `@file` and `@-`.
- Faster startup: `--help` in about 70 ms. Experimental single-executable binaries (see `DISTRIBUTION.md`).
