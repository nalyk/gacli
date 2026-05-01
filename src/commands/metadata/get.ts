import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { getMetadata } from '../../services/data-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

interface MetadataItem {
  apiName?: string | null;
  uiName?: string | null;
  description?: string | null;
  category?: string | null;
  customDefinition?: boolean | null;
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
          const matchesTerm = (m: MetadataItem) =>
            (m.apiName ?? '').toLowerCase().includes(term) ||
            (m.uiName ?? '').toLowerCase().includes(term) ||
            (m.description ?? '').toLowerCase().includes(term);
          dimensions = dimensions.filter(matchesTerm);
          metrics = metrics.filter(matchesTerm);
        }

        const items: MetadataItem[] = [...dimensions, ...metrics];

        const data: ReportData = {
          headers: ['API Name', 'UI Name', 'Description', 'Category', 'Custom'],
          rows: items.map((item) => [
            item.apiName ?? '',
            item.uiName ?? '',
            item.description ?? '',
            item.category ?? '',
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
