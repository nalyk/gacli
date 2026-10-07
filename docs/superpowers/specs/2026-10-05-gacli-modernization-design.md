# gacli 2.0 — Modernization Design

Date: 2026-10-05 · Status: **approved, implemented in 2.0.0** (2026-10-06; see §10) · Path: architectural (multi-phase)

## 1. Intent

**What was asked:** "fully modernize this app", informed by deep web research, considering
`cloudflare/forge`. Brainstorm autonomously.

**Assumed outcome (correct me if wrong):**

- gacli becomes the best GA4 tool for **both humans and AI agents**: one operation catalogue
  that drives the CLI, the MCP server, the `schema` introspection command, the skills and the docs.
- It clearly differentiates from Google's official `analytics-mcp` (Python, read-only, 9 tools):
  full Admin write surface with safety rails, every Data API report type, shell piping, no Python.
- A **major version (2.0.0)** is acceptable. Default output when piped and exit codes change
  (both breaking). Every existing command name and flag keeps working.

**Success criteria**

1. `gacli --help` runs in under 150 ms (today 0.6–0.76 s; the GA SDKs alone cost about 500 ms at import).
2. Every operation has an input and output schema, and `gacli schema <cmd>` returns it as JSON.
3. MCP exposes **every read operation and every mutation** as typed tools with `outputSchema`
   and annotations, generated from the same catalogue (today it hand-writes 4 tools).
4. Agent-safe by default: JSON when stdout is not a TTY, never prompts when not interactive,
   documented exit codes, `--dry-run` on every mutation, deletes need `--yes`.
5. Zero `any` in the Admin service layer (83 today). `--no-color` is honored everywhere.
6. Type-check, tests, lint and `verify:skills` stay green after every phase.

## 2. Research findings that shaped this

| Source | Finding | Consequence |
|---|---|---|
| cloudflare/forge | OpenAPI → SDK/CLI code generator. 0.1.0, about 2 weeks old, not on npm, ships raw `.ts`. The CLI runtime lives in `cloudflare/cf` (yargs, Cloudflare-coupled). | **Do not adopt.** GA4 is gRPC/protobuf, not OpenAPI. **Borrow its patterns:** `CommandMeta` catalogue, read/create/update/delete/action categories that drive injected flags, `schema` command, agent detection that changes help, JSON by default when non-interactive, `--dry-run`, `--force` for deletes, `@file` input, a hint per status code. |
| googleworkspace/cli (`gws`) | Command surface built from discovery at runtime, `schema <method>`, `--dry-run`, NDJSON with `--page-all`, skills. | Same introspection model. A raw `api` escape hatch covers RPCs without a curated command. |
| wevm/incur | Zod-schema-first CLI with `--json/--schema/--llms/--mcp` built in. Pre-1.0, pins an MCP v2 alpha. | Too young to build on. Copy the feature set onto commander instead. |
| commander 15 | ESM-only, Node ≥22.12. | Bump. No reason to switch framework. |
| zod 4.6 | `z.toJSONSchema`, Standard Schema. MCP SDK v1 accepts zod 3.25 or 4. MCP SDK v2 needs zod ≥4.2. | zod 4 first, then MCP SDK v2. |
| MCP spec 2026-07-28 | Stateless, `server/discover`, multi-round-trip requests replace elicitation, Tasks extension, deterministic `tools/list`. | MCP SDK v2 (`@modelcontextprotocol/server`), which handles the protocol. Tool annotations plus `outputSchema` are mandatory for us. |
| GA Data 7.2 | Adds v1alpha `Chat` (new scope `analytics.chatbot.read`) and `dataTruncationReasons`. v1alpha `ReportTasks`, `GetPropertyQuotasSnapshot`, `ConversionSpec`. | New commands (phase 4). |
| GA Admin 10.x | No v1 stable. The default export **is v1alpha** (verified), so all admin commands work. v1beta deprecates ConversionEvent (we already use KeyEvents). New: reporting data annotations, subproperty sync, reporting identity settings, `SearchChangeHistoryEvents`, `RunAccessReport`. | New commands. Keep v1alpha. |
| google-auth-library 11 / data 7 / admin 10 | The only breaking change is Node ≥22, already met. | The uncommitted bumps are safe. Type-check and 83 tests pass on them. |
| Node 24 LTS / 26 | `util.styleText` (honors NO_COLOR), `module.enableCompileCache()`, `node --build-sea` from 25.5. | Drop chalk and boxen. Compile cache. SEA built on Node 26 in CI. |
| tsdown 0.23 / Rolldown 1.0 | Successor to tsup. | Single-file ESM bundle with the gRPC SDKs external. Prerequisite for SEA. |
| Vitest 5, TS 7, Biome 2.5 | Vitest 5 fails unawaited assertions. TS 7 (Go-based) is GA. | Vitest 5 and Biome 2.5 in phase 5. **TS 7 deferred** until biome and vitest are confirmed to work with it. |

## 3. Codebase audit findings (current state)

**Bugs to fix regardless of direction:**

- `pnpm-lock.yaml` is stale: it pins data 5.2.1, admin 9.0.1 and auth 10.6.2. A stray npm
  `package-lock.json` sits in a pnpm repo. CI `--frozen-lockfile` will fail.
- The formatters call `chalk` directly, so `--no-color` is ignored in tables and charts.
- `report batch` and `batch-pivot` print `--- Report N ---` to stdout, which breaks JSON and NDJSON piping.
- The MCP server hardcodes `VERSION='1.0.0'` while the package is 1.1.0.
- `error-handler` uses an unanchored regex `/(\d+)\s+(.*)/`, so it misparses arbitrary messages. It ignores `error.code`.
- `-f xml` silently falls back to table. `outputFormatSchema` lacks `ndjson` and is unused.
- `config get` and `auth login` URL output bypass `writeOutput` and stderr discipline.
- Auth precedence: the code (and its tests) put the env var before config, but the memory docs say config first. Fix the docs.
- Token and config writes are non-atomic. `~/.gacli` is created without `0700`. An existing token file keeps loose permissions.
- `parseInt` results are not NaN-checked in about 50 admin subcommands. None of the admin commands has a schema.
- Retry is skipped for audience and Admin calls, and daily-quota exhaustion is retried pointlessly.
- `src/index.ts` reads `../package.json` at runtime, which breaks under bundling or SEA.
- Deletes have no confirmation and no dry run.

**Structural debt:** 50 near-identical admin action bodies, order-by parsing in three places,
MCP logic duplicated from the commands, `Promise<any>` throughout the Admin service, and every
command module (and so every gRPC SDK) imported eagerly.

## 4. Approaches considered

**A. Incremental hardening:** bump dependencies and fix the bugs above. Low risk, but it leaves
MCP and CLI drift and the 50-file duplication in place. It meets none of the agent-first criteria.
*Rejected as the whole plan; it becomes phase 0.*

**B. Operation catalogue (recommended):** define each GA operation **once** as data, in the style
of forge/cf's `CommandMeta` but hand-authored in TypeScript. Each definition has a zod 4 input
schema, an output schema, a category, an API surface and a handler. Small generic adapters
project the catalogue onto commander, MCP, `gacli schema`, docs and skills. Commander stays,
and the service layer stays.

**C. Rewrite on incur:** gives most agent features for free, but it is a pre-1.0 framework
pinned to an MCP v2 alpha and would replace the whole command layer. *Rejected; revisit when it
reaches 1.0.*

**D. Generate from protobuf descriptors (gws-style):** full coverage of 156 Admin and 20+ Data
RPCs automatically, but poor flag ergonomics and a large generator project. *Rejected as the core.*
Its cheap subset, a raw `gacli api <Service.Method> --body @file` command that uses the SDK's
`protos` for validation, is included in phase 4 as an escape hatch.

## 5. Design (approach B)

### 5.1 Layout

```
src/
  core/
    operation.ts        # defineOperation(), OperationDef type, categories
    registry.ts         # lazy catalogue: id → loader (no SDK import at startup)
    errors.ts           # GacliError {kind, message, hint, grpcCode, exitCode}
    output.ts           # resolveFormat (TTY/agent aware), envelope, --fields projection
    agent.ts            # agent / CI / interactivity detection
    context.ts          # RunContext: globals, logger, stdout/stderr writers, interactive flag
  operations/
    report/*.op.ts      # run, pivot, batch, batch-pivot, realtime, cohort, funnel, quota, tasks, chat
    metadata/*.op.ts
    audience/*.op.ts
    admin/<resource>.op.ts   # one file per resource, CRUD via a resource helper
  adapters/
    cli.ts              # catalogue → commander commands (+ hand-written: auth, config, skills, explore, mcp, schema, api)
    mcp.ts              # catalogue → MCP tools (SDK v2)
    schema.ts           # catalogue → JSON (gacli schema, docs, skills catalog)
  services/             # unchanged role: thin SDK wrappers, now fully typed via SDK `protos`
  formatters/           # take ReportData (tables); json/ndjson take typed objects
```

### 5.2 Operation contract

```ts
export const listCustomDimensions = defineOperation({
  id: 'admin.custom-dimensions.list',          // → `gacli admin custom-dimensions list`, MCP `ga_admin_custom_dimensions_list`
  summary: 'List custom dimensions of a property',
  category: 'read',                              // read | create | update | delete | action
  api: { service: 'admin', version: 'v1alpha', rpc: 'ListCustomDimensions' },
  needsProperty: true,
  input: z.object({ pageSize: z.coerce.number().int().positive().optional() }),
  output: z.array(CustomDimension),
  table: (rows) => ({ headers: [...], rows: rows.map(...) }),   // projection to ReportData
  run: async (input, ctx) => (await ctx.admin()).listCustomDimensions(ctx.property, input),
});
```

- `category` drives the injected flags and annotations. Mutations get `--dry-run`, which prints
  the request that would be sent and exits 0. `delete` requires `--yes` (alias `--force`). When
  not interactive and `--yes` is missing, it exits 4 with the exact re-run command on stderr.
  In MCP: `readOnlyHint` for read; `destructiveHint` for delete and update; `idempotentHint` where true.
- `ctx.admin()` / `ctx.data()` / `ctx.dataAlpha()` lazy-`import()` the SDK. This replaces the
  module-level eager imports and keeps rule 6 (single client factory with the auth chain).
- CLI flags come from the input schema: names in kebab-case, descriptions from `.describe()`,
  variadic from arrays. Hand-tuned aliases (`-m`, `-d`) live in an optional `cli` override block,
  so **existing flag names are preserved exactly**.

### 5.3 Output contract

- Format resolution: an explicit `-f` wins. Otherwise `table` when stdout is a TTY and no agent is
  detected, else `json`. Detection uses `CI`, `CLAUDECODE`, `CODEX_THREAD_ID`, `CURSOR_AGENT`,
  `AI_AGENT` and `GACLI_AGENT`.
- `json` keeps today's `{rowCount, data, metadata?}` envelope for reports. Other operations emit
  `{data, metadata?}` with **typed values** (numbers stay numbers), not string tables. It is
  compact when not a TTY and pretty on a TTY.
- `ndjson`: one object per row. List operations stream every page (`--page-all`, default on for ndjson).
- `--fields a,b.c`: projection applied before formatting. Unknown fields exit 2.
- `table`, `csv` and `chart` go through `op.table()` → `ReportData`. The ReportData invariant
  survives, but **only for tabular formats**.
- Colour comes from `node:util` `styleText`, behind one `ctx.style()` that honors
  `--no-color`/`NO_COLOR`/`FORCE_COLOR`. chalk and boxen are removed.
- Spinners show only on a TTY with a non-JSON format and no agent detected.

### 5.4 Errors and exit codes (documented, stable)

| Exit | Meaning | Sources |
|---|---|---|
| 0 | ok (including `--dry-run`) | |
| 1 | API / internal error | gRPC 2, 4, 9, 10, 13, 14 after retries |
| 2 | usage / validation | zod, unknown flag, gRPC 3 INVALID_ARGUMENT |
| 3 | auth | gRPC 16, 7, missing credentials |
| 4 | confirmation required | delete without `--yes`, not interactive |
| 5 | not found | gRPC 5 |
| 6 | quota / rate limited | gRPC 8 (daily quota: no retry; per-minute: retry with backoff) |

- Core code throws `GacliError`. Only `adapters/cli.ts` calls `process.exit`, through
  `handleError` (still `never`, still terminal). MCP returns `isError: true` with the same
  `{code, message, hint}`.
- With a JSON format, errors go to stderr as `{"error":{"code","message","hint","grpcStatus"}}`.
- Classification uses `error.code` (a number) first, then an anchored message regex as a fallback.
- Retry wraps every read and idempotent call. Mutations are not retried. Daily-quota errors are detected and never retried.

### 5.5 MCP server

- Migrate to `@modelcontextprotocol/server` v2 (spec 2026-07-28, stateless), using the codemod
  where it applies.
- Tools are **generated from the catalogue**: name `ga_<id with _>`, `inputSchema` from the input
  schema plus `propertyId`, `outputSchema` from the output schema, `structuredContent` plus a text
  fallback, and annotations from the category. Ordering is deterministic.
- Mutating tools are **off by default**. `gacli mcp serve --allow-write` turns them on, and
  `--allow-delete` additionally exposes deletes. This mirrors the read-only stance of the official
  server but lets users opt in.
- Transports: stdio (default) and `--http <port>` Streamable HTTP bound to 127.0.0.1. HTTP is
  local-only with no OAuth; remote hosting is a non-goal.
- The server version comes from the build-time constant (see 5.8).

### 5.6 Auth and config

- Precedence (code and docs aligned; env-over-config is pinned by existing tests): `GACLI_ACCESS_TOKEN` env (new, for agents and CI) →
  OAuth tokens → `GOOGLE_APPLICATION_CREDENTIALS` → config `credentials` → **ADC fallback** (new;
  google-auth-library's default chain, which covers `gcloud auth application-default login`).
- `auth login --scopes readonly|edit|chat` (default `edit`, matching today's behaviour). `chat`
  adds `analytics.chatbot.read`.
- Writes are atomic (temp file + rename). The directory gets `0700` and files get `0600`, with
  permissions re-applied on every write. Corrupt JSON gives a warning on stderr instead of being
  silently ignored.
- New: `auth token` (prints an access token to stdout, for scripts) and `auth status --format json`.

### 5.7 New capabilities (from API research)

- Data: `report quota` (`GetPropertyQuotasSnapshot`), `report tasks create|get|list|query`,
  `report chat "<question>"` (v1alpha Chat, needs the `chat` scope), `--conversion-spec` on
  `report run`, `metadata.dataTruncationReasons` surfaced in output, `--return-property-quota`.
- Admin: `accounts summaries`, `annotations list|create|update|delete` (reporting data annotations),
  `change-history search`, `access-report run`, `measurement-secrets`, `data-retention get|update`.
  Any other RPC is reachable through `gacli api`.
- `gacli api <admin|data>[.v1alpha|.v1beta] <Method> [--body @file|@-|'<json>'] [--dry-run]`: a raw
  escape hatch, validated against the SDK `protos` via `fromObject`. Methods named `Delete*` need `--yes`.
- `@file` / `@-` accepted by every JSON-typed flag (filters, bodies).

### 5.8 Build, runtime, distribution

- Dependencies: zod 4, commander 15, `@modelcontextprotocol/server` v2 (replacing `sdk`), data
  7.2.x, admin 10.1.x, auth 11.1. Removed: chalk, boxen. Kept: ora (TTY only), cli-table3.
- `engines.node >=22.12`. CI matrix: 22, 24, 26.
- Build: **tsdown** single-file ESM `dist/gacli.mjs` with Google SDKs and gRPC external.
  `__GACLI_VERSION__` is injected at build time, replacing the runtime `package.json` read.
  `tsc --noEmit` stays the type gate.
- Startup: `module.enableCompileCache()` in the entry, the lazy registry, and lazy SDK import.
  Target: under 150 ms for `--help`, measured in CI as a regression check.
- SEA: built on Node 26 with `node --build-sea`, with `extensions/` embedded as SEA assets.
  Release attaches linux-x64, darwin-arm64 and win-x64 binaries to the GitHub release. **Best
  effort:** if a gRPC transitive dependency blocks SEA, use REST fallback (`fallback: true`) inside
  the binary. The npm package stays primary.
- Tooling: vitest 5, Biome 2.5 with `noExplicitAny: error` (src) and `noConsole: error` outside
  adapters/formatters. Add `packageManager` to package.json and Renovate. TS 7 deferred.

### 5.9 Docs, skills, agents

- `gacli schema [cmd]` prints the catalogue as JSON. `gacli schema --llms` prints a compact
  Markdown manifest.
- `--help` with an agent detected adds a 3-line "agent discovery" preamble (cf pattern).
- `help.md`, `extensions/_core/command-catalog.md` and the docs-site `llms.txt` are **generated**
  from the catalogue by a script. `verify:skills` fails on drift.
- CLAUDE.md, the serena memories (`architecture_patterns`, `command_pattern`) and the
  testing-conventions memory (which wrongly says Jest) are updated to the new contract.

### 5.10 Testing

- **Catalogue contract tests:** every op has id uniqueness, category, a JSON-Schema-convertible
  input and output, a `table()` projection, and a CLI path that collides with nothing.
- **Op unit tests:** run `op.run` against a fake client injected through `ctx` (no `vi.mock` of
  modules). Output is validated against `op.output`.
- **CLI e2e:** spawn the built bundle with `GACLI_TEST_FAKE=1` (fake client fixture). Snapshot
  stdout, stderr and the exit code for a TTY matrix (forced via env), `--dry-run`, and the delete
  gate. Covers the exit-code table.
- **MCP e2e:** in-memory client↔server. `tools/list` is snapshotted, and one read call and the
  write-gating are asserted.
- Coverage threshold raised from 50% to 75% on `src/core` and `src/operations`.

## 6. Phases (each gets its own plan → implementation → verification)

| # | Phase | Contents | Breaking? |
|---|---|---|---|
| 0 | Hygiene | regenerate the pnpm lockfile, delete `package-lock.json`, commit the SDK bumps (data 7.2.1), fix the bugs in §3 that don't depend on the catalogue (no-color, batch stdout, MCP version, regex, format validation, auth perms and atomic writes, precedence doc), lazy imports in `index.ts`, compile cache | no (1.x patch/minor) |
| 1 | Core | zod 4, commander 15, `src/core/*`, CLI adapter, `schema` command, output and exit-code contract | **yes → 2.0.0** |
| 2 | Migrate | report, metadata, audience, then admin (one resource helper and 11 resources) to operations; delete the old command files | no (surface preserved) |
| 3 | MCP v2 | generated tools, annotations, write gating, HTTP transport | MCP tool names change |
| 4 | New capabilities | §5.7 | additive |
| 5 | Build and dist | tsdown, SEA binaries, vitest 5, biome 2.5 strictness, Renovate, CI startup budget | no |
| 6 | Docs | generated help, skills catalog, llms.txt, README and CLAUDE.md and memory refresh | no |

Phases 1–3 ship together as the 2.0.0 release (on a `next` branch → `next` dist-tag, which
semantic-release is already configured for). Phase 0 ships first as 1.x.

## 7. Contract changes that conflict with the current CLAUDE.md and memories

These are flagged as required by CLAUDE.md, and approving this spec approves them:

- **Rule 3 (ReportData everywhere):** narrowed. Operations return typed objects. ReportData is the
  tabular projection used by table, csv and chart only.
- **Rules 4 and 7 (terminal `handleError` / `validate`):** still terminal, but only at the CLI
  adapter edge. Core throws `GacliError`, so MCP can reuse it without `process.exit`.
- **Rule 2 and command pattern:** `resolveGlobalOptions` moves inside the CLI adapter. Operations
  receive a `RunContext` and never touch commander.
- **Rule 6:** `getClient()`/`getAdminClient()` become `ctx.data()`/`ctx.admin()`, with the same
  single-factory guarantee.
- **Rule 10:** catalogue operations register automatically. Hand-written commands still use
  `program.addCommand`.
- **Ask-first items included here:** new or replaced dependencies (zod 4, commander 15, MCP v2,
  tsdown, vitest 5), `tsconfig`/`vitest.config`/`biome.json` edits, deletion of `package-lock.json`,
  public-surface changes (default format when piped, exit codes, MCP tool names, `--yes` on deletes).

## 8. Non-goals

OS-keyring token encryption (would need a native dependency), remote or hosted MCP with OAuth,
TS 7 migration, an interactive TUI beyond the existing `explore`, telemetry, generating commands
from protobuf at runtime, and Model Armor sanitization.

## 9. Risks

- **Flag-generation fidelity:** generating commander flags from zod could subtly change parsing
  (variadics, coercion). Mitigation: snapshot `--help` of every existing command before phase 2
  and diff after.
- **MCP v2 / spec 2026-07-28 client support:** older clients may only speak 2025-11-25. Verify
  that the v2 server negotiates down. If it cannot, stay on SDK v1 for 2.0 and move to v2 in 2.1.
- **SEA with gRPC:** best effort, with REST fallback (see 5.8).
- **Default JSON when piped:** surprises users who pipe tables. Mitigation: a 2.0 changelog note,
  plus `GACLI_FORMAT=table` or `config set format table`.

## 10. As shipped (audit 2026-10-07)

All §1 success criteria are met in 2.0.0 (`--help` ≈ 90–120 ms locally; CI gates it at 2× the
150 ms budget). Every §5.7 capability and every §3 bug fix landed. Deliberate deviations:

- **Clients:** no `ctx.admin()`/`ctx.data()`; operations call the lazy factories
  `getAdminClient()` / data service functions directly (same single-factory guarantee; CLAUDE.md rule 6).
- **Layout:** `src/core/{cli-adapter,mcp-adapter,render,catalog,invoke,confirm}.ts` instead of
  `adapters/` + `registry.ts`/`output.ts`/`context.ts`; tabular projection via `columns`, not `op.table()`.
- **Build:** code-split `dist/index.js` (lazy chunks serve the startup budget), not a single `dist/gacli.mjs`.
- **Dependencies:** Dependabot instead of Renovate.
- **SEA:** binaries do not embed `extensions/`; `skills install` from a binary needs `GACLI_EXTENSIONS_DIR`.
- **Tests (§5.10):** op tests `vi.mock` the service modules rather than injecting a fake client via
  `ctx`; there is no `GACLI_TEST_FAKE` e2e matrix or `tools/list` snapshot. The exit codes, delete gate
  and dry-run are covered in-process; help, schema, MCP (incl. protocol 2024-11-05 / 2025-06-18
  negotiation) and startup run against the built `dist`.
- **MCP annotations:** 2.0.0 marked update tools `destructiveHint: false`; fixed in 2.0.1 (updates
  are destructive; updates and deletes are `idempotentHint: true`).
