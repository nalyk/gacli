import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { batchRunPivotReports } from '../../services/data-api.service.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createBatchPivotCommand(): Command {
  const cmd = new Command('batch-pivot')
    .description('Run multiple GA4 pivot reports in a single batch request')
    .requiredOption(
      '--requests <path>',
      'Path to JSON file containing an array of pivot report request objects',
    )
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Running batch pivot reports...');
        spinner.start();

        const fileContent = readFileSync(opts.requests, 'utf-8');
        const requests = JSON.parse(fileContent);

        const results = await batchRunPivotReports(propertyId, { requests });

        spinner.stop();

        const reports = Array.isArray(results) ? results : [results];
        for (let i = 0; i < reports.length; i++) {
          const output = formatOutput(reports[i], globalOpts.format);
          if (reports.length > 1) {
            console.log(`\n--- Pivot Report ${i + 1} ---`);
          }
          writeOutput(output, globalOpts);
        }
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
