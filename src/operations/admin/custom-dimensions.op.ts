import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { withRetry } from '../../utils/retry.js';
import { resourceName } from '../shared.js';

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

const api = (rpc: string) => ({ service: 'admin' as const, version: 'v1alpha' as const, rpc });

export const listCustomDimensions = defineOperation({
  id: 'admin.custom-dimensions.list',
  summary: 'List custom dimensions for a property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: api('ListCustomDimensions'),
  input: z.object({}),
  output: z.array(customDimension),
  columns,
  run: async (_input, ctx) => {
    const client = await getAdminClient();
    const [items] = await withRetry(() =>
      client.listCustomDimensions({ parent: `properties/${ctx.property}` }),
    );
    return (items ?? []) as z.infer<typeof customDimension>[];
  },
});

export const getCustomDimension = defineOperation({
  id: 'admin.custom-dimensions.get',
  summary: 'Get a custom dimension',
  category: 'read',
  kind: 'resource',
  api: api('GetCustomDimension'),
  input: z.object({ name: resourceName('Custom dimension') }),
  flags: { name: '--name <resourceName>' },
  output: customDimension,
  columns,
  run: async ({ name }) => {
    const client = await getAdminClient();
    const [item] = await withRetry(() => client.getCustomDimension({ name }));
    return item as z.infer<typeof customDimension>;
  },
});

export const createCustomDimension = defineOperation({
  id: 'admin.custom-dimensions.create',
  summary: 'Create a custom dimension',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: api('CreateCustomDimension'),
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
      parent: `properties/${ctx.property}`,
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
  api: api('UpdateCustomDimension'),
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
  run: async (input) => {
    const client = await getAdminClient();
    const customDimension: ICustomDimension = { name: input.name };
    const paths: string[] = [];
    if (input.displayName) {
      customDimension.displayName = input.displayName;
      paths.push('display_name');
    }
    if (input.description !== undefined) {
      customDimension.description = input.description;
      paths.push('description');
    }
    const [item] = await client.updateCustomDimension({ customDimension, updateMask: { paths } });
    return item as z.infer<typeof customDimension>;
  },
});

export const archiveCustomDimension = defineOperation({
  id: 'admin.custom-dimensions.archive',
  summary: 'Archive a custom dimension',
  category: 'delete',
  kind: 'resource',
  api: api('ArchiveCustomDimension'),
  input: z.object({ name: resourceName('Custom dimension') }),
  flags: { name: '--name <resourceName>' },
  output: z.object({ name: z.string(), archived: z.literal(true) }),
  columns: [
    { header: 'Status', path: 'archived', format: () => 'Archived' },
    { header: 'Custom Dimension', path: 'name' },
  ],
  run: async ({ name }) => {
    const client = await getAdminClient();
    await client.archiveCustomDimension({ name });
    return { name, archived: true as const };
  },
});

export const customDimensionOps = [
  listCustomDimensions,
  getCustomDimension,
  createCustomDimension,
  updateCustomDimension,
  archiveCustomDimension,
];
