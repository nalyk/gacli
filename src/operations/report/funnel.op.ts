import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { runFunnelReport } from '../../services/data-api.service.js';
import type { FunnelStep } from '../../types/data-api.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { jsonArg } from '../json-arg.js';
import { reportDataSchema } from '../shared.js';

// google.protobuf.Duration: the gRPC client needs { seconds, nanos }; "90s" (proto JSON form) is converted.
const duration = z.union([
  z.object({
    seconds: z.coerce.number().int().min(0),
    nanos: z.number().int().min(0).max(999_999_999).optional(),
  }),
  z
    .string()
    .regex(/^\d+(\.\d+)?s$/, 'expected a duration like "90s" or {"seconds":90}')
    .transform((s) => {
      const value = Number(s.slice(0, -1));
      const seconds = Math.floor(value);
      const nanos = Math.round((value - seconds) * 1e9);
      return nanos ? { seconds, nanos } : { seconds };
    }),
]);

const steps = z
  .array(
    z.looseObject({
      name: z.string().min(1),
      isDirectlyFollowedBy: z.boolean().optional(),
      filterExpression: z.looseObject({}).optional(),
      withinDurationFromPriorStep: duration.optional(),
    }),
  )
  .min(1);

export const reportFunnel = defineOperation({
  id: 'report.funnel',
  summary: 'Run a GA4 funnel report',
  category: 'read',
  kind: 'report',
  needsProperty: true,
  api: { service: 'data', version: 'v1alpha', rpc: 'RunFunnelReport' },
  input: z.object({
    steps: jsonArg(steps).describe(
      'Funnel steps as JSON (inline, @file or @-), e.g. [{"name":"View","filterExpression":{...}},{"name":"Buy","filterExpression":{...},"withinDurationFromPriorStep":"600s"}]',
    ),
    openFunnel: z.boolean().optional().describe('Use an open funnel (users can enter at any step)'),
    funnelBreakdown: z.string().min(1).optional().describe('Dimension name to break down the funnel by'),
    startDate: z
      .string()
      .default('7daysAgo')
      .describe('Start date: YYYY-MM-DD, today, yesterday or NdaysAgo'),
    endDate: z.string().default('today').describe('End date: YYYY-MM-DD, today, yesterday or NdaysAgo'),
  }),
  flags: {
    steps: '--steps <json>',
    openFunnel: '--open-funnel',
    funnelBreakdown: '--funnel-breakdown <dimension>',
    startDate: '--start-date <date>',
    endDate: '--end-date <date>',
  },
  output: reportDataSchema,
  run: async (input, ctx) =>
    runFunnelReport({
      property: `properties/${ctx.property}`,
      dateRanges: [{ startDate: resolveDate(input.startDate), endDate: resolveDate(input.endDate) }],
      funnel: { steps: input.steps as FunnelStep[], isOpenFunnel: input.openFunnel ?? false },
      funnelBreakdown: input.funnelBreakdown
        ? { breakdownDimension: { name: input.funnelBreakdown } }
        : undefined,
    }),
});
