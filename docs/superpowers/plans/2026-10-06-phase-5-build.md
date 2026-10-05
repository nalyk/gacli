# Phase 5 — Build and distribution: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fast, bundled, strictly linted 2.0 build. This means a tsdown bundle with a build-time version, startup kept within budget and checked in CI, vitest 5, Biome 2.5 with `noExplicitAny: error`, Renovate, and best-effort single-executable binaries on Node 26.

**Baseline (measured on this machine, built `dist/`, median of 5):** `--version` takes 0.34 s and `--help` 0.41 s. The CPU profile shows module resolution at 123 ms, zod at 31 ms and string-width (ora/cli-table3) at 32 ms.

**Spec:** §5.8, §6 row 5, success criterion 1 (`--help` < 150 ms).

## Global Constraints

- Branch `feat/phase-5-build` off `next`. No AI attribution in commits.
- Asking-first items (deps, `tsconfig`, `vitest.config`, `biome.json`, workflows) are approved through spec §7.
- `bin` stays `dist/index.js`. `pnpm dev` (tsx, unbundled) keeps working. Tests keep running against `src/` and against `dist/` (e2e).
- Every runtime dependency stays **external**: installs keep deduplicating, and gax/protobuf/grpc loading is untouched. Only our own `src/` is bundled.
- The startup budget, enforced in CI by `test/startup/budget.test.ts` (median of 5, built `dist/`):
  - `--version` < 0.20 s
  - `--help` < 0.30 s
  - on CI runners, with `GACLI_STARTUP_BUDGET_MS` able to relax it locally.
  - The spec's 150 ms target is recorded honestly in the ledger with the final numbers. It is not faked by loosening the measurement.

## Review Focus

1. A packed tarball (`pnpm pack`, install into a temp dir) must run `gacli --version`, `gacli schema` and `gacli mcp serve` from the installed package, and `extensions/` must resolve for `gacli skills path` (Task 2).
2. `pnpm dev --version` (tsx, no define) must still print the package version (Task 1).
3. The ESM bundle must keep the `#!/usr/bin/env node` shebang and the executable bit after `pnpm build` (Task 2).
4. Lint strictness must not be satisfied by blanket `biome-ignore` comments: each ignore needs a reason (Task 3).
5. The SEA job must not block releases when it fails (`continue-on-error`), and it must say so (Task 4).

---

### Task 1: Build-time version and lazy heavy UI modules

- `src/version.ts`: `VERSION` uses `__GACLI_VERSION__` (a tsdown `define`) when it is defined, and falls back to reading `package.json` (dev/tsx/tests).
- `createSpinner` becomes `async startSpinner(text): Promise<{ stop(): void }>`. It dynamically imports `ora` and is only called when interactive.
- `cli-table3` is imported lazily: `formatTable` stays synchronous but obtains the module through `createRequire(import.meta.url)('cli-table3')` on first use. The module is CommonJS, so `require` is synchronous.
- [ ] Tests:
  - `VERSION` equals `package.json` under vitest.
  - `test/startup/lazy-sdk.test.ts` gains checks that importing `src/cli.ts` dependencies does not load `ora` or `cli-table3` (same child-process technique).
- [ ] Commit `perf(startup): build-time version hook; load ora and cli-table3 on demand`.

### Task 2: tsdown bundle

- `tsdown.config.ts`:
  - entry `src/index.ts`, ESM, `platform: 'node'`, target `node22`;
  - `external`: every dependency in `package.json`;
  - `define: { __GACLI_VERSION__: JSON.stringify(pkg.version) }`;
  - shebang kept;
  - `dts: false` (declarations are not consumed: `main` points at a CLI).
- `package.json`:
  - `build` = `tsdown`
  - `type-check` stays `tsc --noEmit`
  - `main` removed, because the entry has side effects; `exports` set to `{ "./package.json": "./package.json" }`
  - `files` unchanged
- [ ] Gate:
  - `pnpm build && node dist/index.js --version`
  - the e2e suites
  - `pnpm pack` + install into a temp prefix, then `gacli --version`, `gacli schema report run`, `gacli skills path`, and an MCP `tools/list` via stdio from the installed copy
  - the startup numbers before and after, recorded
- [ ] Commit `build: bundle src with tsdown (deps external), build-time version`.

### Task 3: Tooling upgrades and lint strictness

- vitest `^5.0.3` and `@vitest/coverage-v8` to match. Fix any unawaited assertions vitest 5 now flags. Coverage thresholds go to 75% for `src/core` and `src/operations` (spec §5.10) and stay at 50% globally.
- Biome `2.5.15`. `biome.json`:
  - `noExplicitAny: error` for `src/**`
  - `noConsole: error` for `src/**`, except `src/utils/logger.ts`, `src/types/common.ts` (writeOutput), `src/commands/explore/**` and `src/utils/error-handler.ts`
  - `noNonNullAssertion` stays a warning
- Fix the remaining warnings or give each a reasoned ignore.
- [ ] Commit `chore(deps): vitest 5, biome 2.5; noExplicitAny and noConsole are errors`.

### Task 4: CI, release, Renovate, SEA

- `.github/workflows/ci.yml`:
  - matrix 22/24/26
  - lint, type-check, build, test
  - a `startup-budget` step, Linux Node 24 only (`GACLI_STARTUP_BUDGET=1 pnpm vitest run test/startup/budget.test.ts`)
  - a pack-and-run smoke step
- `.github/workflows/sea.yml` (manual + release-published trigger, `continue-on-error: true`):
  - Node 26, `node --build-sea sea-config.json` on linux-x64, darwin-arm64 and win-x64
  - the SEA main is a fully bundled CJS build (`tsdown --config tsdown.sea.config.ts`, `noExternal: [/.*/]`)
  - `extensions/` as SEA assets
  - uploads binaries to the release
- `scripts/build-sea.sh` is updated to the same flow.
- `renovate.json`: weekly, grouped minor/patch, `rangeStrategy: bump`, automerge devDependencies patch.
- `release.config.js`: confirm that `next` publishes as the `next` prerelease channel. Document how a 2.0.0 is cut (merge `next` → `main`).
- [ ] Try the SEA build locally once (`npx -y node@26 --build-sea …`) and record the outcome. If the gax/protobuf bundle cannot run as SEA, the workflow still exists, marked experimental, and the ledger says why.
- [ ] Commit `ci: node 26, startup budget, pack smoke, SEA workflow (experimental), renovate`.

### Task 5: Docs and gate

- [ ] `CONTRIBUTING.md` (build/test/tooling), `PUBLISHING.md`/`DISTRIBUTION.md` (next channel, SEA status), README install section.
- [ ] Full gate. Record the final startup numbers.
- [ ] Commit `docs: build and distribution for 2.0`.
