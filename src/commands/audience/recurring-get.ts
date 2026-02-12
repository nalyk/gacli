import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { getRecurringAudienceList } from '../../services/data-api.service.js';

export function createRecurringGetCommand(): Command {
  const cmd = new Command('get')
    .description('Get details of a recurring audience list')
    .requiredOption('--name <name>', 'Recurring audience list resource name')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);

        const spinner = createSpinner('Fetching recurring audience list...');
        spinner.start();

        const result = await getRecurringAudienceList(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Field', 'Value'],
          rows: [
            ['Name', result.name ?? ''],
            ['Audience', result.audience ?? ''],
            ['State', result.state ?? ''],
          ],
          rowCount: 3,
          metadata: { raw: result },
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
