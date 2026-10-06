# Distribution channels for gacli

## 1. npm (supported)

```bash
npm install -g @nalyk/gacli        # or: pnpm add -g @nalyk/gacli / npx @nalyk/gacli
npm install -g @nalyk/gacli@next   # 2.x pre-releases from the `next` branch
```

`dist/` is a tsdown bundle of `src/` (a handful of chunks); every runtime dependency stays an
ordinary npm dependency. Startup budget (enforced in CI): `--version` / `--help` < 150 ms.

## 2. Single-executable binaries (experimental)

`.github/workflows/sea.yml` builds standalone binaries (no Node install needed) for Linux, macOS and
Windows on Node 26 (`node --build-sea`, ESM main), smoke-tests each one outside the repo, and attaches
them to the GitHub release. `release.yml` dispatches it for every new tag. The job is
`continue-on-error`: a failed SEA build never blocks an npm release.

```bash
# locally (Node >= 26)
pnpm build:sea        # → dist-sea/gacli-<platform>-<arch>
```

Known limits:

- Binaries are large (~160 MB: the Node runtime plus the GA SDKs).
- `gacli skills install` needs the bundled `extensions/` tree: use the npm package, or point
  `GACLI_EXTENSIONS_DIR` at a checkout's `extensions/`.
- macOS binaries are ad-hoc signed only (`codesign --sign -`); Gatekeeper may require
  `xattr -d com.apple.quarantine gacli-darwin-arm64`.
- Verified locally on Linux from a directory without `node_modules` (version, tables, schema, MCP,
  credential errors). macOS/Windows are built and smoke-tested by CI only; no live API call has been
  made from a binary.

## 3. MCP

`gacli mcp serve` (stdio) or `gacli mcp serve --http <port>` (local) — see `MCP.md`.
