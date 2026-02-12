import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { listAudienceExports } from '../../services/data-api.service.js';

export function createExportListCommand(): Command {
  const cmd = new Command('list')
    .description('List audience exports for a property')
    .action(async (_opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Listing audience exports...');
        spinner.start();

        const exports = await listAudienceExports(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Audience', 'State', 'Row Count', 'Begin Creating Time'],
          rows: exports.map((exp: any) => [
            exp.name ?? '',
            exp.audience ?? '',
            exp.state ?? '',
            String(exp.rowCount ?? ''),
            exp.beginCreatingTime ?? '',
          ]),
          rowCount: exports.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
