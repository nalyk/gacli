<!-- Thanks for contributing. Keep this template — it speeds up review. -->

## What

<!-- One-line summary of the change. -->

## Why

<!-- The motivation. A bug report number, a use case, or a concrete pain. -->

## How

<!-- Brief notes on the approach and any tradeoffs the reviewer should know. -->

## Verification

- [ ] `pnpm verify` is green locally
- [ ] New tests cover the change (or existing tests cover it — say which)
- [ ] No new `as any` outside SDK boundaries
- [ ] If user-facing: `README.md` updated
- [ ] If MCP-facing: `MCP.md` updated and tools still list correctly via `gacli mcp serve`

## Notes for reviewer

<!-- Anything not obvious from the diff. Risky areas, follow-ups, alternatives considered. -->
