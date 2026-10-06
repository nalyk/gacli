import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import {
  createAudienceExport,
  getAudienceExport,
  listAudienceExports,
  queryAudienceExport,
} from '../../services/data-api.service.js';
import type { ReportData } from '../../types/common.js';
import { logger } from '../../utils/logger.js';
import { withRetry } from '../../utils/retry.js';
import { nameList, reportDataSchema, resourceName } from '../shared.js';

const dataApi = (rpc: string) => ({ service: 'data' as const, version: 'v1beta' as const, rpc });

const timestamp = z.looseObject({
  seconds: z.union([z.string(), z.number()]).nullish(),
  nanos: z.number().nullish(),
});

const audienceExport = z.looseObject({
  name: z.string(),
  audience: z.string().nullish(),
  audienceDisplayName: z.string().nullish(),
  state: z.union([z.string(), z.number()]).nullish(),
  rowCount: z.number().nullish(),
  creationQuotaTokensCharged: z.number().nullish(),
  percentageCompleted: z.number().nullish(),
  errorMessage: z.string().nullish(),
  beginCreatingTime: timestamp.nullish(),
  dimensions: z.array(z.looseObject({ dimensionName: z.string().nullish() })).nullish(),
});

type AudienceExport = z.infer<typeof audienceExport>;

function isoTime(value: unknown): string {
  const seconds = (value as { seconds?: unknown } | null | undefined)?.seconds;
  return seconds === undefined || seconds === null ? '' : new Date(Number(seconds) * 1000).toISOString();
}

const cell = (v: unknown) => (v === null || v === undefined ? '' : String(v));

const nameInput = z.object({
  name: resourceName('Audience export').describe('Audience export resource name'),
});

export const audienceExportCreate = defineOperation({
  id: 'audience.export.create',
  summary: 'Create an audience export',
  category: 'create',
  kind: 'report',
  needsProperty: true,
  api: dataApi('CreateAudienceExport'),
  input: z.object({
    audience: z.string().min(1).describe('Audience resource name'),
    dimensions: nameList().optional().describe('Dimensions to include in the export'),
    watch: z.boolean().default(false).describe('Wait for the export to finish (long-running operation)'),
  }),
  flags: {
    audience: '--audience <audience>',
    dimensions: '--dimensions <dimensions...>',
    watch: '--watch',
  },
  output: reportDataSchema,
  run: async (input, ctx): Promise<ReportData> => {
    const operation = await createAudienceExport(ctx.property, input.audience, input.dimensions);

    // 1.x parity: --watch delegates polling to the SDK's LRO promise (gax backoff), no own interval.
    if (input.watch && typeof operation.promise === 'function') {
      const [resource] = await operation.promise();
      return {
        headers: ['Name', 'Audience', 'State', 'Row Count'],
        rows: [[cell(resource.name), cell(resource.audience), cell(resource.state), cell(resource.rowCount)]],
        rowCount: 1,
        metadata: { done: true },
      };
    }

    if (!input.watch) {
      logger.info(
        `Export started. Use \`gacli audience export get --name "${operation.name}"\` to check status, ` +
          'or re-run with --watch to block until done.',
      );
    }
    // 1.x read `state` off the LRO metadata even though the typed metadata does not declare it
    const opState = (operation.metadata as { state?: string } | null | undefined)?.state;
    return {
      headers: ['Operation Name', 'State'],
      rows: [[cell(operation.name), opState ?? 'CREATING']],
      rowCount: 1,
      metadata: { done: !!operation.done },
    };
  },
});

export const audienceExportGet = defineOperation({
  id: 'audience.export.get',
  summary: 'Get details of an audience export',
  category: 'read',
  kind: 'resource',
  api: dataApi('GetAudienceExport'),
  input: nameInput,
  flags: { name: '--name <name>' },
  output: audienceExport,
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Audience', path: 'audience' },
    { header: 'State', path: 'state' },
    { header: 'Creation Quota Tokens Charged', path: 'creationQuotaTokensCharged' },
    { header: 'Row Count', path: 'rowCount' },
    { header: 'Begin Creating Time', path: 'beginCreatingTime', format: isoTime },
  ],
  run: async ({ name }) =>
    (await withRetry(() => getAudienceExport(name), { label: 'GetAudienceExport' })) as AudienceExport,
});

export const audienceExportList = defineOperation({
  id: 'audience.export.list',
  summary: 'List audience exports for a property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: dataApi('ListAudienceExports'),
  input: z.object({}),
  output: z.array(audienceExport),
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Audience', path: 'audience' },
    { header: 'State', path: 'state' },
    { header: 'Row Count', path: 'rowCount' },
    { header: 'Begin Creating Time', path: 'beginCreatingTime', format: isoTime },
  ],
  run: async (_input, ctx) =>
    (await withRetry(() => listAudienceExports(ctx.property), {
      label: 'ListAudienceExports',
    })) as AudienceExport[],
});

export const audienceExportQuery = defineOperation({
  id: 'audience.export.query',
  summary: 'Query an audience export to retrieve audience members',
  category: 'read',
  kind: 'report',
  api: dataApi('QueryAudienceExport'),
  input: nameInput.extend({
    limit: z.coerce.number().int().min(1).optional().describe('Maximum number of rows to return'),
    offset: z.coerce.number().int().min(0).optional().describe('Row offset for pagination'),
  }),
  flags: { name: '--name <name>', limit: '--limit <number>', offset: '--offset <number>' },
  output: reportDataSchema,
  run: async ({ name, limit, offset }) =>
    withRetry(() => queryAudienceExport(name, limit, offset), { label: 'QueryAudienceExport' }),
});

export const audienceExportOps = [
  audienceExportCreate,
  audienceExportGet,
  audienceExportList,
  audienceExportQuery,
];
