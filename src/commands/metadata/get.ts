import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import { getMetadata } from '../../services/data-api.service.js';

interface MetadataItem {
  apiName: string;
  uiName: string;
  description: string;
  category: string;
  customDefinition: boolean;
}

export function createGetCommand(): Command {
  const cmd = new Command('get')
    .description('Get metadata (dimensions and metrics) for a GA4 property')
    .option('--type <type>', 'Type of metadata to retrieve (dims, metrics, all)', 'all')
    .option('--search <term>', 'Filter results by name or description')
    .option('--custom-only', 'Show only custom dimensions/metrics')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Fetching metadata...');
        spinner.start();

        const metadata = await getMetadata(propertyId);

        spinner.stop();

        let dimensions: MetadataItem[] = metadata.dimensions || [];
        let metrics: MetadataItem[] = metadata.metrics || [];

        // Filter by type
        if (opts.type === 'dims') {
          metrics = [];
        } else if (opts.type === 'metrics') {
          dimensions = [];
        }

        // Filter by custom only
        if (opts.customOnly) {
          dimensions = dimensions.filter((d: MetadataItem) => d.customDefinition);
          metrics = metrics.filter((m: MetadataItem) => m.customDefinition);
        }

        // Filter by search term
        if (opts.search) {
          const term = opts.search.toLowerCase();
          dimensions = dimensions.filter(
            (d: MetadataItem) =>
              d.apiName.toLowerCase().includes(term) ||
              d.uiName.toLowerCase().includes(term) ||
              d.description.toLowerCase().includes(term),
          );
          metrics = metrics.filter(
            (m: MetadataItem) =>
              m.apiName.toLowerCase().includes(term) ||
              m.uiName.toLowerCase().includes(term) ||
              m.description.toLowerCase().includes(term),
          );
        }

        const items: MetadataItem[] = [...dimensions, ...metrics];

        const data: ReportData = {
          headers: ['API Name', 'UI Name', 'Description', 'Category', 'Custom'],
          rows: items.map((item) => [
            item.apiName,
            item.uiName,
            item.description,
            item.category,
            item.customDefinition ? 'Yes' : 'No',
          ]),
          rowCount: items.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
