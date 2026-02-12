import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { queryAudienceExport } from '../../services/data-api.service.js';

export function createExportQueryCommand(): Command {
  const cmd = new Command('query')
    .description('Query an audience export to retrieve audience members')
    .requiredOption('--name <name>', 'Audience export resource name')
    .option('--limit <number>', 'Maximum number of rows to return')
    .option('--offset <number>', 'Row offset for pagination')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);

        const limit = opts.limit ? parseInt(opts.limit, 10) : undefined;
        const offset = opts.offset ? parseInt(opts.offset, 10) : undefined;

        const spinner = createSpinner('Querying audience export...');
        spinner.start();

        const data = await queryAudienceExport(opts.name, limit, offset);

        spinner.stop();

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
