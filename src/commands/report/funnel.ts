import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { validate } from '../../validation/validators.js';
import { funnelReportOptsSchema } from '../../validation/schemas.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { runFunnelReport } from '../../services/data-api.service.js';
import type { RunFunnelReportParams, FunnelStep, DateRange } from '../../types/data-api.js';

export function createFunnelCommand(): Command {
  const cmd = new Command('funnel')
    .description('Run a GA4 funnel report')
    .requiredOption('--steps <json>', 'Funnel steps as a JSON string of FunnelStep[]')
    .option('--open-funnel', 'Use an open funnel (users can enter at any step)')
    .option('--funnel-breakdown <dimension>', 'Dimension name to break down the funnel by')
    .option('--start-date <date>', 'Start date for the report', '7daysAgo')
    .option('--end-date <date>', 'End date for the report', 'today')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        validate(funnelReportOptsSchema, opts);

        const spinner = createSpinner('Running funnel report...');
        spinner.start();

        const steps: FunnelStep[] = JSON.parse(opts.steps);

        const dateRanges: DateRange[] = [
          {
            startDate: resolveDate(opts.startDate),
            endDate: resolveDate(opts.endDate),
          },
        ];

        const params: RunFunnelReportParams = {
          property: `properties/${propertyId}`,
          dateRanges,
          funnel: {
            steps,
            isOpenFunnel: opts.openFunnel ?? false,
          },
          funnelBreakdown: opts.funnelBreakdown
            ? { breakdownDimension: { name: opts.funnelBreakdown } }
            : undefined,
        };

        const data = await runFunnelReport(params);

        spinner.stop();

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
