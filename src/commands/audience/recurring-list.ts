import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { listRecurringAudienceLists } from '../../services/data-api.service.js';

export function createRecurringListCommand(): Command {
  const cmd = new Command('list')
    .description('List recurring audience lists for a property')
    .action(async (_opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Listing recurring audience lists...');
        spinner.start();

        const lists = await listRecurringAudienceLists(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Audience', 'State'],
          rows: lists.map((item: any) => [
            item.name ?? '',
            item.audience ?? '',
            item.state ?? '',
          ]),
          rowCount: lists.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
