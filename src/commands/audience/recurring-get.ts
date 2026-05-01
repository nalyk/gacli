import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { getRecurringAudienceList } from '../../services/data-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';

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
            ['Audience Display Name', result.audienceDisplayName ?? ''],
            ['Active Days Remaining', String(result.activeDaysRemaining ?? '')],
          ],
          rowCount: 4,
          metadata: { raw: result as unknown as Record<string, unknown> },
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
