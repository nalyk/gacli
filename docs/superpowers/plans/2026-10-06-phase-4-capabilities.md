# Phase 4 — New capabilities: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the spec's new GA4 surface (§5.7), the agent/CI auth improvements (§5.6) and the raw `gacli api` escape hatch. The phase 2 review minors scheduled here are folded in.

**Architecture:**
- New operations follow the phase 2 pattern (`defineOperation`, admin helpers, `jsonArg`), so they appear in the CLI, `gacli schema` and MCP automatically.
- `gacli api` is a hand-written command. It resolves `<service>[.<version>] <Method>` against the SDK client prototype and validates `--body` with the SDK's `protos` (`fromObject`/`verify`).
- Auth changes stay inside `auth.service.ts`, `commands/auth/*` and `core/errors.ts`.

**Spec:** §5.6, §5.7, §6 row 4.

## Global Constraints

- Branch `feat/phase-4-capabilities` off `next` (after phase 3 merges). No AI attribution in commits.
- New ops take the default categories. Delete-like ops (annotation delete, measurement-secret delete) are `delete`. `report chat` is `read`. `report tasks create` is `create`.
- v1alpha Data methods use `getAlphaClient()` through new functions in `data-api.service.ts` (`getPropertyQuotasSnapshot`, `createReportTask`, `getReportTask`, `listReportTasks`, `queryReportTask`, `chat`, `runReportAlpha`). Reads are wrapped in `withRetry`.
- Scopes:
  - `GA4_SCOPES` stays readonly + edit.
  - `auth login --scopes readonly|edit|chat` maps to `readonly` → `[readonly]`, `edit` → `[readonly, edit]` (the default), `chat` → `[readonly, edit, analytics.chatbot.read]`.
  - Service-account `GoogleAuth` gets `GA4_SCOPES` + chatbot scope only when `GACLI_SCOPES=chat`. Otherwise it is unchanged.
- Auth precedence (spec §5.6): `GACLI_ACCESS_TOKEN` → OAuth tokens → `GOOGLE_APPLICATION_CREDENTIALS` → config `credentials` → ADC.
  - ADC is `new GoogleAuth({ scopes })` with no keyFile.
  - An ADC failure at call time ("Could not load the default credentials") maps to `auth` (exit 3), with a hint naming `gacli auth login` and `gcloud auth application-default login`.

## Review Focus

1. `GACLI_ACCESS_TOKEN` set and expired: the API's 401/UNAUTHENTICATED must exit 3 with a hint. It must not silently fall through to other credentials (Task 4).
2. `gacli api admin DeleteProperty --body '{"name":"properties/1"}'` with no `--yes` when non-interactive must exit 4 (Task 3).
3. `gacli api admin NoSuchMethod` must exit 2 and list close matches (Task 3).
4. `report chat` without the chatbot scope must give an actionable auth hint mentioning `auth login --scopes chat` (Task 2 + errors).
5. `report tasks query` on an unfinished task must surface the API state, not hang (Task 2).

---

### Task 1: Folded minors (controller)

- (a) `jsonArg` issues no longer repeat the flag ("--x: --x: …"). Issues set `path` (the index path inside the JSON). The adapter prefixes the flag once.
- (b) `report pivot`: `limit`/`offset` inside `--pivots` use `z.coerce`. The array branch's issues are reported, not "Invalid input".
- (c) A shared cell formatter in `src/core/render.ts`, applied to every table/csv cell before stringifying:
  - `{seconds, nanos}` → ISO timestamp
  - `{value: x}` (wrapper) → `String(x)`
  - Long-like `{low, high}` → number string
- [ ] Tests for each: render cells; jsonArg message has exactly one flag occurrence; pivot `"limit":"5"` accepted.
- [ ] Commit `fix: readable JSON-flag errors, pivot coercion, timestamps and wrappers in tables`.

### Task 2: Data API capabilities (subagent, worktree)

Ops:
- `report quota` → `GetPropertyQuotasSnapshot`.
- `report tasks create|get|list|query` (v1alpha ReportTask). `create` takes `--metrics/--dimensions/--start-date/--end-date/--limit`, like `report run`, and returns the task. `query` returns ReportData from the task.
- `report chat <question>`, with `--question <text>`, `--session <id>` and `-f json` (structured blocks). Its output is the `ResponseBlock`s rendered as text in table mode and the raw blocks in JSON.
- `report run`:
  - `--return-property-quota` adds `metadata.propertyQuota`.
  - `--conversion-spec <json>` (jsonArg) routes the call through the v1alpha client's `runReport`.
- `dataTruncationReasons`, when present, is copied into `ReportData.metadata` by `toReportData`.
- [ ] Tests per op with fake clients, as in phase 2. Commit `feat(ops): property quota, report tasks, chat, conversion spec`.

### Task 3: `gacli api` raw escape hatch (controller)

`gacli api <service> <Method> [--body <json|@file|@->] [--dry-run] [-y]`:
- `service` is `admin` (v1alpha default), `admin.v1beta`, `data` (v1beta), or `data.v1alpha`.
- Methods are camel or Pascal case (`ListProperties` or `listProperties`).
- An unknown method → usage error with up to 5 suggestions (prefix/levenshtein).
- The body is validated with `protos.<pkg>.<Method>Request.verify`. Errors → usage.
- A method whose name starts with `Delete`/`Archive` follows the delete gate (`--yes`). A `Create`/`Update`/`Delete`/`Archive`/`Batch`/`Provision`/`Acknowledge`/`Submit`/`Run`… method name is not a read; anything not starting with `Get`/`List`/`Search`/`Check`/`Query`/`Run*Report` is treated as mutating for `--dry-run`.
- Output is the raw response (`toPlain`) in the resource envelope.
- [ ] Tests:
  - resolution (Pascal/camel)
  - suggestions
  - verify failure → exit 2
  - delete gate → exit 4
  - dry-run prints `{service, method, request}`
  - happy path with a stubbed client factory
- [ ] Commit `feat(api): raw gacli api <service> <Method> escape hatch`.

### Task 4: Auth for agents and CI (controller)

- `GACLI_ACCESS_TOKEN`: an `OAuth2Client` with only `access_token` and no refresh.
- ADC fallback instead of throwing "No credentials configured". The mapping keeps the old message as a hint.
- `auth login --scopes`.
- `auth token` prints the current access token on stdout. It uses `getAccessToken()` of the resolved client and gives exit 3 when there is none.
- `auth status` goes through `writeOutput` with `-f json` support, showing mode, source and scopes.
- [ ] Tests:
  - precedence order (the existing test file is extended)
  - env token wins
  - ADC used when nothing is configured
  - ADC failure message maps to `auth`
  - `--scopes` mapping
  - `auth token` output
- [ ] Commit `feat(auth): GACLI_ACCESS_TOKEN, ADC fallback, --scopes, auth token, json status`.

### Task 5: Admin capabilities (subagent, worktree, parallel with Task 2)

- `admin accounts summaries`.
- `admin annotations list|create|update|delete` (reporting data annotations: title, description, color, `--annotation-date` or `--start-date/--end-date`).
- `admin change-history search --account <id> [--property] [--resource-type ...] [--action ...] [--earliest] [--latest]`.
- `admin access-report run --entity <properties/x|accounts/y> --dimensions --metrics --start-date --end-date --limit`.
- `admin measurement-secrets list|create|delete --stream <name>`.
- `admin data-retention get|update`.
- [ ] Tests per op. Commit `feat(ops): account summaries, annotations, change history, access report, measurement secrets, data retention`.

### Task 6: Register, docs, gate (controller)

- [ ] Register the new arrays. Add the group descriptions (`report tasks`, `admin annotations`, …).
- [ ] Docs:
  - `help.md` sections for the new commands
  - `extensions/_core/command-catalog.md` rows
  - the README feature list
  - `.env.example` gets `GACLI_ACCESS_TOKEN`
- [ ] Gate: `pnpm lint && pnpm type-check && pnpm build && pnpm test && pnpm verify:skills`. `gacli schema | jq '.operations|length'`, recording the count. MCP tool count, default read-only.
- [ ] Commit `docs: phase 4 capabilities`.
