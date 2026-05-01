# Contributing to gacli

Thanks for considering a contribution. This is a small, focused TypeScript CLI;
the bar is "the change is well-scoped, type-safe, tested, and explained."

## Quick development loop

```bash
pnpm install
pnpm dev <args>     # run from source — no build step
pnpm verify         # lint + type-check + test + build (the gate before any commit)
pnpm test:watch     # vitest in watch mode while iterating
```

## Before opening a PR

- [ ] `pnpm verify` is green locally.
- [ ] New code paths have tests in `test/` mirroring the `src/` layout.
- [ ] Imports use `.js` extensions on relative paths (ESM requirement, enforced by hook).
- [ ] No new `as any` casts unless at the SDK boundary (and explained in a comment).
- [ ] `README.md` updated if you added a user-facing flag, format, command, or env var.
- [ ] `MCP.md` updated if you added/changed an MCP tool.
- [ ] Commit messages follow the existing style: short imperative subject,
      body explaining **why** rather than what.

## Architecture

The codebase has a single non-negotiable pipeline:

```
Commander → resolveGlobalOptions/validate → service → ReportData → formatOutput → writeOutput
                                                                                      ↓
                                                                                 handleError
```

Don't break this pipeline. Don't introduce a layer-skipping shortcut. The full
contract lives in [`CLAUDE.md`](./CLAUDE.md) — that file is the ground truth for
this repo, including the 10 rules that break things silently if violated.

## Where things live

| Layer | Path | Rule |
|---|---|---|
| Commands | `src/commands/<group>/*.ts` | Pure factory functions returning `Command` |
| Services | `src/services/*.ts` | Stateful, lazy singletons; only place that talks to APIs |
| Formatters | `src/formatters/*.ts` | `ReportData → string`, no I/O |
| Validation | `src/validation/*.ts` | Zod at the boundary, only at the boundary |
| Utils | `src/utils/*.ts` | Pure helpers, no upstream deps |

## Tests

- Use Vitest, not Jest. Tests must explicitly import `{ describe, it, expect }` from `'vitest'`
  (we run with `globals: false`).
- Focus on the pure logic layers first: filter parsing, response mapping, auth
  resolution, retry classification. Avoid mocking the entire SDK; mock at the
  service-function boundary if needed.

## Reporting bugs

Use the bug report template (`/issues/new?template=bug_report.yml`). Include
the exact `gacli` invocation and the output with `-v` (verbose). Don't paste
real OAuth tokens or service-account JSON — redact.

## License

By contributing you agree your work is licensed under the [MIT License](./LICENSE).
