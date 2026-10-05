import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { formatReports } from '../../formatters/index.js';
import { batchRunReports } from '../../services/data-api.service.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createBatchCommand(): Command {
  const cmd = new Command('batch')
    .description('Run multiple GA4 reports in a single batch request')
    .requiredOption('--requests <path>', 'Path to JSON file containing an array of report request objects')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Running batch reports...');
        spinner.start();

        const fileContent = readFileSync(opts.requests, 'utf-8');
        const requests = JSON.parse(fileContent);

        const results = await batchRunReports(propertyId, { requests });

        spinner.stop();

        const reports = Array.isArray(results) ? results : [results];
        writeOutput(formatReports(reports, globalOpts.format), globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
