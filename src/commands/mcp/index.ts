import { Command } from 'commander';
import { resolveGlobalOptions } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

export function createMcpCommand(): Command {
  const cmd = new Command('mcp').description('Model Context Protocol server (stdio)');

  cmd
    .command('serve')
    .description(
      'Start an MCP server over stdio. Connect from Claude Desktop, Cursor, Cline, etc. ' +
        'Tools: gacli_report_run, gacli_report_realtime, gacli_metadata, gacli_check_compatibility.',
    )
    .action(async (_opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        // The MCP transport speaks JSON-RPC on stdout; gacli's normal logging goes to stderr already
        // but we go silent on the spinner-style messages to avoid any stdout contamination risk.
        logger.setVerbose(false);
        const { startServer } = await import('./server.js');
        await startServer(globalOpts.property ?? '');
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
