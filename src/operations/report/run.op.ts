import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { runReport, runReportAlpha } from '../../services/data-api.service.js';
import type { RunReportParams } from '../../types/data-api.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { jsonArg } from '../json-arg.js';
import { parseOrderBys, reportDataSchema } from '../shared.js';

const conversionSpec = z.looseObject({
  conversionActions: z.array(z.string().min(1)).optional(),
  attributionModel: z.enum(['ATTRIBUTION_MODEL_UNSPECIFIED', 'DATA_DRIVEN', 'LAST_CLICK']).optional(),
});

export const reportRun = defineOperation({
  id: 'report.run',
  summary: 'Run a standard GA4 report',
  category: 'read',
  kind: 'report',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'RunReport' },
  input: z.object({
    metrics: z.array(z.string().min(1)).min(1).describe('Metrics to include in the report'),
    dimensions: z.array(z.string().min(1)).optional().describe('Dimensions to include in the report'),
    startDate: z.string().default('7daysAgo').describe('Start date for the report'),
    endDate: z.string().default('today').describe('End date for the report'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(250_000)
      .optional()
      .describe('Maximum number of rows to return'),
    offset: z.coerce.number().int().min(0).optional().describe('Row offset for pagination'),
    orderBy: z.array(z.string()).optional().describe('Order by specifications (e.g. "metric:sessions:desc")'),
    dimensionFilter: z.array(z.string()).optional().describe('Dimension filters (e.g. "country==Romania")'),
    metricFilter: z.array(z.string()).optional().describe('Metric filters (e.g. "sessions>100")'),
    keepEmptyRows: z.boolean().optional().describe('Include rows with all zero metric values'),
    returnPropertyQuota: z
      .boolean()
      .optional()
      .describe('Also return the property quota state; it lands in the report metadata as propertyQuota'),
    conversionSpec: jsonArg(conversionSpec)
      .optional()
      .describe(
        'Conversion report spec as JSON (inline, @file or @-): {"conversionActions":["conversionActions/1234"],' +
          '"attributionModel":"DATA_DRIVEN"|"LAST_CLICK"}. When set the report runs on the v1alpha API',
      ),
  }),
  flags: {
    metrics: '-m, --metrics <metrics...>',
    dimensions: '-d, --dimensions <dimensions...>',
    startDate: '--start-date <date>',
    endDate: '--end-date <date>',
    limit: '--limit <number>',
    offset: '--offset <number>',
    orderBy: '--order-by <orderBys...>',
    dimensionFilter: '--dimension-filter <filters...>',
    metricFilter: '--metric-filter <filters...>',
    returnPropertyQuota: '--return-property-quota',
    conversionSpec: '--conversion-spec <json>',
  },
  output: reportDataSchema,
  run: async (input, ctx) => {
    const params: RunReportParams = {
      property: `properties/${ctx.property}`,
      dateRanges: [{ startDate: resolveDate(input.startDate), endDate: resolveDate(input.endDate) }],
      metrics: input.metrics.map((name) => ({ name })),
      dimensions: input.dimensions?.map((name) => ({ name })),
      dimensionFilter: input.dimensionFilter ? buildFilterExpression(input.dimensionFilter) : undefined,
      metricFilter: input.metricFilter ? buildFilterExpression(input.metricFilter) : undefined,
      orderBys: parseOrderBys(input.orderBy),
      limit: input.limit,
      offset: input.offset,
      keepEmptyRows: input.keepEmptyRows ?? false,
      ...(input.returnPropertyQuota && { returnPropertyQuota: true }),
    };
    // conversionSpec exists only on the v1alpha RunReport
    return input.conversionSpec
      ? runReportAlpha({ ...params, conversionSpec: input.conversionSpec })
      : runReport(params);
  },
});
