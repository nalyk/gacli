import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { withRetry } from '../../utils/retry.js';
import { adminApi, listOp, parentOf, updateMask } from './_helpers.js';

type IProperty = protos.google.analytics.admin.v1alpha.IProperty;
type IndustryCategory = IProperty['industryCategory'];

const property = z.looseObject({
  name: z.string(),
  displayName: z.string().nullish(),
  timeZone: z.string().nullish(),
  currencyCode: z.string().nullish(),
  industryCategory: z.union([z.string(), z.number()]).nullish(),
});
type Property = z.infer<typeof property>;

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Display Name', path: 'displayName' },
  { header: 'Time Zone', path: 'timeZone' },
  { header: 'Currency Code', path: 'currencyCode' },
  { header: 'Industry Category', path: 'industryCategory' },
];
const readColumns = [...columns, { header: 'Create Time', path: 'createTime' }];

const accountId = z.string().min(1).describe('GA4 account ID');

export const listProperties = listOp({
  id: 'admin.properties.list',
  summary: 'List GA4 properties under an account',
  rpc: 'ListProperties',
  needsProperty: false,
  input: z.object({ account: accountId }),
  flags: { account: '--account <accountId>' },
  item: property,
  columns: readColumns,
  call: async (c, _ctx, { account }) =>
    (
      await c.listProperties({ filter: `parent:${parentOf('account', account.replace(/^accounts\//, ''))}` })
    )[0],
});

export const getProperty = defineOperation({
  id: 'admin.properties.get',
  summary: 'Get a GA4 property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('GetProperty'),
  input: z.object({}),
  output: property,
  columns: readColumns,
  run: async (_input, ctx) => {
    const client = await getAdminClient();
    const [item] = await withRetry(() => client.getProperty({ name: parentOf('property', ctx.property) }), {
      label: 'GetProperty',
    });
    return item as Property;
  },
});

export const createProperty = defineOperation({
  id: 'admin.properties.create',
  summary: 'Create a new GA4 property',
  category: 'create',
  kind: 'resource',
  api: adminApi('CreateProperty'),
  input: z.object({
    account: accountId,
    displayName: z.string().min(1).describe('Display name for the property'),
    timeZone: z.string().min(1).describe('Reporting time zone (e.g., America/New_York)'),
    currencyCode: z.string().optional().describe('Currency code (e.g., USD)'),
    industryCategory: z.string().optional().describe('Industry category'),
  }),
  flags: {
    account: '--account <accountId>',
    displayName: '--display-name <name>',
    timeZone: '--time-zone <timeZone>',
    currencyCode: '--currency-code <code>',
    industryCategory: '--industry-category <category>',
  },
  output: property,
  columns,
  run: async (input) => {
    const client = await getAdminClient();
    // currency falls back to USD like the 1.x service; parent must be accounts/<id> (1.x sent the bare id)
    const [item] = await client.createProperty({
      property: {
        displayName: input.displayName,
        parent: parentOf('account', input.account.replace(/^accounts\//, '')),
        timeZone: input.timeZone,
        currencyCode: input.currencyCode || 'USD',
        industryCategory: input.industryCategory as IndustryCategory,
      },
    });
    return item as Property;
  },
});

export const updateProperty = defineOperation({
  id: 'admin.properties.update',
  summary: 'Update a GA4 property',
  category: 'update',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('UpdateProperty'),
  input: z.object({
    displayName: z.string().optional().describe('New display name'),
    timeZone: z.string().optional().describe('New reporting time zone'),
    currencyCode: z.string().optional().describe('New currency code'),
    industryCategory: z.string().optional().describe('New industry category'),
  }),
  flags: {
    displayName: '--display-name <name>',
    timeZone: '--time-zone <timeZone>',
    currencyCode: '--currency-code <code>',
    industryCategory: '--industry-category <category>',
  },
  output: property,
  columns,
  run: async (input, ctx) => {
    const client = await getAdminClient();
    // 1.x parity: empty strings are not sent
    const { body, paths } = updateMask(
      {
        displayName: input.displayName || undefined,
        timeZone: input.timeZone || undefined,
        currencyCode: input.currencyCode || undefined,
        industryCategory: input.industryCategory || undefined,
      },
      {
        displayName: 'display_name',
        timeZone: 'time_zone',
        currencyCode: 'currency_code',
        industryCategory: 'industry_category',
      },
    );
    const property = { name: parentOf('property', ctx.property), ...body } as IProperty;
    const [item] = await client.updateProperty({ property, updateMask: { paths } });
    return item as Property;
  },
});

export const deleteProperty = defineOperation({
  id: 'admin.properties.delete',
  summary: 'Delete a GA4 property',
  category: 'delete',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('DeleteProperty'),
  input: z.object({}),
  output: z.object({ property: z.string(), deleted: z.literal(true) }),
  columns: [
    { header: 'Status', path: 'deleted', format: () => 'Deleted' },
    { header: 'Property', path: 'property' },
  ],
  run: async (_input, ctx) => {
    const client = await getAdminClient();
    await client.deleteProperty({ name: parentOf('property', ctx.property) });
    return { property: ctx.property, deleted: true as const };
  },
});

export const propertyOps = [listProperties, getProperty, createProperty, updateProperty, deleteProperty];
