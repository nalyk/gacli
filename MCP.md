# MCP Server (`gacli mcp serve`)

gacli ships a Model Context Protocol server. Any MCP client (Claude Desktop, Cursor,
Cline, Zed, Continue, your own) can call gacli as a tool. This makes a GA4 property
queryable in natural language by an LLM.

## Tools exposed

All read-only. No admin/audience write surface — by design.

| Tool | Purpose |
|---|---|
| `gacli_report_run` | Standard GA4 Data API report (the workhorse). |
| `gacli_report_realtime` | Last-30-minutes data. |
| `gacli_metadata` | Dimension/metric catalog for a property, with search + custom-only filter. |
| `gacli_check_compatibility` | Verify a metric+dimension combination is queryable. |

## Auth

The MCP server reuses gacli's existing auth chain. Run `gacli auth login` once on
the host where the MCP server runs. Tokens at `~/.gacli/oauth-tokens.json` are
read on each tool invocation.

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

Restart Claude Desktop. The four `gacli_*` tools will appear in the tool picker.

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
the four tools.

## Why these four tools and not all 30+ gacli commands

Two reasons:

1. **Safety**. Admin/audience write operations (deleting properties, creating audiences)
   should not be one prompt-injection away from happening. Read-only is the right v1
   boundary. Add write tools later behind explicit gates if needed.
2. **LLM ergonomics**. Tool surface area is a discoverability cost. Four tools with
   clear semantics outperform thirty tools with overlapping responsibilities. The
   `gacli_metadata` tool lets the LLM self-discover which fields exist for any
   report; the others execute. That's the whole productive surface for analytics
   Q&A.

## Why this matters

By 2026 every dev tool worth using ships an MCP server. For a GA4 CLI, MCP is the
distribution channel for non-developers — analysts ask Claude "what was traffic
yesterday by source?" and never touch a terminal. The CLI itself remains the
power-user interface; MCP is the diffusion layer.
