import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { validate } from '../../validation/validators.js';
import { runReportOptsSchema } from '../../validation/schemas.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { runReport } from '../../services/data-api.service.js';
import type { RunReportParams, Dimension, Metric, OrderBy, DateRange } from '../../types/data-api.js';

export function createRunCommand(): Command {
  const cmd = new Command('run')
    .description('Run a standard GA4 report')
    .requiredOption('-m, --metrics <metrics...>', 'Metrics to include in the report')
    .option('-d, --dimensions <dimensions...>', 'Dimensions to include in the report')
    .option('--start-date <date>', 'Start date for the report', '7daysAgo')
    .option('--end-date <date>', 'End date for the report', 'today')
    .option('--limit <number>', 'Maximum number of rows to return')
    .option('--offset <number>', 'Row offset for pagination')
    .option('--order-by <orderBys...>', 'Order by specifications (e.g. "metric:sessions:desc")')
    .option('--dimension-filter <filters...>', 'Dimension filters')
    .option('--metric-filter <filters...>', 'Metric filters')
    .option('--keep-empty-rows', 'Include rows with all zero metric values')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        validate(runReportOptsSchema, opts);

        const spinner = createSpinner('Running report...');
        spinner.start();

        const dateRanges: DateRange[] = [
          {
            startDate: resolveDate(opts.startDate),
            endDate: resolveDate(opts.endDate),
          },
        ];

        const metrics: Metric[] = opts.metrics.map((m: string) => ({ name: m }));

        const dimensions: Dimension[] | undefined = opts.dimensions
          ? opts.dimensions.map((d: string) => ({ name: d }))
          : undefined;

        const dimensionFilter = opts.dimensionFilter
          ? buildFilterExpression(opts.dimensionFilter)
          : undefined;

        const metricFilter = opts.metricFilter
          ? buildFilterExpression(opts.metricFilter)
          : undefined;

        const orderBys: OrderBy[] | undefined = opts.orderBy
          ? opts.orderBy.map((o: string) => {
              const parts = o.split(':');
              const type = parts[0];
              const name = parts[1];
              const desc = parts[2] === 'desc';
              if (type === 'metric') {
                return { metric: { metricName: name }, desc } as OrderBy;
              }
              return { dimension: { dimensionName: name }, desc } as OrderBy;
            })
          : undefined;

        const params: RunReportParams = {
          property: `properties/${propertyId}`,
          dateRanges,
          metrics,
          dimensions,
          dimensionFilter,
          metricFilter,
          orderBys,
          limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
          offset: opts.offset ? parseInt(opts.offset, 10) : undefined,
          keepEmptyRows: opts.keepEmptyRows ?? false,
        };

        const data = await runReport(params);

        spinner.stop();

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
