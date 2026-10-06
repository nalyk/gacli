import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { runRealtimeReport } from '../../services/data-api.service.js';
import type { MinuteRange } from '../../types/data-api.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { jsonArg } from '../json-arg.js';
import { nameList, reportDataSchema } from '../shared.js';

const minuteRanges = z.array(
  z.looseObject({
    name: z.string().optional(),
    // 29 for standard properties, 59 for Analytics 360; the API enforces the per-property limit.
    startMinutesAgo: z.number().int().min(0).max(59).optional(),
    endMinutesAgo: z.number().int().min(0).max(59).optional(),
  }),
);

export const reportRealtime = defineOperation({
  id: 'report.realtime',
  summary: 'Run a GA4 realtime report',
  category: 'read',
  kind: 'report',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'RunRealtimeReport' },
  input: z.object({
    metrics: nameList({ min: 1 }).describe('Metrics to include in the report'),
    dimensions: nameList().optional().describe('Dimensions to include in the report'),
    minuteRanges: jsonArg(minuteRanges)
      .optional()
      .describe(
        'Minute ranges as JSON, e.g. [{"startMinutesAgo":10,"endMinutesAgo":0}] (up to 29 minutes ago; 59 on Analytics 360)',
      ),
    dimensionFilter: z.array(z.string()).optional().describe('Dimension filters'),
    metricFilter: z.array(z.string()).optional().describe('Metric filters'),
    limit: z.coerce.number().int().min(1).optional().describe('Maximum number of rows to return'),
  }),
  flags: {
    metrics: '-m, --metrics <metrics...>',
    dimensions: '-d, --dimensions <dimensions...>',
    minuteRanges: '--minute-ranges <json>',
    dimensionFilter: '--dimension-filter <filters...>',
    metricFilter: '--metric-filter <filters...>',
    limit: '--limit <number>',
  },
  output: reportDataSchema,
  run: async (input, ctx) =>
    runRealtimeReport({
      property: `properties/${ctx.property}`,
      metrics: input.metrics.map((name) => ({ name })),
      dimensions: input.dimensions?.map((name) => ({ name })),
      minuteRanges: input.minuteRanges as MinuteRange[] | undefined,
      dimensionFilter: input.dimensionFilter ? buildFilterExpression(input.dimensionFilter) : undefined,
      metricFilter: input.metricFilter ? buildFilterExpression(input.metricFilter) : undefined,
      limit: input.limit,
    }),
});
