import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getMetadata } from '../../services/data-api.service.js';

const metadataItem = z.looseObject({
  type: z.enum(['dimension', 'metric']),
  apiName: z.string().nullish(),
  uiName: z.string().nullish(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  customDefinition: z.boolean().nullish(),
});

type Item = {
  apiName?: string | null;
  uiName?: string | null;
  description?: string | null;
  customDefinition?: boolean | null;
};

export const metadataGet = defineOperation({
  id: 'metadata.get',
  summary: 'Get metadata (dimensions and metrics) for a GA4 property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'GetMetadata' },
  input: z.object({
    type: z
      .enum(['dims', 'metrics', 'all'])
      .default('all')
      .describe('Type of metadata to retrieve (dims, metrics, all)'),
    search: z.string().optional().describe('Filter results by name or description'),
    customOnly: z.boolean().optional().describe('Show only custom dimensions/metrics'),
  }),
  flags: { type: '--type <type>', search: '--search <term>' },
  output: z.array(metadataItem),
  columns: [
    { header: 'API Name', path: 'apiName' },
    { header: 'UI Name', path: 'uiName' },
    { header: 'Description', path: 'description' },
    { header: 'Category', path: 'category' },
    { header: 'Custom', path: 'customDefinition', format: (v) => (v ? 'Yes' : 'No') },
  ],
  run: async (input, ctx) => {
    const metadata = await getMetadata(ctx.property);
    const term = input.search?.toLowerCase();
    const keep = (m: Item) =>
      (!input.customOnly || !!m.customDefinition) &&
      (!term || [m.apiName, m.uiName, m.description].some((s) => (s ?? '').toLowerCase().includes(term)));
    const dims = input.type === 'metrics' ? [] : ((metadata.dimensions ?? []) as Item[]);
    const mets = input.type === 'dims' ? [] : ((metadata.metrics ?? []) as Item[]);
    return [
      ...dims.filter(keep).map((d) => ({ type: 'dimension' as const, ...d })),
      ...mets.filter(keep).map((m) => ({ type: 'metric' as const, ...m })),
    ];
  },
});
