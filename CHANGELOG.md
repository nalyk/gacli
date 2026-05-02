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
