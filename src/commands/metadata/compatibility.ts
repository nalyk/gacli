import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { checkCompatibility } from '../../services/data-api.service.js';

export function createCheckCompatibilityCommand(): Command {
  const cmd = new Command('check-compatibility')
    .description('Check compatibility of dimensions and metrics')
    .requiredOption('-m, --metrics <metrics...>', 'Metrics to check compatibility for')
    .requiredOption('-d, --dimensions <dimensions...>', 'Dimensions to check compatibility for')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Checking compatibility...');
        spinner.start();

        const response = await checkCompatibility(propertyId, opts.metrics, opts.dimensions);

        spinner.stop();

        const compatibleDimensions = (response.dimensionCompatibilities || [])
          .filter((d: any) => d.compatibility === 'COMPATIBLE')
          .map((d: any) => d.dimensionMetadata?.apiName ?? '');

        const incompatibleDimensions = (response.dimensionCompatibilities || [])
          .filter((d: any) => d.compatibility !== 'COMPATIBLE')
          .map((d: any) => d.dimensionMetadata?.apiName ?? '');

        const compatibleMetrics = (response.metricCompatibilities || [])
          .filter((m: any) => m.compatibility === 'COMPATIBLE')
          .map((m: any) => m.metricMetadata?.apiName ?? '');

        const incompatibleMetrics = (response.metricCompatibilities || [])
          .filter((m: any) => m.compatibility !== 'COMPATIBLE')
          .map((m: any) => m.metricMetadata?.apiName ?? '');

        const rows: string[][] = [];

        for (const name of compatibleDimensions) {
          rows.push([name, 'Dimension', 'Compatible']);
        }
        for (const name of incompatibleDimensions) {
          rows.push([name, 'Dimension', 'Incompatible']);
        }
        for (const name of compatibleMetrics) {
          rows.push([name, 'Metric', 'Compatible']);
        }
        for (const name of incompatibleMetrics) {
          rows.push([name, 'Metric', 'Incompatible']);
        }

        const data: ReportData = {
          headers: ['Name', 'Type', 'Compatibility'],
          rows,
          rowCount: rows.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
