import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { runCohortReport } from '../../services/data-api.service.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import type { Dimension, Metric, RunCohortReportParams } from '../../types/data-api.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { cohortReportOptsSchema } from '../../validation/schemas.js';
import { validate, validatePropertyId } from '../../validation/validators.js';

export function createCohortCommand(): Command {
  const cmd = new Command('cohort')
    .description('Run a GA4 cohort report')
    .requiredOption('-m, --metrics <metrics...>', 'Metrics to include in the report')
    .requiredOption('--cohorts <json>', 'Cohort definitions as a JSON string')
    .option('--cohort-granularity <granularity>', 'Cohort granularity: DAILY, WEEKLY, or MONTHLY')
    .option('--end-offset <number>', 'End offset for the cohort report')
    .option('--start-offset <number>', 'Start offset for the cohort report')
    .option('-d, --dimensions <dimensions...>', 'Dimensions to include in the report')
    .option('--accumulate', 'Accumulate cohort data over time')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        validate(cohortReportOptsSchema, opts);

        const spinner = createSpinner('Running cohort report...');
        spinner.start();

        const metrics: Metric[] = opts.metrics.map((m: string) => ({ name: m }));

        const dimensions: Dimension[] | undefined = opts.dimensions
          ? opts.dimensions.map((d: string) => ({ name: d }))
          : undefined;

        const cohorts = JSON.parse(opts.cohorts);

        const params: RunCohortReportParams = {
          property: `properties/${propertyId}`,
          metrics,
          dimensions,
          cohortSpec: {
            cohorts,
            cohortsRange: {
              granularity: (opts.cohortGranularity ?? 'DAILY') as 'DAILY' | 'WEEKLY' | 'MONTHLY',
              startOffset: opts.startOffset ? parseInt(opts.startOffset, 10) : undefined,
              endOffset: opts.endOffset ? parseInt(opts.endOffset, 10) : 5,
            },
          },
          accumulate: opts.accumulate ?? false,
        };

        const data = await runCohortReport(params);

        spinner.stop();

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
