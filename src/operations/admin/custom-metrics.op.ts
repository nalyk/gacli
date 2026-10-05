import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { adminApi, getOp, listOp, parentOf, removeOp, updateMask } from './_helpers.js';

type ICustomMetric = protos.google.analytics.admin.v1alpha.ICustomMetric;

const MEASUREMENT_UNITS = [
  'STANDARD',
  'CURRENCY',
  'FEET',
  'METERS',
  'KILOMETERS',
  'MILES',
  'MILLISECONDS',
  'SECONDS',
  'MINUTES',
  'HOURS',
] as const;

const customMetric = z.looseObject({
  name: z.string(),
  parameterName: z.string().nullish(),
  displayName: z.string().nullish(),
  description: z.string().nullish(),
  scope: z.union([z.string(), z.number()]).nullish(),
  measurementUnit: z.union([z.string(), z.number()]).nullish(),
  restrictedMetricType: z.array(z.union([z.string(), z.number()])).nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Parameter Name', path: 'parameterName' },
  { header: 'Display Name', path: 'displayName' },
  { header: 'Description', path: 'description' },
  { header: 'Scope', path: 'scope' },
  { header: 'Measurement Unit', path: 'measurementUnit' },
];

export const listCustomMetrics = listOp({
  id: 'admin.custom-metrics.list',
  summary: 'List custom metrics for a property',
  rpc: 'ListCustomMetrics',
  item: customMetric,
  columns,
  call: async (c, ctx) => (await c.listCustomMetrics({ parent: parentOf('property', ctx.property) }))[0],
});

export const getCustomMetric = getOp({
  id: 'admin.custom-metrics.get',
  summary: 'Get a custom metric',
  rpc: 'GetCustomMetric',
  label: 'Custom metric',
  item: customMetric,
  columns,
  call: async (c, name) => (await c.getCustomMetric({ name }))[0],
});

export const createCustomMetric = defineOperation({
  id: 'admin.custom-metrics.create',
  summary: 'Create a custom metric',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateCustomMetric'),
  input: z.object({
    parameterName: z.string().min(1).describe('Event parameter name'),
    displayName: z.string().min(1).describe('Display name'),
    description: z.string().optional().describe('Description of the custom metric'),
    scope: z.enum(['EVENT']).describe('Metric scope (EVENT)'),
    measurementUnit: z
      .enum(MEASUREMENT_UNITS)
      .describe(
        'Measurement unit (STANDARD, CURRENCY, FEET, METERS, KILOMETERS, MILES, MILLISECONDS, SECONDS, MINUTES, HOURS)',
      ),
  }),
  flags: {
    parameterName: '--parameter-name <parameterName>',
    displayName: '--display-name <displayName>',
    description: '--description <description>',
    scope: '--scope <scope>',
    measurementUnit: '--measurement-unit <unit>',
  },
  output: customMetric,
  columns,
  run: async (input, ctx) => {
    const client = await getAdminClient();
    const [item] = await client.createCustomMetric({
      parent: parentOf('property', ctx.property),
      customMetric: {
        parameterName: input.parameterName,
        displayName: input.displayName,
        description: input.description ?? '',
        scope: input.scope,
        measurementUnit: input.measurementUnit,
      },
    });
    return item as z.infer<typeof customMetric>;
  },
});

export const updateCustomMetric = defineOperation({
  id: 'admin.custom-metrics.update',
  summary: 'Update a custom metric',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateCustomMetric'),
  input: z.object({
    name: resourceName('Custom metric'),
    displayName: z.string().optional().describe('New display name'),
    description: z.string().optional().describe('New description'),
    measurementUnit: z.enum(MEASUREMENT_UNITS).optional().describe('New measurement unit'),
  }),
  flags: {
    name: '--name <resourceName>',
    displayName: '--display-name <displayName>',
    description: '--description <description>',
    measurementUnit: '--measurement-unit <unit>',
  },
  output: customMetric,
  columns,
  run: async ({ name, ...changes }) => {
    const client = await getAdminClient();
    // 1.x parity: an empty display name is not sent
    const { body, paths } = updateMask(
      { ...changes, displayName: changes.displayName || undefined },
      { displayName: 'display_name', description: 'description', measurementUnit: 'measurement_unit' },
    );
    const metric: ICustomMetric = { name, ...body };
    const [item] = await client.updateCustomMetric({ customMetric: metric, updateMask: { paths } });
    return item as z.infer<typeof customMetric>;
  },
});

export const archiveCustomMetric = removeOp({
  id: 'admin.custom-metrics.archive',
  summary: 'Archive a custom metric',
  rpc: 'ArchiveCustomMetric',
  label: 'Custom Metric',
  verb: 'archive',
  call: (c, name) => c.archiveCustomMetric({ name }),
});

export const customMetricOps = [
  listCustomMetrics,
  getCustomMetric,
  createCustomMetric,
  updateCustomMetric,
  archiveCustomMetric,
];
