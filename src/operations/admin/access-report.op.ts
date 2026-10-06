import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { GacliError } from '../../core/errors.js';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import type { ReportData } from '../../types/common.js';
import { withRetry } from '../../utils/retry.js';
import { validatePropertyId } from '../../validation/validators.js';
import { nameList, reportDataSchema } from '../shared.js';
import { adminApi } from './_helpers.js';

type IRunAccessReportRequest = protos.google.analytics.admin.v1alpha.IRunAccessReportRequest;
type IRunAccessReportResponse = protos.google.analytics.admin.v1alpha.IRunAccessReportResponse;

function toReportData(response: IRunAccessReportResponse): ReportData {
  const headers = [
    ...(response.dimensionHeaders ?? []).map((h) => h.dimensionName ?? ''),
    ...(response.metricHeaders ?? []).map((h) => h.metricName ?? ''),
  ];
  const rows = (response.rows ?? []).map((row) => [
    ...(row.dimensionValues ?? []).map((v) => v.value ?? ''),
    ...(row.metricValues ?? []).map((v) => v.value ?? ''),
  ]);
  return { headers, rows, rowCount: Number(response.rowCount ?? rows.length) };
}

export const runAccessReport = defineOperation({
  id: 'admin.access-report.run',
  summary: 'Run a data access report (who read which data, when)',
  category: 'read',
  kind: 'report',
  needsProperty: false,
  api: adminApi('RunAccessReport'),
  input: z.object({
    entity: z
      .string()
      .regex(/^(properties|accounts)\/\d+$/, 'expected properties/<id> or accounts/<id>')
      .optional()
      .describe('Report scope: properties/<id> or accounts/<id> (default: the global -p property)'),
    dimensions: z
      .array(z.string().min(1))
      .min(1)
      .describe('Access dimensions (e.g. userEmail, epochTimeMicros, reportType, dataApiQuotaCategory)'),
    metrics: nameList({ min: 1 }).describe('Access metrics (e.g. accessCount)'),
    startDate: z
      .string()
      .default('30daysAgo')
      .describe('Start date (YYYY-MM-DD, NdaysAgo, yesterday, today)'),
    endDate: z.string().default('today').describe('End date (YYYY-MM-DD, NdaysAgo, yesterday, today)'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100_000)
      .optional()
      .describe('Maximum number of rows to return'),
  }),
  flags: {
    entity: '--entity <entity>',
    dimensions: '-d, --dimensions <dimensions...>',
    metrics: '-m, --metrics <metrics...>',
    startDate: '--start-date <date>',
    endDate: '--end-date <date>',
    limit: '--limit <number>',
  },
  output: reportDataSchema,
  run: async (input, ctx) => {
    const property = ctx.property || ctx.globals.property;
    if (!input.entity && !property) {
      throw new GacliError('usage', 'An entity is required for the access report.', {
        hint: 'Use --entity properties/<id> | accounts/<id>, or pass -p <property id>',
      });
    }
    const request: IRunAccessReportRequest = {
      entity: input.entity ?? `properties/${validatePropertyId(property)}`,
      dimensions: input.dimensions.map((dimensionName) => ({ dimensionName })),
      metrics: input.metrics.map((metricName) => ({ metricName })),
      dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
      ...(input.limit && { limit: input.limit }),
    };
    const client = await getAdminClient();
    const [response] = await withRetry(() => client.runAccessReport(request), { label: 'RunAccessReport' });
    return toReportData(response);
  },
});

export const accessReportOps = [runAccessReport];
