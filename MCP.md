# MCP Server (`gacli mcp serve`)

gacli ships a Model Context Protocol server. Any MCP client (Claude Desktop, Cursor,
Cline, Zed, Continue, your own) can call gacli as a tool. This makes a GA4 property
queryable in natural language by an LLM.

## Tools exposed

Every gacli operation is a tool, generated from the same catalogue as the CLI (`gacli schema`
lists them). Tool name = `ga_` + the command path with `_` separators:

| CLI | MCP tool |
|---|---|
| `gacli report run` | `ga_report_run` |
| `gacli metadata get` | `ga_metadata_get` |
| `gacli admin custom-dimensions list` | `ga_admin_custom_dimensions_list` |

- **Read-only by default** (35 tools: every report, metadata, audience-export read and admin list/get).
- `gacli mcp serve --allow-write` adds create/update tools.
- `gacli mcp serve --allow-delete` also adds delete/archive tools. Those require the argument
  `confirm: true`, and carry `destructiveHint: true` so clients can ask the user first.
- Every mutating tool accepts `dryRun: true`, which returns `{ dryRun: true, preview: { operation, rpc, property, input } }`
  instead of calling the API.
- `outputSchema` is the same JSON envelope `gacli … -f json` prints (`{rowCount, data, metadata?}` for reports,
  `{rowCount, data}` for lists, `{data}` for single resources, `{reports: [...]}` for batches), returned as
  `structuredContent` plus a text copy.
- Errors are `isError` results whose text is `{"error":{"code","message","hint","exitCode"}}` (same codes as the CLI).
- Protocol: MCP TypeScript SDK v2; negotiates 2025-11-25 down to 2024-11-05.

### HTTP (local)

```bash
gacli mcp serve --http 8765          # http://127.0.0.1:8765/mcp
```

Streamable HTTP bound to 127.0.0.1 only, with Host/Origin validation (DNS-rebinding protection) and
**no authentication** — do not expose it beyond your machine.

## Auth

The MCP server reuses gacli's auth chain (`GACLI_ACCESS_TOKEN` → OAuth tokens →
`GOOGLE_APPLICATION_CREDENTIALS` → config `credentials` → Application Default Credentials).
Run `gacli auth login` once on the host. Credentials are resolved on the first tool call and
cached for the life of the server process — restart the server after re-authenticating.
A credential problem is returned as an `isError` result (code `AUTH`); it never stops the server.

For service-account-based deployments, set `GOOGLE_APPLICATION_CREDENTIALS` in the
client's MCP server env block.

## Default property

Set the default property once with `gacli config set property <ID>`. Tools accept
a `propertyId` argument that overrides this — handy if the LLM session needs to
work with multiple properties.

## Wiring into clients

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "gacli": {
      "command": "gacli",
      "args": ["mcp", "serve"]
    }
  }
}
```

Restart Claude Desktop. The `ga_*` tools appear in the tool picker.

### Claude Code

```bash
claude mcp add gacli -- gacli mcp serve            # read-only
claude mcp add gacli-admin -- gacli mcp serve --allow-write
``` Add `"--allow-write"` to `args` to let the model change GA4 configuration.

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gacli": {
      "command": "gacli",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Cline / Continue / Zed

All consume the same `mcpServers` config shape. Use the `command + args` form above.

### Pinning a specific property per client

Use the env block to pin a different property per client:

```json
{
  "mcpServers": {
    "gacli-prod": {
      "command": "gacli",
      "args": ["mcp", "serve"],
      "env": { "GA4_PROPERTY_ID": "111111111" }
    },
    "gacli-staging": {
      "command": "gacli",
      "args": ["mcp", "serve"],
      "env": { "GA4_PROPERTY_ID": "222222222" }
    }
  }
}
```

Clients that allow it will surface both servers' tools (with name collisions) — most
disambiguate by server name.

## Smoke-testing without an MCP client

```bash
printf '%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"x","version":"1"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | gacli mcp serve
```

You should see two JSON-RPC responses: an `initialize` ack and a `tools/list` with
the read-only `ga_*` tools (35 by default).

## Safety model

1. **Read-only by default.** Write tools exist only with `--allow-write`; destructive ones only with
   `--allow-delete`, and those require `confirm: true` *and* an explicit `propertyId` (never the
   server's default property) — a prompt injection cannot delete the default property implicitly.
2. **No file access from arguments.** JSON-valued arguments (`steps`, `pivots`, `requests`, …) must be
   inline JSON strings; the CLI's `@file` / `@-` forms are rejected by the MCP server.
3. **Local transports only.** stdio, or HTTP bound to 127.0.0.1 with Host/Origin checks (any
   `localhost` origin/port is accepted) and no authentication.
4. **Errors are data.** Tool failures are `isError` results — `{"error":{"code","message","hint","exitCode"}}`
   from gacli, or the SDK's plain-text "Input validation error: …" when arguments don't match the
   input schema (e.g. a missing `propertyId` or `confirm`).

## Why this matters

By 2026 every dev tool worth using ships an MCP server. For a GA4 CLI, MCP is the
distribution channel for non-developers — analysts ask Claude "what was traffic
yesterday by source?" and never touch a terminal. The CLI itself remains the
power-user interface; MCP is the diffusion layer.
