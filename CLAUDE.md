# gacli — Operating Contract

TypeScript ESM CLI for Google Analytics 4 (Data + Admin APIs). Claude operates this repo
mostly autonomously. **This file is the contract; deeper facts live in `@.serena/memories/`.**
Keep it lean — if you're tempted to add >5 lines, ask whether it belongs in a memory, a skill,
or a path-scoped `.claude/rules/*.md` instead.

## <CRITICAL> The 10 rules that break things silently

1. **Imports end in `.js`, never `.ts`** — `import { foo } from './bar.service.js'`. ESM + `moduleResolution: bundler` requires it. Hard build break if violated.
2. **GA API surface = operations, not commands.** Define `defineOperation({...})` in `src/operations/<group>/*.op.ts` and add it to `OPERATIONS` in `src/operations/index.ts`; the CLI adapter (`src/core/cli-adapter.ts`) mounts it, `gacli schema` describes it. Input = zod 4 `z.object` whose keys equal commander's camelCase attribute names; copy existing flag strings verbatim into `flags` (`test/cli/help-compat.test.ts` fails if a 1.x flag disappears). Then run `pnpm docs` — `help.md`, the skills command catalogue and `llms.txt` are generated from the catalogue and `pnpm test` fails on drift.
3. **Operations return typed data.** `kind: 'report'` → `ReportData`; `'reports'` → `ReportData[]`; `'resource'` → plain API objects + optional `columns` for table/csv. `ReportData` is only the tabular projection — never flatten resources into string rows by hand.
4. **Errors: throw, don't exit.** Core/operations/services throw (`GacliError(kind, msg, {hint})` for known cases). Only `handleError` (CLI edge, `: never`), `runProgram` (commander help/version) and the interactive flows in `skills/install.ts` / `auth/login.ts` exit; exit codes come from `EXIT_CODES` in `src/core/errors.ts` (0 ok, 1 api, 2 usage, 3 auth, 4 confirmation, 5 not found, 6 quota). Never `process.exit` elsewhere.
5. **Category drives safety.** `category: 'delete'` (also archive) ⇒ `--yes` gate (exit 4 when non-interactive); any non-`read` ⇒ `--dry-run`. Don't hand-roll confirmations or dry-runs.
6. **API clients only via lazy factories** — `getAdminClient()` (admin) or the data service functions / `getClient()`/`getAlphaClient()`. They lazy-import the SDK and apply the auth chain; a static SDK import slows every command's startup (`test/startup/lazy-sdk.test.ts`).
7. **Hand-written commands** (`config`, `auth`, `explore`, `mcp`, `skills`, `schema`, `api`) start with `resolveGlobalOptions(command)`, wrap in `try { … } catch (e) { handleError(e) }`, and output via `writeOutput`. `validate(schema, data)` now throws (ZodError → exit 2).
8. **New CLI config key = update BOTH `CLIConfig` interface AND `CONFIG_KEYS` map** in `src/types/config.ts`, or `setConfigValue` rejects them.
9. **stderr = status (`logger`/ora). stdout = data (`writeOutput`)**. Mixing breaks `--format json | jq` piping. Output defaults to compact JSON when piped or under an AI agent (`src/core/agent.ts`).
10. **New top-level command = an entry in `LAZY_COMMANDS` (`src/command-registry.ts`)** — name, description (must equal the real command's; `test/cli/command-registry.test.ts`) and a lazy `load()`. Never import commands eagerly in `src/cli.ts`: startup is budgeted (`--help` < 150 ms, `test/startup/budget.test.ts`).

## Workflow skills — invoke, do not duplicate

- Feature/refactor → `superpowers:brainstorming` → `superpowers:writing-plans`.
- Implementing → `superpowers:test-driven-development` (tests first unless rename/docs only).
- Before claiming done → `superpowers:verification-before-completion` (see Verification gate below).
- Anything failing twice → `superpowers:systematic-debugging`. No guess-fixing.
- Multi-task work → `superpowers:dispatching-parallel-agents` or `superpowers:subagent-driven-development`.
- End of branch → `superpowers:finishing-a-development-branch`.
- Polish → `simplify` skill on any non-trivial diff before declaring done.

## Code discovery & editing protocol

- **`src/**/*.ts` discovery**: `mcp__serena__get_symbols_overview` then `find_symbol` (`include_body=true` only when needed). Don't `Read` whole TS files unless serena fails or the file is <50 lines.
- **`src/**/*.ts` edits**: prefer `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`. Use `Edit` only for non-symbolic regions (imports, top-level constants).
- **Renaming or signature changes**: `find_referencing_symbols` BEFORE editing. Update all call sites in the same change.
- **Tests, configs, markdown**: regular `Read` / `Edit` is fine.
- Detail: `@.serena/memories/serena_workflow_tips.md`.

## <IMPORTANT> Autonomy gates

**PROCEED without asking** when ALL true:
- changes are local, reversible (git can undo), in-scope of the task
- no secrets, no network publish, no schema/contract break
- `pnpm type-check` + `pnpm test` still green after the change

**ASK FIRST** when ANY true:
- irreversible op (force-push, history rewrite, file deletion outside the changed feature)
- touches `.git/`, `package.json` deps, `tsconfig.json`, `vitest.config.ts`, `biome.json`
- introduces a new dependency
- changes the public CLI surface (renamed command, new flag semantics, removed option)
- touches credentials, tokens, `.env*`, `~/.gacli/`

**STOP and ask** when:
- same error after 3 fix attempts → invoke `superpowers:systematic-debugging`, then ask
- spec ambiguous between two reasonable interpretations
- a serena memory contradicts the requested change → surface the conflict before proceeding

## Verification gate — the "done" contract

Before saying "done", "fixed", "works", or opening a PR, you MUST in this order:

1. Run `pnpm type-check` — paste exit code.
2. Run `pnpm test` — paste pass/fail summary.
3. For new/changed commands: run `pnpm dev <command> --help` and a happy-path invocation; paste output.
4. Re-read the original requirement; state point-by-point whether each item is met.

If 1–3 didn't run, the work is **implemented**, not **done** — say so explicitly. Never claim
success on the basis that "the code looks right".

## Self-improvement loop

After each non-trivial task, run a 4-question retrospective:

1. **New project fact** (architecture, gotcha, convention)? → `mcp__serena__write_memory`. Update an existing memory when the topic matches; create a new file only for genuinely distinct topics. Names mirror existing convention (snake_case, scope-narrow).
2. **Reusable technique** (debug trick, library workaround, pattern usable in OTHER repos)? → invoke `claudeception` to extract a skill.
3. **Re-derived a rule that should be in CLAUDE.md**? → propose an edit. Do NOT silently bloat. If the rule is path-scoped, propose `.claude/rules/<name>.md` with `paths:` frontmatter instead.
4. **Frustration markers** ("again", "still", "why", "useless")? → `frustration-detector` should fire. If not, stop, summarize attempts, ask for direction.

**Cross-session recall.** Before any non-trivial task, optionally call `mcp__mempalace__mempalace_search "<keywords>"` to surface what prior sessions learned, decided, or got stuck on. The Stop hook auto-saves every 15 messages; PreCompact emergency-saves before context loss. Treat the palace as the long-term substrate; serena memories as the curated structured layer; CLAUDE.md as the contract.

## Build & test commands

- `pnpm dev <args>` — run from source via tsx (no build needed).
- `pnpm type-check` — `tsc --noEmit`, the build gate.
- `pnpm test` / `pnpm test:watch` / `pnpm test:coverage`.
- `pnpm build` then `pnpm start` — production-artifact verification.
- Full list: `@.serena/memories/suggested_commands.md`.

## References (read on demand for matching tasks)

- `.serena/memories/key_entrypoints.md` — fast jump map (any task that needs to find code).
- `.serena/memories/codebase_structure.md` — directory tree, layered dependency rule.
- `.serena/memories/serena_workflow_tips.md` — symbol-tool best practices for THIS repo.
- `.serena/memories/task_completion_checklist.md` — the full pre-merge gate (covers risk-bearing edits).
- `.serena/memories/testing_conventions.md` — Vitest 5 patterns when adding tests.
- `.serena/memories/tech_stack.md` — exact dependency versions and notable absences.
- `.serena/memories/suggested_commands.md` — full command list (dev/build/test/git/serena).
- `.serena/memories/project_overview.md` — scope, distribution model, repo state.
- `README.md`, `help.md` — human-facing setup and command reference.

Always-loaded (3 imports — the foundation):

@.serena/memories/architecture_patterns.md
@.serena/memories/command_pattern.md
@.serena/memories/code_style_conventions.md

## What this file is NOT

Not a memory dump (use serena). Not a skill catalogue (skills self-describe). Not a linter
(`tsc --strict` is). Not commit conventions (global `~/.claude/CLAUDE.md`). Not onboarding
(`README.md`).
