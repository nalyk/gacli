import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { runPivotReport } from '../../services/data-api.service.js';
import type { PivotDefinition } from '../../types/data-api.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { jsonArg } from '../json-arg.js';
import { nameList, reportDataSchema } from '../shared.js';

const pivot = z.looseObject({
  fieldNames: z.array(z.string()).min(1),
  orderBys: z.array(z.looseObject({})).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1),
  metricAggregations: z.array(z.enum(['TOTAL', 'MINIMUM', 'MAXIMUM', 'COUNT'])).optional(),
});

// 1.x validated a single object but the API wants an array; accept both (preprocess keeps per-field errors).
const pivots = z.preprocess((v) => (Array.isArray(v) ? v : [v]), z.array(pivot).min(1));

export const reportPivot = defineOperation({
  id: 'report.pivot',
  summary: 'Run a GA4 pivot report',
  category: 'read',
  kind: 'report',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'RunPivotReport' },
  input: z.object({
    metrics: nameList({ min: 1 }).describe('Metrics to include in the report'),
    dimensions: nameList({ min: 1 }).describe('Dimensions to include in the report'),
    pivots: jsonArg(pivots).describe(
      'Pivot definitions as JSON (inline, @file or @-), e.g. [{"fieldNames":["browser"],"limit":5}]',
    ),
    startDate: z
      .string()
      .default('7daysAgo')
      .describe('Start date: YYYY-MM-DD, today, yesterday or NdaysAgo'),
    endDate: z.string().default('today').describe('End date: YYYY-MM-DD, today, yesterday or NdaysAgo'),
    dimensionFilter: z.array(z.string()).optional().describe('Dimension filters'),
    metricFilter: z.array(z.string()).optional().describe('Metric filters'),
  }),
  flags: {
    metrics: '-m, --metrics <metrics...>',
    dimensions: '-d, --dimensions <dimensions...>',
    pivots: '--pivots <json>',
    startDate: '--start-date <date>',
    endDate: '--end-date <date>',
    dimensionFilter: '--dimension-filter <filters...>',
    metricFilter: '--metric-filter <filters...>',
  },
  output: reportDataSchema,
  run: async (input, ctx) =>
    runPivotReport({
      property: `properties/${ctx.property}`,
      dateRanges: [{ startDate: resolveDate(input.startDate), endDate: resolveDate(input.endDate) }],
      metrics: input.metrics.map((name) => ({ name })),
      dimensions: input.dimensions.map((name) => ({ name })),
      pivots: input.pivots as PivotDefinition[],
      dimensionFilter: input.dimensionFilter ? buildFilterExpression(input.dimensionFilter) : undefined,
      metricFilter: input.metricFilter ? buildFilterExpression(input.metricFilter) : undefined,
    }),
});
