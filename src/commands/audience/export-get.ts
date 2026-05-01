import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { getAudienceExport } from '../../services/data-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';

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

        const ts = result.beginCreatingTime;
        const beginCreatingStr =
          ts && typeof ts === 'object' && 'seconds' in ts && ts.seconds !== undefined
            ? new Date(Number(ts.seconds) * 1000).toISOString()
            : '';

        const data: ReportData = {
          headers: ['Field', 'Value'],
          rows: [
            ['Name', result.name ?? ''],
            ['Audience', result.audience ?? ''],
            ['State', String(result.state ?? '')],
            ['Creation Quota Tokens Charged', String(result.creationQuotaTokensCharged ?? '')],
            ['Row Count', String(result.rowCount ?? '')],
            ['Begin Creating Time', beginCreatingStr],
          ],
          rowCount: 6,
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
