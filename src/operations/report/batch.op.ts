import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { batchRunReports } from '../../services/data-api.service.js';
import type { RunReportParams } from '../../types/data-api.js';
import { reportDataSchema } from '../shared.js';
import { requestsFile } from './_requests.js';

export const reportBatch = defineOperation({
  id: 'report.batch',
  summary: 'Run multiple GA4 reports in a single batch request',
  description:
    '--requests is a JSON array of RunReport request objects (dateRanges, dimensions, metrics, …) given as a file path, @file, @- or inline JSON. With several requests, -f json prints an array of report envelopes, -f ndjson tags each row with "report": <n>, and table/csv/chart print "--- Report N ---" sections; -o writes all reports to one file.',
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
