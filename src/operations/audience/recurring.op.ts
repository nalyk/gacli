import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import {
  createRecurringAudienceList,
  getRecurringAudienceList,
  listRecurringAudienceLists,
} from '../../services/data-api.service.js';
import { withRetry } from '../../utils/retry.js';
import { nameList, resourceName } from '../shared.js';

const dataApi = (rpc: string) => ({ service: 'data' as const, version: 'v1alpha' as const, rpc });

const recurringList = z.looseObject({
  name: z.string(),
  audience: z.string().nullish(),
  audienceDisplayName: z.string().nullish(),
  activeDaysRemaining: z.number().nullish(),
  audienceLists: z.array(z.string()).nullish(),
  dimensions: z.array(z.looseObject({ dimensionName: z.string().nullish() })).nullish(),
});

type RecurringAudienceList = z.infer<typeof recurringList>;

export const recurringAudienceCreate = defineOperation({
  id: 'audience.recurring.create',
  summary: 'Create a recurring audience list',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: dataApi('CreateRecurringAudienceList'),
  input: z.object({
    audience: z.string().min(1).describe('Audience resource name'),
    dimensions: nameList().optional().describe('Dimensions to include'),
  }),
  flags: { audience: '--audience <audience>', dimensions: '--dimensions <dimensions...>' },
  output: recurringList,
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Audience', path: 'audience' },
    { header: 'Active Days Remaining', path: 'activeDaysRemaining' },
  ],
  run: async (input, ctx) =>
    (await createRecurringAudienceList(
      ctx.property,
      input.audience,
      input.dimensions,
    )) as RecurringAudienceList,
});

export const recurringAudienceGet = defineOperation({
  id: 'audience.recurring.get',
  summary: 'Get details of a recurring audience list',
  category: 'read',
  kind: 'resource',
  api: dataApi('GetRecurringAudienceList'),
  input: z.object({
    name: resourceName('Recurring audience list').describe('Recurring audience list resource name'),
  }),
  flags: { name: '--name <name>' },
  output: recurringList,
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Audience', path: 'audience' },
    { header: 'Audience Display Name', path: 'audienceDisplayName' },
    { header: 'Active Days Remaining', path: 'activeDaysRemaining' },
  ],
  run: async ({ name }) =>
    (await withRetry(() => getRecurringAudienceList(name), {
      label: 'GetRecurringAudienceList',
    })) as RecurringAudienceList,
});

export const recurringAudienceList = defineOperation({
  id: 'audience.recurring.list',
  summary: 'List recurring audience lists for a property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: dataApi('ListRecurringAudienceLists'),
  input: z.object({}),
  output: z.array(recurringList),
  // 1.x parity: RecurringAudienceList has no `state`; the column was always empty in 1.x too
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Audience', path: 'audience' },
    { header: 'State', path: 'state' },
  ],
  run: async (_input, ctx) =>
    (await withRetry(() => listRecurringAudienceLists(ctx.property), {
      label: 'ListRecurringAudienceLists',
    })) as RecurringAudienceList[],
});

export const recurringAudienceOps = [recurringAudienceCreate, recurringAudienceGet, recurringAudienceList];
