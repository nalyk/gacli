# Changelog

All notable changes to `@nalyk/gacli` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet. New entries land here between releases._

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
