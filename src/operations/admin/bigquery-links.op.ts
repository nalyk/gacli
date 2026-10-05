import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { adminApi, getOp, listOp, parentOf, removeOp } from './_helpers.js';

type IBigQueryLink = protos.google.analytics.admin.v1alpha.IBigQueryLink;

const bigQueryLink = z.looseObject({
  name: z.string(),
  project: z.string().nullish(),
  dailyExportEnabled: z.boolean().nullish(),
  streamingExportEnabled: z.boolean().nullish(),
  createTime: z.unknown().nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Project', path: 'project' },
  { header: 'Daily Export Enabled', path: 'dailyExportEnabled' },
  { header: 'Streaming Export Enabled', path: 'streamingExportEnabled' },
  { header: 'Create Time', path: 'createTime' },
];

export const listBigQueryLinks = listOp({
  id: 'admin.bigquery-links.list',
  summary: 'List BigQuery links for a property',
  rpc: 'ListBigQueryLinks',
  item: bigQueryLink,
  columns,
  call: async (c, ctx) => (await c.listBigQueryLinks({ parent: parentOf('property', ctx.property) }))[0],
});

export const getBigQueryLink = getOp({
  id: 'admin.bigquery-links.get',
  summary: 'Get a BigQuery link',
  rpc: 'GetBigQueryLink',
  label: 'BigQuery link',
  item: bigQueryLink,
  columns,
  call: async (c, name) => (await c.getBigQueryLink({ name }))[0],
});

export const createBigQueryLink = defineOperation({
  id: 'admin.bigquery-links.create',
  summary: 'Create a BigQuery link',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateBigQueryLink'),
  input: z.object({
    project: z.string().min(1).describe('Google Cloud project ID'),
    // 1.x parity: string flags, anything but 'true' means false
    dailyExportEnabled: z.string().default('true').describe('Enable daily export (true/false)'),
    streamingExportEnabled: z.string().default('false').describe('Enable streaming export (true/false)'),
  }),
  flags: {
    project: '--project <projectId>',
    dailyExportEnabled: '--daily-export-enabled <enabled>',
    streamingExportEnabled: '--streaming-export-enabled <enabled>',
  },
  output: bigQueryLink,
  columns,
  run: async ({ project, dailyExportEnabled, streamingExportEnabled }, ctx) => {
    const client = await getAdminClient();
    const body: IBigQueryLink = {
      project,
      dailyExportEnabled: dailyExportEnabled === 'true',
      streamingExportEnabled: streamingExportEnabled === 'true',
    };
    const [item] = await client.createBigQueryLink({
      parent: parentOf('property', ctx.property),
      bigqueryLink: body,
    });
    return item as z.infer<typeof bigQueryLink>;
  },
});

export const deleteBigQueryLink = removeOp({
  id: 'admin.bigquery-links.delete',
  summary: 'Delete a BigQuery link',
  rpc: 'DeleteBigQueryLink',
  label: 'BigQuery Link',
  verb: 'delete',
  call: (c, name) => c.deleteBigQueryLink({ name }),
});

export const bigQueryLinkOps = [listBigQueryLinks, getBigQueryLink, createBigQueryLink, deleteBigQueryLink];
