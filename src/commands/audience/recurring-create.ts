import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { createRecurringAudienceList } from '../../services/data-api.service.js';

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
          headers: ['Name', 'Audience', 'State'],
          rows: [[result.name ?? '', result.audience ?? '', result.state ?? '']],
          rowCount: 1,
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
