import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { runCohortReport } from '../../services/data-api.service.js';
import type { CohortSpec } from '../../types/data-api.js';
import { jsonArg } from '../json-arg.js';
import { reportDataSchema } from '../shared.js';

const cohorts = z.array(
  z.looseObject({
    name: z.string().optional(),
    dimension: z.string().min(1),
    dateRange: z.looseObject({ startDate: z.string(), endDate: z.string() }),
  }),
);

export const reportCohort = defineOperation({
  id: 'report.cohort',
  summary: 'Run a GA4 cohort report',
  category: 'read',
  kind: 'report',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'RunReport' },
  // 1.x applied DAILY / endOffset 5 in code rather than as commander defaults; kept so help is unchanged.
  input: z.object({
    metrics: z.array(z.string().min(1)).min(1).describe('Metrics to include in the report'),
    cohorts: jsonArg(cohorts, '--cohorts').describe('Cohort definitions as a JSON string'),
    cohortGranularity: z
      .enum(['DAILY', 'WEEKLY', 'MONTHLY'])
      .optional()
      .describe('Cohort granularity: DAILY, WEEKLY, or MONTHLY'),
    endOffset: z.coerce.number().int().min(0).optional().describe('End offset for the cohort report'),
    startOffset: z.coerce.number().int().min(0).optional().describe('Start offset for the cohort report'),
    dimensions: z.array(z.string().min(1)).optional().describe('Dimensions to include in the report'),
    accumulate: z
      .boolean()
      .optional()
      .describe('Accumulate cohort data over time (accepted for 1.x compatibility; RunReport ignores it)'),
  }),
  flags: {
    metrics: '-m, --metrics <metrics...>',
    cohorts: '--cohorts <json>',
    cohortGranularity: '--cohort-granularity <granularity>',
    endOffset: '--end-offset <number>',
    startOffset: '--start-offset <number>',
    dimensions: '-d, --dimensions <dimensions...>',
    accumulate: '--accumulate',
  },
  output: reportDataSchema,
  run: async (input, ctx) =>
    runCohortReport({
      property: `properties/${ctx.property}`,
      metrics: input.metrics.map((name) => ({ name })),
      dimensions: input.dimensions?.map((name) => ({ name })),
      cohortSpec: {
        cohorts: input.cohorts as CohortSpec[],
        cohortsRange: {
          granularity: input.cohortGranularity ?? 'DAILY',
          startOffset: input.startOffset,
          endOffset: input.endOffset ?? 5,
        },
      },
      accumulate: input.accumulate ?? false,
    }),
});
