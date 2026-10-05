# Phase 0 — Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every catalogue-independent defect found in the audit and cut startup cost, shipped as a non-breaking 1.x release.

**Architecture:** No structural change yet. The existing commander → service → ReportData → formatter pipeline stays. We add three small utilities (`style`, `secure-fs`, `version`), make the services lazy-load the GA SDKs, and split the entry point so the compile cache turns on before anything heavy loads.

**Tech Stack:** Node ≥22, TypeScript 6, commander 14, zod 3, vitest 4, biome 2.4, pnpm 10. No framework upgrades in this phase.

**Spec:** `docs/superpowers/specs/2026-10-05-gacli-modernization-design.md` (§3 bug list, §6 row 0)

## Global Constraints

- Branch: `chore/phase-0-hygiene` off `main`. Conventional commits (`fix:`, `perf:`, `chore:`, `docs:`) with no `feat!`/`BREAKING CHANGE`, because this phase must release as 1.x.
- **No AI attribution in commits** (user memory: never add `Co-Authored-By` Claude or AI footers in this repo).
- Exit codes stay exactly as today (3, 5, 7, 8, 16, else 1). The new exit-code table is phase 1.
- Default `--format` stays `table`. CLI flags and commands are unchanged.
- Relative imports end in `.js`. Status output goes to stderr via `logger`, data to stdout via `writeOutput`.
- Credential precedence stays as tested: OAuth tokens → `GOOGLE_APPLICATION_CREDENTIALS` → config `credentials`.
- Gate after every task: `pnpm lint && pnpm type-check && pnpm test` are green.

## Review Focus

1. `-o out.txt` on `report batch` with two or more requests: today each report overwrites the file. Expect both in one file (Task 5).
2. `NO_COLOR=1` with no `--no-color` flag: expect zero ANSI escapes in table and chart output (Task 2).
3. A non-gRPC error whose message contains `digits + space`, e.g. `ENOENT: open '/x/404 report.json'`: today it is misread as gRPC code 404. Expect exit 1 with the original message (Task 3).
4. A token file that already exists with mode `0644`: today `saveOAuthTokens` leaves it world-readable. Expect `0600` after save (Task 6).
5. `gacli --version` / `--help` with no credentials: must work and must not load `@google-analytics/*` (Task 7).

---

### Task 1: Dependency and lockfile hygiene

**Files:**
- Modify: `package.json` (deps, `packageManager`)
- Regenerate: `pnpm-lock.yaml`
- Delete: `package-lock.json`

- [ ] **Step 1:** `git checkout -b chore/phase-0-hygiene`
- [ ] **Step 2:** Set `@google-analytics/data` `^7.2.1`, `@google-analytics/admin` `^10.1.1`, `google-auth-library` `^11.1.0`. Add `"packageManager": "pnpm@10.29.3"`.
- [ ] **Step 3:** `rm package-lock.json && pnpm install`
- [ ] **Step 4:** Verify: `pnpm install --frozen-lockfile` exits 0. `grep -c "@google-analytics/data@7.2" pnpm-lock.yaml` ≥ 1. `pnpm type-check && pnpm test` shows 83 passed.
- [ ] **Step 5:** Commit `chore(deps): GA data 7.2, admin 10.1, auth 11.1; regenerate pnpm lockfile`

### Task 2: One colour path that honours `--no-color` and `NO_COLOR`

**Files:**
- Create: `src/utils/style.ts`
- Modify: `src/utils/logger.ts`, `src/formatters/table.formatter.ts`, `src/formatters/chart.formatter.ts`, `src/types/common.ts` (`resolveGlobalOptions` calls `setColorEnabled`), `package.json` (remove `chalk`, `boxen`)
- Test: `test/utils/style.test.ts`, `test/formatters/table.formatter.test.ts`, `test/formatters/chart.formatter.test.ts` (new)

**Interfaces:**
- Produces: `style(format: Parameters<typeof styleText>[0], text: string): string` and `setColorEnabled(enabled: boolean): void`, both in `src/utils/style.ts`. The logger and formatters use only these.

- [ ] **Step 1: Write failing tests**
  - `style.test.ts`:
    - `setColorEnabled(false)`, then `style('red','x') === 'x'`.
    - `setColorEnabled(true)` with `NO_COLOR` deleted from env: output contains `\x1b[`. With `validateStream: false` the TTY is not checked, so this holds under vitest.
    - With `NO_COLOR=1` and `setColorEnabled(true)`, `style('red','x') === 'x'`.
  - `table.formatter.test.ts`: `it('emits no ANSI when colour disabled')`. After `setColorEnabled(false)`, `formatTable(data)` does not match `/\x1b\[/`.
  - `chart.formatter.test.ts`, colour disabled:
    - two rows produce output without ANSI that contains `'sessions by country'` and `'█'`;
    - empty rows produce `'No data to chart.'`;
    - one column produces the "requires at least two columns" message.
- [ ] **Step 2:** `pnpm vitest run test/utils/style.test.ts test/formatters` fails (module missing).
- [ ] **Step 3: Implement `style.ts`** as a module-level `enabled` flag and `styleText(format, text, { validateStream: false })` gated by `enabled && !process.env.NO_COLOR`.
  - Logger: replace its private `c()` with `style`.
  - Table: header `style(['cyan','bold'], h)`, footer `style('gray', …)`.
  - Chart: keep layout and drop the boxen frame. The title line plus rows is the whole output, and `BAR_COLORS` becomes a list of `styleText` colour names.
  - `resolveGlobalOptions`: call `setColorEnabled(!noColor)`.
- [ ] **Step 4:** `pnpm remove chalk boxen`. `grep -rn "chalk\|boxen" src` is empty. Tests pass.
- [ ] **Step 5:** Commit `fix(output): honour --no-color/NO_COLOR in tables and charts; replace chalk+boxen with util.styleText`

### Task 3: Error classification and quota-aware retry

**Files:**
- Create: `src/utils/grpc-error.ts`
- Modify: `src/utils/error-handler.ts`, `src/utils/retry.ts`
- Test: `test/utils/grpc-error.test.ts` (new), `test/utils/retry.test.ts`

**Interfaces:**
- Produces, all in `src/utils/grpc-error.ts`:
  - `getGrpcCode(err: unknown): number | undefined` uses numeric `err.code` (0–16) first, else the anchored `^(\d+)\s`.
  - `getGrpcMessage(err: Error): string` strips `^\d+\s+(?:[A-Z_]+:\s*)?`.
  - `isDailyQuotaError(err: unknown): boolean` is code 8 and the message matches `/per day/i`.

- [ ] **Step 1: Write failing tests**
  - `getGrpcCode`:
    - `Object.assign(new Error('boom'),{code:7})` → 7.
    - `new Error('5 NOT_FOUND: x')` → 5.
    - `new Error("ENOENT: open '/x/404 report.json'")` → undefined.
    - `{code:'ENOENT'}` → undefined.
  - `getGrpcMessage(new Error('7 PERMISSION_DENIED: no access'))` → `'no access'`.
  - `isDailyQuotaError(new Error('8 RESOURCE_EXHAUSTED: Exhausted property tokens per day for a project per property'))` → true; same with `per hour` → false.
  - `retry.test.ts`, new case `does NOT retry daily-quota exhaustion`: `fn` is called exactly once.
- [ ] **Step 2:** Run the tests: they fail.
- [ ] **Step 3: Implement.**
  - `handleError`:
    - Use `getGrpcCode` and `getGrpcMessage`, with the same exit codes and messages as today.
    - Add stderr hints for 4 `Deadline exceeded — retry or narrow the date range` and 14 `Service unavailable — retry shortly` (both exit 1).
    - For 8 with `isDailyQuotaError`, the message ends `Daily quota exhausted; resets at midnight Pacific.`
    - Print the stack when `GACLI_VERBOSE==='1'` **or** `logger.isVerbose()`. Add a public getter to the logger.
    - Remove the dead `break`s.
  - `retry.ts`:
    - Replace the local `extractGrpcCode` with `getGrpcCode`.
    - Skip retry when `isDailyQuotaError`.
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5:** Commit `fix(errors): classify gRPC errors by code, not unanchored regex; never retry daily quota`

### Task 4: Validate `--format`; allow `ndjson` in config

**Files:**
- Modify: `src/types/common.ts`, `src/types/config.ts`, `src/validation/schemas.ts`
- Test: `test/types/common.test.ts` (new)

**Interfaces:**
- Produces: `OUTPUT_FORMATS = ['table','json','ndjson','csv','chart'] as const` exported from `src/types/common.ts`. `OutputFormat = (typeof OUTPUT_FORMATS)[number]`.

- [ ] **Step 1: Write failing tests.** Build a commander `Command`, parse `['-f','xml']`, then call `resolveGlobalOptions`. Use `vi.mock` of `config.service.js` returning `{}`.
  - It throws `Error` with the message `Invalid format "xml". Valid: table, json, ndjson, csv, chart`.
  - With `-f ndjson` it returns `format: 'ndjson'`.
  - With config `{format:'json'}` and no flag, it returns `json`. This means the global `-f` default `'table'` must move out of commander so config can win: remove the third argument in `src/index.ts`, and leave `resolveGlobalOptions` falling back to `'table'`.
- [ ] **Step 2:** Run the tests: they fail.
- [ ] **Step 3: Implement.**
  - Validate in `resolveGlobalOptions`.
  - `CLIConfig.format` becomes `OutputFormat`. The `CONFIG_KEYS.format` text lists all five.
  - `outputFormatSchema = z.enum(OUTPUT_FORMATS)`.
- [ ] **Step 4:** Tests pass. `pnpm dev -f xml metadata get` prints the error and exits 1. `pnpm dev --help` still shows the `-f` option.
- [ ] **Step 5:** Commit `fix(cli): reject unknown --format values; config format can be ndjson and now applies`

### Task 5: stdout discipline

**Files:**
- Modify: `src/formatters/index.ts`, `src/commands/report/batch.ts`, `src/commands/report/batch-pivot.ts`, `src/commands/auth/login.ts:55-56`, `src/commands/config/get.ts`, `src/commands/config/set.ts`
- Test: `test/formatters/format-reports.test.ts` (new)

**Interfaces:**
- Produces: `formatReports(reports: ReportData[], format: OutputFormat, label = 'Report'): string` in `src/formatters/index.ts`.
  - **json:** a JSON array of the per-report `formatJson` objects (parse then stringify, 2-space).
  - **ndjson:** each row object gets `"report": <1-based index>` and the lines are concatenated.
  - **table/csv/chart:** sections joined by `\n\n`, each prefixed `--- ${label} N ---` only when `reports.length > 1`.
  - A single report is identical to `formatOutput`.

- [ ] **Step 1: Write failing tests.**
  - Two reports, json: `JSON.parse(out)` is an array of length 2, and each has `rowCount`.
  - ndjson: every line parses and has a `report` key of 1 or 2.
  - table: contains `--- Report 2 ---`.
  - One report, json: output equals `formatOutput(r,'json')`.
- [ ] **Step 2:** Run the tests: they fail.
- [ ] **Step 3: Implement** `formatReports`. In the batch commands, one `writeOutput(formatReports(reports, format[, 'Pivot Report']), globalOpts)` replaces the loop.
  - `login.ts`: the auth URL goes to stderr (`process.stderr.write(\`${authUrl}\n\n\`)`).
  - In both `config get` and `config set`, replace `process.exit(1)` with `throw new Error(...)` (handled by `handleError`). `config get` keeps `console.log(value)` because the value is data.
- [ ] **Step 4:** Tests pass. Manual check: `pnpm dev auth login --help` is unchanged.
- [ ] **Step 5:** Commit `fix(output): batch reports emit one valid json/ndjson document and one -o file; auth URL to stderr`

### Task 6: Atomic, permission-safe config and token writes

**Files:**
- Create: `src/utils/secure-fs.ts`
- Modify: `src/services/config.service.ts`, `src/services/oauth.service.ts`
- Test: `test/utils/secure-fs.test.ts` (new)

**Interfaces:**
- Produces, in `src/utils/secure-fs.ts`:
  - `ensureSecureDir(dir: string): void` runs `mkdir -p` with mode `0o700` and `chmodSync(dir, 0o700)` on every call.
  - `writeFileAtomic(path: string, content: string, mode = 0o600): void` writes `${path}.${pid}.tmp` with `mode`, then `renameSync`, then `chmodSync(path, mode)`.
  - `readJsonFile<T>(path: string, label: string): T | null` returns null if the file is missing. On a parse error it calls `logger.warn(\`Ignoring corrupt ${label} at ${path}: ${msg}\`)` and returns null.

- [ ] **Step 1: Write failing tests** (use `mkdtempSync` in `os.tmpdir()`; skip mode assertions on `win32`):
  - Pre-create the file with mode `0o644`, then `writeFileAtomic`: `statSync(f).mode & 0o777` is `0o600` and the content is replaced.
  - No `*.tmp` is left in the dir.
  - `ensureSecureDir` on an existing `0o755` dir: the mode becomes `0o700`.
  - `readJsonFile` on `'{bad'`: returns null and `logger.warn` was called once (spy).
- [ ] **Step 2:** Run the tests: they fail.
- [ ] **Step 3: Implement.**
  - `ensureConfigDir` delegates to `ensureSecureDir(CONFIG_DIR)`.
  - `setConfigValue` and `saveOAuthTokens` use `writeFileAtomic`.
  - `getConfig` and `loadOAuthTokens` use `readJsonFile`. `loadOAuthTokens` keeps its required-fields check.
- [ ] **Step 4:** Tests pass, including the existing `auth.service` tests.
- [ ] **Step 5:** Commit `fix(security): atomic 0600 writes for config/tokens, 0700 config dir, warn on corrupt files`

### Task 7: Version source, MCP version, lazy startup, compile cache

**Files:**
- Create: `src/version.ts`, `src/cli.ts` (the current body of `src/index.ts` moves here)
- Modify:
  - `src/index.ts`, which becomes a 3-line bootstrap.
  - `src/services/data-api.service.ts` and `src/services/admin-api.service.ts`, where `getClient` becomes async with a dynamic SDK import.
  - `src/commands/mcp/index.ts`, where the MCP SDK and the server are imported inside the action.
- Test: `test/startup/lazy-sdk.test.ts` (new), `test/commands/mcp-smoke.test.ts`

**Interfaces:**
- Produces: `VERSION: string` from `src/version.ts`. It is read from `../package.json` via `import.meta.url` (moved verbatim from `index.ts`), and phase 5 replaces it with a build-time define.
- Changes: `getClient(): Promise<BetaAnalyticsDataClient>`, `getAlphaClient(): Promise<v1alpha.AlphaAnalyticsDataClient>`, and admin `getClient(): Promise<AnalyticsAdminServiceClient>`.
  - Every call site becomes `await getClient()`.
  - SDK imports become `import type` plus `await import('@google-analytics/…')` inside the factory.
  - Exported service function signatures are unchanged.

- [ ] **Step 1: Write failing tests.**
  - `lazy-sdk.test.ts`: import `../../src/services/data-api.service.js` and `admin-api.service.js`, then assert `Object.keys(createRequire(import.meta.url).cache).some(k => k.includes('@google-analytics'))` is false.
  - `mcp-smoke.test.ts`: assert the initialize result's `serverInfo.version` equals `package.json` `version`.
- [ ] **Step 2:** Run the tests: lazy-sdk fails. The mcp version check fails with `'1.0.0' !== '1.1.0'` after `pnpm build`.
- [ ] **Step 3: Implement.**
  - `src/index.ts`:
    ```ts
    #!/usr/bin/env node
    import { enableCompileCache } from 'node:module';
    enableCompileCache?.();
    await import('./cli.js');
    ```
  - `cli.ts` imports `VERSION`.
  - In MCP, `VERSION` comes from `../../version.js`, and `McpServer`/`StdioServerTransport` are dynamically imported in `serve`'s action. Tool registration moves into an `async function startServer()` in a new `src/commands/mcp/server.ts`, so `index.ts` only builds the commander command.
  - Update `vitest.config.ts` coverage `exclude` to add `src/cli.ts`. This is a config edit, approved via spec §7.
- [ ] **Step 4:** Tests pass. `pnpm build`, then run `node dist/index.js --help` and `--version` 5× each with `/usr/bin/time -f %e`. Record the median before and after in the commit body. Target: under 0.30 s (phase 5 takes it to under 0.15 s with bundling).
- [ ] **Step 5:** Commit `perf(startup): lazy-load GA and MCP SDKs, enable compile cache; fix MCP server version drift`

### Task 8: Docs and contract refresh, final gate

**Files:**
- Modify:
  - `.serena/memories/testing_conventions.md`: rewrite for vitest 4 and the `vi.mock` + top-level `await import` pattern used in `test/services/auth.service.test.ts`.
  - `.serena/memories/architecture_patterns.md`:
    - §2 auth order is OAuth → env → config.
    - §3 is async `getClient()` with lazy SDK import.
    - §7 colour goes via `utils/style.ts`.
  - `CLAUDE.md` rule 6: "API clients only via each service's private async `getClient()`".
  - `help.md` / `README.md`: `-f` validation, the `ndjson` config value, and a note that `chart` no longer draws a box.

- [ ] **Step 1:** Make the edits above.
- [ ] **Step 2: Verification gate.** Paste the output of:
  - `pnpm lint`
  - `pnpm type-check; echo $?`
  - `pnpm test`
  - `pnpm verify:skills`
  - `pnpm build`
  - `node dist/index.js --help`
  - `node dist/index.js report batch --help`
  - `NO_COLOR=1 node dist/index.js config list`
- [ ] **Step 3:** Re-check spec §3 point by point. Phase 0 covers:
  - lockfile
  - no-color
  - batch stdout
  - MCP version
  - regex
  - `-f` validation
  - `config get`/`set` and login stdout
  - auth precedence doc
  - atomic writes and permissions
  - daily-quota retry
  - `package.json` runtime read (isolated into `version.ts`; removed in phase 5)

  Deferred by design:
  - `parseInt`/NaN and admin schemas (phase 2)
  - retry coverage for audience/admin (phase 2)
  - delete confirmation (phase 1)
- [ ] **Step 4:** Commit `docs: refresh contract and memories for phase 0`, then use superpowers:finishing-a-development-branch.
