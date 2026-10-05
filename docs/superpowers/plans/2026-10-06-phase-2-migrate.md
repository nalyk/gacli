# Phase 2 — Migrate every GA command to operations: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Data/Admin API command (65 of the 78 1.x leaves; 7 already migrated in phase 1, so 58 to go) becomes an operation in the catalogue. The legacy command files, the `any`-typed admin service functions and the unused param types are deleted.

**Architecture:**
- Task 1 adds small admin helpers (`src/operations/admin/_helpers.ts`) and a JSON-argument helper with `@file`/`@-` support. It also moves the group descriptions into the adapter and refactors the custom-dimensions pilot onto the helpers.
- Tasks 2–6 are independent. Each owns a disjoint set of new files and exports an `xxxOps` array. They run in parallel worktrees and do **not** touch shared files.
- Task 7 integrates: it registers all arrays, deletes the 1.x command files and legacy service code, and runs the 78-leaf help-compat check.

**Tech Stack:** as phase 1 (zod 4, commander 15, vitest 4).

**Spec:** `docs/superpowers/specs/2026-10-05-gacli-modernization-design.md` (§5.2, §5.7 `@file`, §6 row 2, success criteria 5)

## Global Constraints

- Branch `feat/phase-2-migrate` off `next` (after phase 1 merges). Worktree branches merge into it.
- No AI attribution in commits. Conventional commits.
- **Flag strings are copied verbatim** from the 1.x command (see `test/fixtures/help-v1/<path>.txt`). Input keys are commander's camelCase attribute names. Descriptions are copied from the 1.x help.
- Request bodies and update masks must match the 1.x command and service code exactly. The legacy code lives in `src/commands/**` and `src/services/admin-api.service.ts`.
- Table columns must match the 1.x `headers`. Delete-style outputs keep the 1.x two-column look.
- Categories:
  - `list`/`get`/`query`/report-style commands are `read`.
  - `create` is `create`, `update` is `update`.
  - `delete` **and `archive`** are `delete`.
  - `audience export create` is `create`.
- `needsProperty: true` exactly where the 1.x action called `validatePropertyId`.
- Admin reads are wrapped in `withRetry`; mutations are not. Data ops call the existing `data-api.service.ts` functions, which already retry.
- No `any` in new code (`biome` `noExplicitAny`). A cast to a precise type at the SDK boundary is fine.

## Review Focus

1. `report batch --requests f.json` with a missing file or invalid JSON must exit 2 with the file name, not 1 with a stack (Task 5).
2. `admin datastreams create --type WEB_DATA_STREAM` without `--uri` must fail clearly as usage (2), before any API call (Task 2).
3. Every JSON-string flag (`--pivots`, `--steps`, `--cohorts`, `--minute-ranges`, `--filter-clauses`) must accept `@file` and `@-`, and invalid JSON must exit 2 (Task 1 helper, used everywhere).
4. `admin access-bindings create --roles a b` must keep variadic semantics (Task 4).
5. `audience export create --watch` must still poll the long-running operation to completion (Task 6).

---

### Task 1: Helpers, group descriptions, pilot refactor (inline, by the controller)

**Files:**
- Create: `src/operations/admin/_helpers.ts`, `src/operations/json-arg.ts`
- Modify: `src/core/cli-adapter.ts` (`GROUP_DESCRIPTIONS`), `src/operations/admin/custom-dimensions.op.ts`
- Test: `test/operations/helpers.test.ts`

**Interfaces:**
- Produces in `json-arg.ts`: `jsonArg<T extends z.ZodType>(schema: T, what: string)`. It is a zod schema that accepts a string. The string is either inline JSON, `@path` (read that file), or `@-` (read stdin). It parses the JSON, then validates with `schema`.
  - Parse errors and missing files become zod issues, so they exit 2.
  - The message names `what` and the file.
  - Its JSON Schema `io:'input'` is `{type:'string'}`.
- Produces in `_helpers.ts`:
  ```ts
  export type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;
  export const adminApi: (rpc: string) => { service: 'admin'; version: 'v1alpha'; rpc: string };
  export function parentOf(kind: 'property' | 'account', id: string): string; // properties/123 | accounts/9
  export function listOp(o: { id; summary; rpc; item: z.ZodType; columns: Column[]; call: (c: AdminClient, ctx: RunContext, input) => Promise<unknown[]>; input?: z.ZodObject; flags?; needsProperty?: boolean }): OperationDef;
  export function getOp(o: { id; summary; rpc; item; columns; label: string; call: (c, name: string) => Promise<unknown> }): OperationDef; // input { name } flag '--name <resourceName>'
  export function removeOp(o: { id; summary; rpc; label: string; verb: 'delete' | 'archive'; call: (c, name: string) => Promise<unknown> }): OperationDef;
  //   category 'delete'; output { name, deleted: true } | { name, archived: true }; columns Status ('Deleted'|'Archived'), <label>
  export function updateMask<T extends object>(input: T, map: Partial<Record<keyof T, string>>): { body: Partial<T>; paths: string[] };
  //   includes a key when input[key] !== undefined; paths use the snake_case names from map
  ```
- `GROUP_DESCRIPTIONS` gains every 1.x group description, e.g. `'admin custom-dimensions': 'Manage GA4 custom dimensions'`, `'audience export': 'Audience export operations'`, `'audience recurring': 'Recurring audience list operations'`.

- [ ] Tests:
  - `jsonArg` parses inline JSON, `@file` (tmp file) and `@-` (stub `readFileSync(0)` via injecting a reader parameter for tests: `jsonArg(schema, what, read = defaultRead)`).
  - Invalid JSON gives a zod error mentioning `what`. A missing file gives an error mentioning the path.
  - `updateMask({displayName:'x', description: undefined}, {displayName:'display_name', description:'description'})` returns `{ paths: ['display_name'] }`.
  - `removeOp` output and category.
  - `listOp` calls `call` with the context.
- [ ] Phase-1 review minors folded in here, each test-first:
  - (a) Usage messages from zod name the **flag** (`--start-date`), not the key. Text mode prints no doubled `✖`. Approach: the adapter catches ZodError and rethrows `GacliError('usage', lines)`, mapping issue paths through `describeFlags`.
  - (b) An invalid `-f` gives a JSON error when piped or under an agent: `resolveGlobalOptions` calls `setJsonErrors` with the auto-format decision before throwing.
  - (c) `mountOperations` throws when an input key is reserved (`fields`, `yes`, `dryRun`, `force`). A boolean field with default `true` gets a `--no-<name>` flag. A required boolean is mandatory.
- [ ] Refactor custom-dimensions onto `getOp`/`listOp`/`removeOp`/`updateMask`. The pilot tests stay green unchanged.
- [ ] Commit `feat(ops): admin op helpers and @file-capable JSON arguments`

### Tasks 2–6: Resource and data migrations (parallel; one worktree each)

Each task creates `src/operations/<group>/<resource>.op.ts` exporting the ops and a `<resource>Ops` array, plus `test/operations/<group>-<resource>.test.ts`. It must not edit `src/operations/index.ts`, `src/cli.ts`, `src/commands/**` or the legacy service. Per resource, the tests:
- run each op through `vi.mock` fakes, as in `test/operations/pilot.test.ts`;
- assert the exact request (parent/name/body/updateMask) that 1.x sent;
- assert `op.output.safeParse(result).success`;
- assert `category` (delete/archive → `'delete'`).

Watch them fail first, implement, run `pnpm vitest run test/operations/<file>` and `pnpm type-check`, then commit `feat(ops): migrate <group> <resources>`.

- **Task 2:** `admin accounts list`, `admin properties {list,get,create,update,delete}`, `admin datastreams {list,get,create,update,delete}`.
  - Properties list's 1.x filter/account semantics are preserved.
  - Datastreams create validates the type-specific required flag in zod via `superRefine`: WEB needs `uri`, ANDROID needs `packageName`, IOS needs `bundleId`.
- **Task 3:** `admin custom-metrics {list,get,create,update,archive}`, `admin key-events {list,get,create,update,delete}`, `admin audiences {list,get,create,update,archive}`. Audiences' `--filter-clauses` uses `jsonArg`.
- **Task 4:** `admin access-bindings {list,get,create,update,delete}`, `admin firebase-links {list,get,create,delete}`, `admin google-ads-links {list,get,create,update,delete}`, `admin bigquery-links {list,get,create,delete}`. Access-bindings `--parent` replaces `needsProperty`, exactly as in 1.x.
- **Task 5:** `report {batch,pivot,batch-pivot,realtime,cohort,funnel}` and `metadata check-compatibility`.
  - `batch`/`batch-pivot` are `kind: 'reports'`. `--requests <path>` reads a file with `jsonArg`-style errors. The flag keeps the plain path semantics of 1.x, and `@`-prefix is optional.
  - JSON flags use `jsonArg`.
- **Task 6:** `audience export {create,get,list,query}` and `audience recurring {create,get,list}`. `--watch` polls as in 1.x.

### Task 7: Integrate and delete legacy code (controller)

**Files:**
- Modify: `src/operations/index.ts`, which registers all arrays in 1.x command order.
- Delete:
  - `src/commands/{admin,report,metadata,audience}/**`
  - the `src/cli.ts` addCommand lines for those groups
  - every function in `src/services/admin-api.service.ts` except `getAdminClient` (renamed from `getClient`)
  - the now-unused `src/types/admin-api.ts`
  - unused exports in `src/validation/schemas.ts`, including `outputFormatSchema` (deferred minor from phase 0)
  - `GlobalOptions.formatExplicit`, if still unused
  - the duplicate `isInteractive` in `utils/interactive-prompt.ts`, so that `skills install` uses `core/agent.ts`
  - `src/utils/spinner.ts`, only if it is unused
- Modify: the MCP server and `explore`, but only the imports they need to keep compiling.

- [ ] Run `pnpm build && pnpm test`. All 78 help-compat leaves pass, and `grep -rn "noExplicitAny\|: any\|as any" src/services/admin-api.service.ts` is empty.
- [ ] `pnpm lint` warning count drops. Record the before and after numbers.
- [ ] Commit `refactor!: every GA command is an operation; remove legacy command and admin service code`.

### Task 8: Docs and gate

- [ ] Regenerate the `help.md` command sections only where flags changed (dry-run/yes/fields). Every delete/archive example gets `--yes`. CLAUDE.md rule 4 names the allowed `process.exit` sites (`skills/install.ts`, `auth/login.ts`). Refresh the stale serena memories `code_style_conventions` and `codebase_structure`. Update `.serena/memories/codebase_structure.md` and `key_entrypoints.md` to the new layout.
- [ ] Gate: `pnpm lint && pnpm type-check && pnpm build && pnpm test && pnpm verify:skills`, plus `node dist/index.js schema | jq '.operations | length'`. Expected: **65** (78 leaves − 13 hand-written: `auth`×3, `config`×3, `explore`, `mcp serve`, `skills`×5).
- [ ] Commit `docs: phase 2 layout`.
