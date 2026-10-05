import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { adminApi, getOp, listOp, parentOf, removeOp } from './_helpers.js';

type IDataStream = protos.google.analytics.admin.v1alpha.IDataStream;

const dataStream = z.looseObject({
  name: z.string(),
  type: z.union([z.string(), z.number()]).nullish(),
  displayName: z.string().nullish(),
});
type DataStream = z.infer<typeof dataStream>;

const head = [
  { header: 'Name', path: 'name' },
  { header: 'Type', path: 'type' },
  { header: 'Display Name', path: 'displayName' },
];
const createTime = { header: 'Create Time', path: 'createTime' };
const updateTime = { header: 'Update Time', path: 'updateTime' };
const readColumns = [...head, createTime, updateTime];

const REQUIRED_BY_TYPE = {
  WEB_DATA_STREAM: ['uri', '--uri'],
  ANDROID_APP_DATA_STREAM: ['packageName', '--package-name'],
  IOS_APP_DATA_STREAM: ['bundleId', '--bundle-id'],
} as const;

export const listDataStreams = listOp({
  id: 'admin.datastreams.list',
  summary: 'List data streams for a property',
  rpc: 'ListDataStreams',
  item: dataStream,
  columns: readColumns,
  call: async (c, ctx) => (await c.listDataStreams({ parent: parentOf('property', ctx.property) }))[0],
});

export const getDataStream = getOp({
  id: 'admin.datastreams.get',
  summary: 'Get a data stream',
  rpc: 'GetDataStream',
  label: 'Data stream',
  item: dataStream,
  columns: readColumns,
  call: async (c, name) => (await c.getDataStream({ name }))[0],
});

export const createDataStream = defineOperation({
  id: 'admin.datastreams.create',
  summary: 'Create a data stream',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateDataStream'),
  input: z
    .object({
      type: z
        .enum(['WEB_DATA_STREAM', 'ANDROID_APP_DATA_STREAM', 'IOS_APP_DATA_STREAM'])
        .describe('Data stream type (WEB_DATA_STREAM, ANDROID_APP_DATA_STREAM, IOS_APP_DATA_STREAM)'),
      displayName: z.string().min(1).describe('Display name for the data stream'),
      uri: z.string().optional().describe('Web stream URI (for WEB_DATA_STREAM)'),
      packageName: z.string().optional().describe('Android package name (for ANDROID_APP_DATA_STREAM)'),
      bundleId: z.string().optional().describe('iOS bundle ID (for IOS_APP_DATA_STREAM)'),
    })
    .superRefine((input, ctx) => {
      const [key, flag] = REQUIRED_BY_TYPE[input.type];
      if (!input[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${flag} is required for ${input.type}` });
      }
    }),
  flags: {
    type: '--type <streamType>',
    displayName: '--display-name <name>',
    uri: '--uri <uri>',
    packageName: '--package-name <packageName>',
    bundleId: '--bundle-id <bundleId>',
  },
  output: dataStream,
  columns: [...head, createTime],
  run: async (input, ctx) => {
    const client = await getAdminClient();
    const body: IDataStream = {
      type: input.type,
      displayName: input.displayName,
      webStreamData: input.uri ? { defaultUri: input.uri } : undefined,
      androidAppStreamData: input.packageName ? { packageName: input.packageName } : undefined,
      iosAppStreamData: input.bundleId ? { bundleId: input.bundleId } : undefined,
    };
    const [item] = await client.createDataStream({
      parent: parentOf('property', ctx.property),
      dataStream: body,
    });
    return item as DataStream;
  },
});

export const updateDataStream = defineOperation({
  id: 'admin.datastreams.update',
  summary: 'Update a data stream',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateDataStream'),
  input: z.object({
    name: resourceName('Data stream'),
    displayName: z.string().min(1).describe('New display name'),
  }),
  flags: {
    name: '--name <resourceName>',
    displayName: '--display-name <name>',
  },
  output: dataStream,
  columns: [...head, updateTime],
  run: async ({ name, displayName }) => {
    const client = await getAdminClient();
    const [item] = await client.updateDataStream({
      dataStream: { name, displayName },
      updateMask: { paths: ['display_name'] },
    });
    return item as DataStream;
  },
});

export const deleteDataStream = removeOp({
  id: 'admin.datastreams.delete',
  summary: 'Delete a data stream',
  rpc: 'DeleteDataStream',
  label: 'Data Stream',
  verb: 'delete',
  call: (c, name) => c.deleteDataStream({ name }),
});

export const dataStreamOps = [
  listDataStreams,
  getDataStream,
  createDataStream,
  updateDataStream,
  deleteDataStream,
];
