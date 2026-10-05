import { Command } from 'commander';
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
    .action(async (opts: { allowWrite?: boolean; allowDelete?: boolean }, command: Command) => {
      try {
        const globals = resolveGlobalOptions(command);
        // stdout is the protocol channel: keep every other byte off it.
        logger.setVerbose(false);
        const [{ OPERATIONS }, { createServerFactory }, { StdioServerTransport }] = await Promise.all([
          import('../../operations/index.js'),
          import('../../core/mcp-adapter.js'),
          import('@modelcontextprotocol/server/stdio'),
        ]);
        const factory = createServerFactory(OPERATIONS, {
          version: VERSION,
          globals,
          defaultProperty: globals.property || undefined,
          allowWrite: opts.allowWrite,
          allowDelete: opts.allowDelete,
        });
        await factory().connect(new StdioServerTransport());
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
