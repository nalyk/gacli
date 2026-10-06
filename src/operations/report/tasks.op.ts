import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import {
  createReportTask,
  getReportTask,
  listReportTasks,
  queryReportTask,
} from '../../services/data-api.service.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { logger } from '../../utils/logger.js';
import { nameList, reportDataSchema, resourceName } from '../shared.js';

const dataApi = (rpc: string) => ({ service: 'data' as const, version: 'v1alpha' as const, rpc });

const timestamp = z.looseObject({
  seconds: z.union([z.string(), z.number()]).nullish(),
  nanos: z.number().nullish(),
});

const int64 = z.union([z.string(), z.number()]).nullish();

const reportTask = z.looseObject({
  name: z.string(),
  reportDefinition: z
    .looseObject({
      metrics: z.array(z.looseObject({ name: z.string().nullish() })).nullish(),
      dimensions: z.array(z.looseObject({ name: z.string().nullish() })).nullish(),
      dateRanges: z
        .array(z.looseObject({ startDate: z.string().nullish(), endDate: z.string().nullish() }))
        .nullish(),
      limit: int64,
      offset: int64,
    })
    .nullish(),
  reportMetadata: z
    .looseObject({
      state: z.union([z.string(), z.number()]).nullish(),
      beginCreatingTime: timestamp.nullish(),
      creationQuotaTokensCharged: z.number().nullish(),
      taskRowCount: z.number().nullish(),
      totalRowCount: z.number().nullish(),
      errorMessage: z.string().nullish(),
    })
    .nullish(),
});

type ReportTask = z.infer<typeof reportTask>;

function isoTime(value: unknown): string {
  const seconds = (value as { seconds?: unknown } | null | undefined)?.seconds;
  return seconds === undefined || seconds === null ? '' : new Date(Number(seconds) * 1000).toISOString();
}

const taskColumns = [
  { header: 'Name', path: 'name' },
  { header: 'State', path: 'reportMetadata.state' },
  { header: 'Task Row Count', path: 'reportMetadata.taskRowCount' },
  { header: 'Total Row Count', path: 'reportMetadata.totalRowCount' },
  { header: 'Creation Quota Tokens Charged', path: 'reportMetadata.creationQuotaTokensCharged' },
  { header: 'Begin Creating Time', path: 'reportMetadata.beginCreatingTime', format: isoTime },
];

const nameInput = z.object({
  name: resourceName('Report task').describe(
    'Report task resource name (properties/<id>/reportTasks/<task>)',
  ),
});

export const reportTasksCreate = defineOperation({
  id: 'report.tasks.create',
  summary: 'Create an asynchronous report task',
  description:
    'Starts a report task (kept for 72 hours) and returns at once. Check it with `report tasks get` and read ' +
    'rows with `report tasks query` once its state is ACTIVE, or pass --watch to wait for it.',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: dataApi('CreateReportTask'),
  input: z.object({
    metrics: nameList({ min: 1 }).describe('Metrics to include in the report'),
    dimensions: nameList().optional().describe('Dimensions to include in the report'),
    startDate: z
      .string()
      .default('7daysAgo')
      .describe('Start date: YYYY-MM-DD, today, yesterday or NdaysAgo'),
    endDate: z.string().default('today').describe('End date: YYYY-MM-DD, today, yesterday or NdaysAgo'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(250_000)
      .optional()
      .describe('Maximum number of rows the task produces (API default 10,000)'),
    dimensionFilter: z.array(z.string()).optional().describe('Dimension filters (e.g. "country==Romania")'),
    metricFilter: z.array(z.string()).optional().describe('Metric filters (e.g. "sessions>100")'),
    watch: z
      .boolean()
      .default(false)
      .describe('Wait for the task to finish (long-running operation) and return the finished task'),
  }),
  flags: {
    metrics: '-m, --metrics <metrics...>',
    dimensions: '-d, --dimensions <dimensions...>',
    startDate: '--start-date <date>',
    endDate: '--end-date <date>',
    limit: '--limit <number>',
    dimensionFilter: '--dimension-filter <filters...>',
    metricFilter: '--metric-filter <filters...>',
    watch: '--watch',
  },
  output: reportTask.extend({ done: z.boolean().nullish() }),
  columns: taskColumns,
  run: async (input, ctx) => {
    const operation = await createReportTask(ctx.property, {
      reportDefinition: {
        metrics: input.metrics.map((name) => ({ name })),
        dimensions: input.dimensions?.map((name) => ({ name })),
        dateRanges: [{ startDate: resolveDate(input.startDate), endDate: resolveDate(input.endDate) }],
        dimensionFilter: input.dimensionFilter ? buildFilterExpression(input.dimensionFilter) : undefined,
        metricFilter: input.metricFilter ? buildFilterExpression(input.metricFilter) : undefined,
        limit: input.limit,
      },
    });

    // Polling is the SDK's LRO promise (gax backoff), as in `audience export create --watch`.
    if (input.watch && typeof operation.promise === 'function') {
      const [task] = await operation.promise();
      return { ...(task as ReportTask), done: true };
    }

    const name = operation.name ?? '';
    if (!input.watch) {
      logger.info(
        name.includes('/reportTasks/')
          ? `Report task started. Check it with \`gacli report tasks get --name "${name}"\`, ` +
              'or re-run with --watch to block until done.'
          : 'Report task started. Find it with `gacli report tasks list`, or re-run with --watch to block until done.',
      );
    }
    return { name, done: !!operation.done };
  },
});

export const reportTasksGet = defineOperation({
  id: 'report.tasks.get',
  summary: 'Get a report task (definition and processing state)',
  category: 'read',
  kind: 'resource',
  api: dataApi('GetReportTask'),
  input: nameInput,
  flags: { name: '--name <resourceName>' },
  output: reportTask,
  columns: taskColumns,
  run: async ({ name }) => (await getReportTask(name)) as ReportTask,
});

export const reportTasksList = defineOperation({
  id: 'report.tasks.list',
  summary: 'List report tasks for a property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: dataApi('ListReportTasks'),
  input: z.object({}),
  output: z.array(reportTask),
  columns: taskColumns,
  run: async (_input, ctx) => (await listReportTasks(ctx.property)) as ReportTask[],
});

export const reportTasksQuery = defineOperation({
  id: 'report.tasks.query',
  summary: 'Read the rows of a finished (ACTIVE) report task',
  description: 'Fails with the API error while the task is still CREATING; check `report tasks get` first.',
  category: 'read',
  kind: 'report',
  api: dataApi('QueryReportTask'),
  input: nameInput.extend({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(250_000)
      .optional()
      .describe('Maximum number of rows to return'),
    offset: z.coerce.number().int().min(0).optional().describe('Row offset for pagination'),
  }),
  flags: { name: '--name <resourceName>', limit: '--limit <number>', offset: '--offset <number>' },
  output: reportDataSchema,
  run: async ({ name, limit, offset }) => queryReportTask(name, limit, offset),
});

export const reportTaskOps = [reportTasksCreate, reportTasksGet, reportTasksList, reportTasksQuery];
