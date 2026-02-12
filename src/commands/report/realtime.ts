import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { validate } from '../../validation/validators.js';
import { realtimeReportOptsSchema } from '../../validation/schemas.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { runRealtimeReport } from '../../services/data-api.service.js';
import type { RunRealtimeReportParams, Dimension, Metric, MinuteRange } from '../../types/data-api.js';

export function createRealtimeCommand(): Command {
  const cmd = new Command('realtime')
    .description('Run a GA4 realtime report')
    .requiredOption('-m, --metrics <metrics...>', 'Metrics to include in the report')
    .option('-d, --dimensions <dimensions...>', 'Dimensions to include in the report')
    .option('--minute-ranges <json>', 'Minute ranges as a JSON string (e.g. \'[{"startMinutesAgo":10,"endMinutesAgo":0}]\')')
    .option('--dimension-filter <filters...>', 'Dimension filters')
    .option('--metric-filter <filters...>', 'Metric filters')
    .option('--limit <number>', 'Maximum number of rows to return')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        validate(realtimeReportOptsSchema, opts);

        const spinner = createSpinner('Running realtime report...');
        spinner.start();

        const metrics: Metric[] = opts.metrics.map((m: string) => ({ name: m }));

        const dimensions: Dimension[] | undefined = opts.dimensions
          ? opts.dimensions.map((d: string) => ({ name: d }))
          : undefined;

        const minuteRanges: MinuteRange[] | undefined = opts.minuteRanges
          ? JSON.parse(opts.minuteRanges)
          : undefined;

        const dimensionFilter = opts.dimensionFilter
          ? buildFilterExpression(opts.dimensionFilter)
          : undefined;

        const metricFilter = opts.metricFilter
          ? buildFilterExpression(opts.metricFilter)
          : undefined;

        const params: RunRealtimeReportParams = {
          property: `properties/${propertyId}`,
          metrics,
          dimensions,
          minuteRanges,
          dimensionFilter,
          metricFilter,
          limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
        };

        const data = await runRealtimeReport(params);

        spinner.stop();

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
