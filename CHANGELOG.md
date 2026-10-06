# Changelog

All notable changes to `@nalyk/gacli` are documented here.

The format is based on [Conventional Commits](https://www.conventionalcommits.org/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Generated automatically by [semantic-release](https://github.com/semantic-release/semantic-release) on every push to `main`.

## [2.0.0-next.1](https://github.com/nalyk/gacli/compare/v1.1.0...v2.0.0-next.1) (2026-10-06)

### ⚠ BREAKING CHANGES

* **mcp:** MCP tool names are now ga_<operation id> (e.g.
ga_report_run); create/update tools need --allow-write and delete/archive
tools need --allow-delete plus confirm: true.
* admin google-ads-links update requires
--ads-personalization-enabled true|false; enum flags are validated
(custom-dimensions/metrics scope, measurement unit, key-event counting
method, audience clause type, datastream type); numeric flags
(--default-value, --membership-duration-days, offsets, limits) must be
numbers.
* delete and archive commands require --yes when not
interactive; JSON output of resource commands is the typed API object.
* **skills:** JSON output of resource operations (metadata get, admin
*) uses camelCase API fields with typed values instead of table headers;
metadata get --type only accepts dims|metrics|all; property IDs must be
numeric; Node >=22.12 is required.
* **ops:** admin custom-dimensions archive is gated like a delete:
it needs --yes (or an interactive confirmation).
* **output:** without -f, output is JSON (compact) when stdout is not a TTY or an agent is detected.
* **errors:** exit codes are now 0 ok, 1 api/internal, 2 usage, 3 auth,
4 confirmation required, 5 not found, 6 quota.

### Features

* **api:** raw gacli api <service> <Method> escape hatch ([9511bf3](https://github.com/nalyk/gacli/commit/9511bf3b9ec304351e07919434b28da691f8eb06))
* **auth:** GACLI_ACCESS_TOKEN, ADC fallback, --scopes, auth token, json status ([a1b9db1](https://github.com/nalyk/gacli/commit/a1b9db103bd1331e51898c210795b6fd91a56bc8))
* **core:** mount operations onto commander with dry-run and delete confirmation ([c27dca3](https://github.com/nalyk/gacli/commit/c27dca30ffcd5655c13963f4b024602a3964d00d))
* **core:** operation definition and result rendering with --fields projection ([e401c37](https://github.com/nalyk/gacli/commit/e401c37b12f063f2418f9f1675bac48cfb8aab31))
* **errors:** typed GacliError with stable exit codes and JSON error output ([9e2f560](https://github.com/nalyk/gacli/commit/9e2f5601a032908ac74e60a7ba48fd1a664b7d1b))
* **mcp:** generate MCP tools from the operation catalogue ([bec5ce5](https://github.com/nalyk/gacli/commit/bec5ce5f79ff2a89dbb41e38ebd3863521f479b1))
* **mcp:** local Streamable HTTP transport (127.0.0.1, host/origin validated) ([4e4656a](https://github.com/nalyk/gacli/commit/4e4656a2c9a87e8f59b21717d0d5025eb3f62454))
* **mcp:** MCP SDK v2 server generated from the catalogue, write tools opt-in ([571deab](https://github.com/nalyk/gacli/commit/571deab24a476b2bf96a31254f520c8a5e854a32))
* **ops:** account summaries, annotations, change history, access report, measurement secrets, data retention ([e36df37](https://github.com/nalyk/gacli/commit/e36df37894644655dec8d919c13cf1aacb66a080))
* **ops:** admin op helpers and [@file-capable](https://github.com/file-capable) JSON arguments ([45f329c](https://github.com/nalyk/gacli/commit/45f329c335c812c3d49aea5927e026118f5198c7))
* **ops:** metric/dimension lists accept comma-separated values ([bf21e2f](https://github.com/nalyk/gacli/commit/bf21e2f302f127c9217049862b093ef023bbcde7))
* **ops:** migrate access-bindings and firebase/google-ads/bigquery links ([ba9196a](https://github.com/nalyk/gacli/commit/ba9196a2a7b4db38ff3db5e86bd4c5702fd0d6ed))
* **ops:** migrate admin accounts, properties and datastreams ([2890eb8](https://github.com/nalyk/gacli/commit/2890eb8518049a4318fe34953bbe1d349b79e0ec))
* **ops:** migrate admin custom-metrics, key-events and audiences ([a7caf4c](https://github.com/nalyk/gacli/commit/a7caf4c8a571cdc38125a1eba1f367d571254691))
* **ops:** migrate audience export and recurring ([27004fe](https://github.com/nalyk/gacli/commit/27004fefff30a2e173e586336d1888d7de1db2b1))
* **ops:** migrate report advanced and metadata check-compatibility ([c49d7cf](https://github.com/nalyk/gacli/commit/c49d7cf2f1189872f66890228f6c6786679aac6e))
* **ops:** migrate report run, metadata get and admin custom-dimensions to the operation catalogue ([222dbd0](https://github.com/nalyk/gacli/commit/222dbd057d453feff363660ba13e88204f272f00))
* **ops:** property quota, report tasks, chat, conversion spec ([b9c7100](https://github.com/nalyk/gacli/commit/b9c71006911a5d42a142c01002aaa3ed8c9fdf2c))
* **ops:** register phase 4 operations; reject leaf flags that a global option would swallow ([d320f67](https://github.com/nalyk/gacli/commit/d320f67e9bf3a94833da3cd71cac8cbf908a42b7))
* **output:** json by default when piped or driven by an agent; GACLI_FORMAT env ([2b76d49](https://github.com/nalyk/gacli/commit/2b76d49f1cd02ad788a69e6e55540315cbedb6ac))
* **schema:** gacli schema command and agent-mode help ([ce9970d](https://github.com/nalyk/gacli/commit/ce9970db82c6ff7f5ad07e1c859fb8e6adde432a))

### Bug Fixes

* **auth:** load credentials before building SDK clients ([23f5b1c](https://github.com/nalyk/gacli/commit/23f5b1c511cd3cb5add8443d4a090386cbbe1d59))
* **build:** route clustered global flags; SEA bundles its CJS deps; SEA runs for every release ([c2b981f](https://github.com/nalyk/gacli/commit/c2b981fcc8ee8cc08f847975b48300b065e281c2))
* **cli:** --no-color flag now actually disables colour ([6b968c4](https://github.com/nalyk/gacli/commit/6b968c46cadb6b9292054cd8199adceaa53c97f1))
* **cli:** reject unknown --format values; config format can be ndjson and now applies ([25d1f51](https://github.com/nalyk/gacli/commit/25d1f512b2c613dc572f4396a39ccda619aaf06c))
* **config:** reject invalid format in config set; warn and fall back on a stale config value ([29d6b9e](https://github.com/nalyk/gacli/commit/29d6b9e9ff5a507ba63d39c586f5eda3f1568ea5))
* **errors:** classify gRPC errors by code, not unanchored regex; never retry daily quota ([29c18c3](https://github.com/nalyk/gacli/commit/29c18c3efa1fb6ee76fc55202469299825796937))
* gacli api safety and correctness; precise auth hints; positional chat; secrets out of read-only MCP ([505bee0](https://github.com/nalyk/gacli/commit/505bee090ede4506633be15fc6e3ec039fa7b4d0))
* **mcp:** no file access from tool arguments, explicit property for deletes, schema caching ([19fb333](https://github.com/nalyk/gacli/commit/19fb333bac8d7f2593419c74e191ee16937069cb))
* **mcp:** unhandled-rejection backstop; docs: MCP safety model, HTTP listener, auth caching ([adcc97d](https://github.com/nalyk/gacli/commit/adcc97d04265d072ed089f82813cffea37917d03))
* **ops:** adapt report run --conversion-spec to jsonArg(schema) signature ([191117d](https://github.com/nalyk/gacli/commit/191117dfb225df9b958e712030a777dcfc1f8e47))
* **ops:** funnel step durations, realtime 360 ranges, account prefix in properties list ([3422f08](https://github.com/nalyk/gacli/commit/3422f08e758d85c375347227f77726d46e63d90d))
* **output:** batch reports emit one valid json/ndjson document and one -o file; auth URL to stderr ([5d7f79d](https://github.com/nalyk/gacli/commit/5d7f79dd20cae69a9cee3621fa61e67a7440c08f))
* **output:** honour --no-color/NO_COLOR in tables and charts ([c1655d9](https://github.com/nalyk/gacli/commit/c1655d91af84ccf838d509931decea9f41dbf23f))
* readable JSON-flag errors, pivot coercion, timestamps and wrappers in tables ([cef6838](https://github.com/nalyk/gacli/commit/cef6838c9a4e14a548b86b2d2e39078b1c81ed49))
* **schema:** describe the -f json envelope, not the internal result shape ([4933cb9](https://github.com/nalyk/gacli/commit/4933cb92b3c9a5ccaa32cb10b170aa591268dafd))
* **security:** atomic 0600 writes for config/tokens, 0700 config dir, warn on corrupt files ([72e921e](https://github.com/nalyk/gacli/commit/72e921e55e1a8115bb4751743e7c33d3a7f1c82d))
* **startup:** reach enableCompileCache via namespace import so Node 22.0 still starts ([4ab7a6e](https://github.com/nalyk/gacli/commit/4ab7a6ef29fe169743b43033702bb14374f1ac95))

### Performance

* **startup:** build-time version hook; load ora and cli-table3 on demand ([15f2bed](https://github.com/nalyk/gacli/commit/15f2bedefc51a9329df7eb8d9edef34b22eb34a3))
* **startup:** lazy top-level commands; google-auth-library and zod off the startup path ([9be99fa](https://github.com/nalyk/gacli/commit/9be99faeac71b843c861c409c9b0cc0c305d5080))
* **startup:** lazy-load GA and MCP SDKs, enable compile cache; fix MCP server version drift ([a3c8fcf](https://github.com/nalyk/gacli/commit/a3c8fcf505a97d95690e34ac5fccf33c3348bbe5))

### Refactoring

* **core:** transport-neutral operation invocation and JSON envelope ([796f034](https://github.com/nalyk/gacli/commit/796f0340fdd04a89eefb5f3ec36a416322e037de))
* every GA command is an operation; remove legacy command and admin service code ([e7bd472](https://github.com/nalyk/gacli/commit/e7bd4728effa376ea2a442c3d242689fb0b1305f))

### Documentation

* 2.0 migration guide, README, contract and skill packages ([9568c0f](https://github.com/nalyk/gacli/commit/9568c0fa8dbc68c80397ca8133dd67aec4bb1acc))
* 2.0-accurate skills, help, README and migration notes ([f7f99f1](https://github.com/nalyk/gacli/commit/f7f99f1dcc4bdfe4789783b84df5fed3a201eb06))
* build and distribution for 2.0 (bundle, startup budget, next channel, experimental SEA) ([1b404cf](https://github.com/nalyk/gacli/commit/1b404cf5529253dd3d115eb78be9ebf34159aedf))
* correct auth precedence (env var beats config credentials) ([7dada23](https://github.com/nalyk/gacli/commit/7dada23c49b0ce8b5d717ee2b70afe346a0d43da))
* gacli 2.0 modernization spec and phase 0 plan ([2130da2](https://github.com/nalyk/gacli/commit/2130da2bb5ce8178aaf3077b19cf11f8aa2f1e98))
* generate the operation reference, skills catalogue and llms.txt from the catalogue ([734b205](https://github.com/nalyk/gacli/commit/734b205899dcf2a332240f96abed92e406e6f1b3))
* MCP v2 server (ga_* tools, allow flags, local HTTP) ([2440a78](https://github.com/nalyk/gacli/commit/2440a784cb1c8a297faa37d3664d22361945c99a))
* phase 1 contract (operations, exit codes, auto format, schema) ([e8268a7](https://github.com/nalyk/gacli/commit/e8268a75732eff05b8dae82fb2ddb386ad099017))
* phase 1 plan ([a6f61d7](https://github.com/nalyk/gacli/commit/a6f61d713f1c86c435f5fb80d06b4a52c78b086b))
* phase 2 layout; --yes on destructive examples ([de4fa51](https://github.com/nalyk/gacli/commit/de4fa51c9bebad3af6b28aa3695ad8360abd0d71))
* phase 2 plan ([90a29aa](https://github.com/nalyk/gacli/commit/90a29aa0864d4c4e023010a2bd710b9459364ed1))
* phase 3 plan ([7bb376b](https://github.com/nalyk/gacli/commit/7bb376bbee8305f0131c8e4267984a7485b352db))
* phase 4 capabilities (auth for agents, quota, tasks, chat, admin additions, gacli api) ([5980d26](https://github.com/nalyk/gacli/commit/5980d2654ae0a314963a244385571b3bf3e2bf9a))
* phase 4 plan ([40da2ac](https://github.com/nalyk/gacli/commit/40da2ac9d80db536cdfebae90b22f813f95454fb))
* phase 5 plan ([85cc348](https://github.com/nalyk/gacli/commit/85cc34828f4fb751cdab9d5dbd80a6e534c4261e))
* phase 6 plan ([a40b5e7](https://github.com/nalyk/gacli/commit/a40b5e73aca720713cf0c8c638d9d519db9698b9))
* record remaining 2.0 behaviour changes from the migration ([bb944e2](https://github.com/nalyk/gacli/commit/bb944e2b497bdbe1de6fe736434d8d9e08254b24))
* refresh contract and memories for phase 0 ([422f9aa](https://github.com/nalyk/gacli/commit/422f9aac398ed091d5ee99ddc3d65e660c66e5b1))
* **skills:** 2.0 exit codes, confirmation gate and JSON shapes for agents ([8dc1757](https://github.com/nalyk/gacli/commit/8dc1757b5a3b986e4daa9b09ab82d5e49a061e52))

# Changelog

All notable changes to `@nalyk/gacli` are documented here.

The format is based on [Conventional Commits](https://www.conventionalcommits.org/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Generated automatically by [semantic-release](https://github.com/semantic-release/semantic-release) on every push to `main` — see `release.config.js` and `.github/workflows/release.yml`. Entries below v1.2.0 were authored manually under the old Keep a Changelog format and are preserved verbatim.

## [1.1.0] - 2026-05-02

### Added

- **`gacli skills` command** — install the bundled gacli skill into AI
  coding CLI agents. Subcommands: `install`, `uninstall`, `list`, `path`,
  `doctor`. Auto-detects installed agents (claude, codex, qwen, gemini)
  and prompts interactively when stdin is a TTY; non-interactive in CI.
  Supports `user` (default), `project`, and arbitrary-path scopes. Atomic
  installs via temp-dir + rename, marker-based ownership tracking
  (`.gacli-skill`) so uninstall refuses to touch directories we don't own.
- **Native skill packages for Claude Code, Codex CLI, Qwen Code, and Gemini
  CLI**, shipped under `extensions/` in the npm tarball. One conceptual
  skill packaged 4 ways:
  - **Claude Code** — full frontmatter (`paths`, `allowed-tools`,
    `` !`gacli ...` `` dynamic injection at skill load).
  - **Codex** — installs at the cross-vendor `~/.agents/skills/` path;
    `agents/openai.yaml` declares `dependencies.tools` (binary), GA4-orange
    branding, and marketplace defaults.
  - **Qwen Code** — auto-pr-style structure with conventional `reference.md`
    + `examples.md`; INSTALL.md ships a pre-baked
    `.qwen/settings.json` permissions template.
  - **Gemini CLI** — heaviest `scripts/` investment (deterministic shell
    wrappers); persona/grounding mandates per the danicat agent-skills pattern.
- Shared knowledge spine (`extensions/_core/`) — 7 markdown files
  (command catalog, filter grammar, dimensions/metrics cheatsheet, 12
  recipes, 15 footguns, auth setup, decision tree) copied into each skill's
  `references/` at install time so installs are self-contained.
- `pnpm verify:skills` skill-lint enforcing every Wave-2 silent-fail trap
  (exact `SKILL.md` filename, `name` matches directory, YAML-safe
  descriptions, GA4 trigger keywords, references/scripts existence with
  shebangs, LF line endings). Wired into `pnpm verify`.
- 14 new Vitest cases covering install/uninstall/list/marker behavior,
  force/dry-run, the cross-vendor codex path, and the "refuse to remove
  what we don't own" guard.

### Changed

- `extensions/` is now bundled in the published npm package (added to
  `files` in `package.json`) so `gacli skills install` can locate the
  source tree under `$(npm root -g)/@nalyk/gacli/extensions/`.
- npm keywords expanded with `claude-code`, `codex`, `gemini-cli`,
  `qwen-code`, `ai-agent`, `agent-skills`, `skill`.
- Package description now mentions the AI-assistant skill packages.
- Main `README.md` and `help.md` got a new "AI Assistant Integration"
  section pointing at `extensions/README.md`.

## [1.0.2-rc.0] - 2026-05-02

### Changed

- CI release pipeline migrated from classic `NPM_TOKEN` to OIDC trusted
  publishing. The publish workflow now mints a short-lived token via
  GitHub Actions OIDC and attaches Sigstore provenance automatically.
- Switched npm install path in CI from a self-upgrade to a local prefix
  install to avoid transient `MODULE_NOT_FOUND` errors during the npm
  bootstrap step.
- Tightened the version-check guard in the release workflow so it
  compares semver, not lexicographic strings (npm 11.13 was being
  rejected by the older check).

## [1.0.1] - 2026-05-01

### Changed

- Renamed the published package from `gacli` (unscoped, taken on npm)
  to `@nalyk/gacli`. The `gacli` binary name is unchanged.
- Switched npm publish to OIDC trusted publishing with Sigstore
  provenance — see release workflow for the full handshake.

### Added

- README badges for npm, license, and provenance verification.
- Documentation map linking the GA4 Data API and Admin API surfaces.

## [1.0.0] - 2026-04-30

Initial public release on npm. Published as **`@nalyk/gacli`**.

### Added

- Google Analytics 4 CLI built on the Data API and Admin API.
- OAuth and Service Account authentication modes.
- Output formats: table, JSON, NDJSON, CSV, and basic chart rendering.
- Embedded MCP server exposing read-only tools for AI agents
  (Claude Desktop, Cursor, Zed, VS Code via MCP transport).
- Repo hygiene baseline: LICENSE, SECURITY.md, CONTRIBUTING.md,
  CodeQL workflow, release workflow, issue/PR templates.
