import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { batchRunReports } from '../../services/data-api.service.js';
import type { RunReportParams } from '../../types/data-api.js';
import { reportDataSchema } from '../shared.js';
import { requestsFile } from './_requests.js';

export const reportBatch = defineOperation({
  id: 'report.batch',
  summary: 'Run multiple GA4 reports in a single batch request',
  category: 'read',
  kind: 'reports',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'BatchRunReports' },
  input: z.object({
    requests: requestsFile('Path to JSON file containing an array of report request objects'),
  }),
  flags: { requests: '--requests <path>' },
  output: z.array(reportDataSchema),
  run: async (input, ctx) =>
    batchRunReports(ctx.property, { requests: input.requests as unknown as RunReportParams[] }),
});
