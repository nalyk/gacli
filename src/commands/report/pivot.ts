import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { validate } from '../../validation/validators.js';
import { pivotSchema } from '../../validation/schemas.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { runPivotReport } from '../../services/data-api.service.js';
import type { RunPivotReportParams, Dimension, Metric, DateRange, PivotDefinition } from '../../types/data-api.js';

export function createPivotCommand(): Command {
  const cmd = new Command('pivot')
    .description('Run a GA4 pivot report')
    .requiredOption('-m, --metrics <metrics...>', 'Metrics to include in the report')
    .requiredOption('-d, --dimensions <dimensions...>', 'Dimensions to include in the report')
    .requiredOption('--pivots <json>', 'Pivot definitions as a JSON string')
    .option('--start-date <date>', 'Start date for the report', '7daysAgo')
    .option('--end-date <date>', 'End date for the report', 'today')
    .option('--dimension-filter <filters...>', 'Dimension filters')
    .option('--metric-filter <filters...>', 'Metric filters')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const pivots: PivotDefinition[] = JSON.parse(opts.pivots);
        validate(pivotSchema, pivots);

        const spinner = createSpinner('Running pivot report...');
        spinner.start();

        const dateRanges: DateRange[] = [
          {
            startDate: resolveDate(opts.startDate),
            endDate: resolveDate(opts.endDate),
          },
        ];

        const metrics: Metric[] = opts.metrics.map((m: string) => ({ name: m }));
        const dimensions: Dimension[] = opts.dimensions.map((d: string) => ({ name: d }));

        const dimensionFilter = opts.dimensionFilter
          ? buildFilterExpression(opts.dimensionFilter)
          : undefined;

        const metricFilter = opts.metricFilter
          ? buildFilterExpression(opts.metricFilter)
          : undefined;

        const params: RunPivotReportParams = {
          property: `properties/${propertyId}`,
          dateRanges,
          metrics,
          dimensions,
          pivots,
          dimensionFilter,
          metricFilter,
        };

        const data = await runPivotReport(params);

        spinner.stop();

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
