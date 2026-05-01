# Security Policy

## Supported versions

Only the latest published version receives security fixes.

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Email **dev.ungheni@gmail.com** with:

- A description of the issue and its impact.
- Steps to reproduce, including a minimal proof-of-concept where possible.
- The version of gacli affected (`gacli --version`).
- Your environment (OS, Node.js version, auth mode — OAuth or service account).

You should expect an acknowledgement within **72 hours**. If the report is
accepted, I'll work with you on a coordinated disclosure timeline — typically
30–90 days depending on severity, with credit in the release notes if you wish.

## Scope

In scope:

- The `gacli` CLI binary and its bundled MCP server.
- Authentication handling, token storage, and credential resolution.
- Any logic that touches `~/.gacli/oauth-tokens.json`, `~/.gacli/config.json`,
  or the user's `GOOGLE_APPLICATION_CREDENTIALS` file.
- Argument parsing, output handling, and any path the CLI takes when given
  attacker-controlled flags or environment variables.

Out of scope:

- Vulnerabilities in upstream packages (`@google-analytics/*`,
  `google-auth-library`, `commander`, etc.). Report those to their respective
  maintainers; we will pick up fixes via Dependabot.
- Issues that require an attacker to already have full local shell access
  with the user's identity (at that point gacli is the smaller problem).
- Denial-of-service via expensive GA4 reports — that's a quota concern, not
  a security one.

## Hardening notes

- OAuth tokens are stored at `~/.gacli/oauth-tokens.json` with mode `0600`.
- Service account paths are read but never copied or logged.
- gacli does not phone home, send telemetry, or contact any host other than
  Google's GA4 / OAuth endpoints (or the MCP client over stdio).
- The MCP server (`gacli mcp serve`) speaks only over stdio — no TCP listener.
- All API errors with codes 3/5/7/16 surface the gRPC message verbatim with
  no stack trace by default; set `GACLI_VERBOSE=1` to include stacks.
