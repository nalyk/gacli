import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { createAudienceExport } from '../../services/data-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createExportCreateCommand(): Command {
  const cmd = new Command('create')
    .description('Create an audience export')
    .requiredOption('--audience <audience>', 'Audience resource name')
    .option('--dimensions <dimensions...>', 'Dimensions to include in the export')
    .option('--watch', 'Wait for the export to finish (long-running operation)', false)
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Creating audience export...');
        spinner.start();

        const operation = await createAudienceExport(propertyId, opts.audience, opts.dimensions);

        if (opts.watch && typeof operation.promise === 'function') {
          spinner.text = `Waiting for export ${operation.name ?? ''} to finish...`;
          const [resource] = await operation.promise();
          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Audience', 'State', 'Row Count'],
            rows: [
              [
                resource.name ?? '',
                resource.audience ?? '',
                String(resource.state ?? ''),
                String(resource.rowCount ?? ''),
              ],
            ],
            rowCount: 1,
            metadata: { done: true },
          };

          const output = formatOutput(data, globalOpts.format);
          writeOutput(output, globalOpts);
          return;
        }

        spinner.stop();

        const opMetadata = operation.metadata as { state?: string } | null;
        if (!opts.watch) {
          logger.info(
            `Export started. Use \`gacli audience export-get --name "${operation.name}"\` to check status, ` +
              `or re-run with --watch to block until done.`,
          );
        }

        const data: ReportData = {
          headers: ['Operation Name', 'State'],
          rows: [[operation.name ?? '', opMetadata?.state ?? 'CREATING']],
          rowCount: 1,
          metadata: { done: !!operation.done },
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
