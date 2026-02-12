import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { getAudienceExport } from '../../services/data-api.service.js';

export function createExportGetCommand(): Command {
  const cmd = new Command('get')
    .description('Get details of an audience export')
    .requiredOption('--name <name>', 'Audience export resource name')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);

        const spinner = createSpinner('Fetching audience export...');
        spinner.start();

        const result = await getAudienceExport(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Field', 'Value'],
          rows: [
            ['Name', result.name ?? ''],
            ['Audience', result.audience ?? ''],
            ['State', result.state ?? ''],
            ['Creation Quota Tokens Charged', String(result.creationQuotaTokensCharged ?? '')],
            ['Row Count', String(result.rowCount ?? '')],
            ['Begin Creating Time', result.beginCreatingTime ?? ''],
          ],
          rowCount: 6,
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
