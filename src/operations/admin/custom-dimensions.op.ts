import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { adminApi, getOp, listOp, parentOf, removeOp, updateMask } from './_helpers.js';

type ICustomDimension = protos.google.analytics.admin.v1alpha.ICustomDimension;

const customDimension = z.looseObject({
  name: z.string(),
  parameterName: z.string().nullish(),
  displayName: z.string().nullish(),
  description: z.string().nullish(),
  scope: z.union([z.string(), z.number()]).nullish(),
  disallowAdsPersonalization: z.boolean().nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Parameter Name', path: 'parameterName' },
  { header: 'Display Name', path: 'displayName' },
  { header: 'Description', path: 'description' },
  { header: 'Scope', path: 'scope' },
];

export const listCustomDimensions = listOp({
  id: 'admin.custom-dimensions.list',
  summary: 'List custom dimensions for a property',
  rpc: 'ListCustomDimensions',
  item: customDimension,
  columns,
  call: async (c, ctx) => (await c.listCustomDimensions({ parent: parentOf('property', ctx.property) }))[0],
});

export const getCustomDimension = getOp({
  id: 'admin.custom-dimensions.get',
  summary: 'Get a custom dimension',
  rpc: 'GetCustomDimension',
  label: 'Custom dimension',
  item: customDimension,
  columns,
  call: async (c, name) => (await c.getCustomDimension({ name }))[0],
});

export const createCustomDimension = defineOperation({
  id: 'admin.custom-dimensions.create',
  summary: 'Create a custom dimension',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateCustomDimension'),
  input: z.object({
    parameterName: z.string().min(1).describe('Event parameter name'),
    displayName: z.string().min(1).describe('Display name'),
    description: z.string().optional().describe('Description of the custom dimension'),
    scope: z.enum(['EVENT', 'USER', 'ITEM']).describe('Dimension scope (EVENT, USER, ITEM)'),
  }),
  flags: {
    parameterName: '--parameter-name <parameterName>',
    displayName: '--display-name <displayName>',
    description: '--description <description>',
    scope: '--scope <scope>',
  },
  output: customDimension,
  columns,
  run: async (input, ctx) => {
    const client = await getAdminClient();
    const [item] = await client.createCustomDimension({
      parent: parentOf('property', ctx.property),
      customDimension: {
        parameterName: input.parameterName,
        displayName: input.displayName,
        description: input.description ?? '',
        scope: input.scope,
        disallowAdsPersonalization: false,
      },
    });
    return item as z.infer<typeof customDimension>;
  },
});

export const updateCustomDimension = defineOperation({
  id: 'admin.custom-dimensions.update',
  summary: 'Update a custom dimension',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateCustomDimension'),
  input: z.object({
    name: resourceName('Custom dimension'),
    displayName: z.string().optional().describe('New display name'),
    description: z.string().optional().describe('New description'),
  }),
  flags: {
    name: '--name <resourceName>',
    displayName: '--display-name <displayName>',
    description: '--description <description>',
  },
  output: customDimension,
  columns,
  run: async ({ name, ...changes }) => {
    const client = await getAdminClient();
    // 1.x parity: an empty display name is not sent
    const { body, paths } = updateMask(
      { ...changes, displayName: changes.displayName || undefined },
      { displayName: 'display_name', description: 'description' },
    );
    const customDimension: ICustomDimension = { name, ...body };
    const [item] = await client.updateCustomDimension({ customDimension, updateMask: { paths } });
    return item as z.infer<typeof customDimension>;
  },
});

export const archiveCustomDimension = removeOp({
  id: 'admin.custom-dimensions.archive',
  summary: 'Archive a custom dimension',
  rpc: 'ArchiveCustomDimension',
  label: 'Custom Dimension',
  verb: 'archive',
  call: (c, name) => c.archiveCustomDimension({ name }),
});

export const customDimensionOps = [
  listCustomDimensions,
  getCustomDimension,
  createCustomDimension,
  updateCustomDimension,
  archiveCustomDimension,
];
