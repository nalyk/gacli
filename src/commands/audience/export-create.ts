import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { createAudienceExport } from '../../services/data-api.service.js';

export function createExportCreateCommand(): Command {
  const cmd = new Command('create')
    .description('Create an audience export')
    .requiredOption('--audience <audience>', 'Audience resource name')
    .option('--dimensions <dimensions...>', 'Dimensions to include in the export')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Creating audience export...');
        spinner.start();

        const result = await createAudienceExport(propertyId, opts.audience, opts.dimensions);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'State'],
          rows: [[result.name ?? '', result.metadata?.state ?? result.state ?? '']],
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
