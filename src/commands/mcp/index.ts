import { Command } from 'commander';
import { GacliError } from '../../core/errors.js';
import { resolveGlobalOptions } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';
import { VERSION } from '../../version.js';

export function createMcpCommand(): Command {
  const cmd = new Command('mcp').description('Model Context Protocol server');

  cmd
    .command('serve')
    .description(
      'Serve every gacli operation as an MCP tool (ga_<operation>). Read-only unless --allow-write/--allow-delete. ' +
        'Connect from Claude Desktop/Code, Cursor, Codex, etc.',
    )
    .option('--allow-write', 'Also expose create/update tools')
    .option('--allow-delete', 'Also expose delete/archive tools (implies --allow-write)')
    .option(
      '--http <port>',
      'Serve Streamable HTTP on http://127.0.0.1:<port>/mcp instead of stdio (local only, no auth)',
    )
    .action(
      async (opts: { allowWrite?: boolean; allowDelete?: boolean; http?: string }, command: Command) => {
        try {
          const globals = resolveGlobalOptions(command);
          // stdout is the protocol channel: keep every other byte off it.
          logger.setVerbose(false);
          // Backstop: a stray SDK rejection must not kill a long-running server (logged to stderr).
          process.on('unhandledRejection', (reason) => {
            logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
          });
          const port = opts.http === undefined ? undefined : Number(opts.http);
          if (port !== undefined && !(Number.isInteger(port) && port >= 0 && port <= 65535)) {
            throw new GacliError('usage', `Invalid --http port "${opts.http}"`);
          }
          const [{ OPERATIONS }, { createServerFactory }] = await Promise.all([
            import('../../operations/index.js'),
            import('../../core/mcp-adapter.js'),
          ]);
          const factory = createServerFactory(OPERATIONS, {
            version: VERSION,
            globals,
            defaultProperty: globals.property || undefined,
            allowWrite: opts.allowWrite,
            allowDelete: opts.allowDelete,
          });
          if (port !== undefined) {
            const { serveHttp } = await import('./http.js');
            const server = await serveHttp(factory, port);
            const { port: bound } = server.address() as { port: number };
            logger.info(`MCP server listening on http://127.0.0.1:${bound}/mcp`);
            return;
          }
          const { StdioServerTransport } = await import('@modelcontextprotocol/server/stdio');
          await factory().connect(new StdioServerTransport());
        } catch (error) {
          handleError(error);
        }
      },
    );

  return cmd;
}
