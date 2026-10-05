import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { runFunnelReport } from '../../services/data-api.service.js';
import type { FunnelStep } from '../../types/data-api.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { jsonArg } from '../json-arg.js';
import { reportDataSchema } from '../shared.js';

const steps = z
  .array(
    z.looseObject({
      name: z.string().min(1),
      isDirectlyFollowedBy: z.boolean().optional(),
      filterExpression: z.looseObject({}).optional(),
      withinDurationFromPriorStep: z.string().optional(),
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
    steps: jsonArg(steps, '--steps').describe('Funnel steps as a JSON string of FunnelStep[]'),
    openFunnel: z.boolean().optional().describe('Use an open funnel (users can enter at any step)'),
    funnelBreakdown: z.string().min(1).optional().describe('Dimension name to break down the funnel by'),
    startDate: z.string().default('7daysAgo').describe('Start date for the report'),
    endDate: z.string().default('today').describe('End date for the report'),
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
