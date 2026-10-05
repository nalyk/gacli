import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { checkCompatibility } from '../../services/data-api.service.js';

const compatibilityRow = z.object({
  name: z.string(),
  type: z.enum(['Dimension', 'Metric']),
  compatibility: z.enum(['Compatible', 'Incompatible']),
});

type Row = z.infer<typeof compatibilityRow>;
type Entry = { compatibility?: unknown; apiName?: string | null };

// 1.x row order: compatible first, then incompatible, per type.
function rowsFor(type: Row['type'], entries: Entry[]): Row[] {
  const row = (e: Entry, compatibility: Row['compatibility']): Row => ({
    name: e.apiName ?? '',
    type,
    compatibility,
  });
  return [
    ...entries.filter((e) => e.compatibility === 'COMPATIBLE').map((e) => row(e, 'Compatible')),
    ...entries.filter((e) => e.compatibility !== 'COMPATIBLE').map((e) => row(e, 'Incompatible')),
  ];
}

export const metadataCheckCompatibility = defineOperation({
  id: 'metadata.check-compatibility',
  summary: 'Check compatibility of dimensions and metrics',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'CheckCompatibility' },
  input: z.object({
    metrics: z.array(z.string().min(1)).min(1).describe('Metrics to check compatibility for'),
    dimensions: z.array(z.string().min(1)).min(1).describe('Dimensions to check compatibility for'),
  }),
  flags: {
    metrics: '-m, --metrics <metrics...>',
    dimensions: '-d, --dimensions <dimensions...>',
  },
  output: z.array(compatibilityRow),
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Type', path: 'type' },
    { header: 'Compatibility', path: 'compatibility' },
  ],
  run: async (input, ctx) => {
    const response = await checkCompatibility(ctx.property, input.metrics, input.dimensions);
    const dims = (response.dimensionCompatibilities ?? []).map((d) => ({
      compatibility: d.compatibility,
      apiName: d.dimensionMetadata?.apiName,
    }));
    const mets = (response.metricCompatibilities ?? []).map((m) => ({
      compatibility: m.compatibility,
      apiName: m.metricMetadata?.apiName,
    }));
    return [...rowsFor('Dimension', dims), ...rowsFor('Metric', mets)];
  },
});
