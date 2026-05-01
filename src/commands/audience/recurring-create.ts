import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { createRecurringAudienceList } from '../../services/data-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createRecurringCreateCommand(): Command {
  const cmd = new Command('create')
    .description('Create a recurring audience list')
    .requiredOption('--audience <audience>', 'Audience resource name')
    .option('--dimensions <dimensions...>', 'Dimensions to include')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Creating recurring audience list...');
        spinner.start();

        const result = await createRecurringAudienceList(propertyId, opts.audience, opts.dimensions);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Audience', 'Active Days Remaining'],
          rows: [[result.name ?? '', result.audience ?? '', String(result.activeDaysRemaining ?? '')]],
          rowCount: 1,
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
