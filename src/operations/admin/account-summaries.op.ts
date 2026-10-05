import { z } from 'zod';
import { listOp } from './_helpers.js';

const propertySummary = z.looseObject({
  property: z.string().nullish(),
  displayName: z.string().nullish(),
  propertyType: z.union([z.string(), z.number()]).nullish(),
  parent: z.string().nullish(),
});

const accountSummary = z.looseObject({
  name: z.string(),
  account: z.string().nullish(),
  displayName: z.string().nullish(),
  propertySummaries: z.array(propertySummary).nullish(),
});

export const listAccountSummaries = listOp({
  id: 'admin.accounts.summaries',
  summary: 'List summaries of all accessible accounts and their properties',
  rpc: 'ListAccountSummaries',
  item: accountSummary,
  needsProperty: false,
  columns: [
    { header: 'Account', path: 'account' },
    { header: 'Display Name', path: 'displayName' },
    {
      header: 'Properties',
      path: 'propertySummaries',
      format: (v) =>
        Array.isArray(v)
          ? v.map((p: z.infer<typeof propertySummary>) => p.displayName || p.property || '').join(', ')
          : '',
    },
  ],
  call: async (c) => (await c.listAccountSummaries({}))[0],
});

export const accountSummaryOps = [listAccountSummaries];
