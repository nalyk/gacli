import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { batchRunPivotReports } from '../../services/data-api.service.js';
import type { RunPivotReportParams } from '../../types/data-api.js';
import { reportDataSchema } from '../shared.js';
import { requestsFile } from './_requests.js';

export const reportBatchPivot = defineOperation({
  id: 'report.batch-pivot',
  reportLabel: 'Pivot Report',
  summary: 'Run multiple GA4 pivot reports in a single batch request',
  category: 'read',
  kind: 'reports',
  needsProperty: true,
  api: { service: 'data', version: 'v1beta', rpc: 'BatchRunPivotReports' },
  input: z.object({
    requests: requestsFile('Path to JSON file containing an array of pivot report request objects'),
  }),
  flags: { requests: '--requests <path>' },
  output: z.array(reportDataSchema),
  run: async (input, ctx) =>
    batchRunPivotReports(ctx.property, { requests: input.requests as unknown as RunPivotReportParams[] }),
});
