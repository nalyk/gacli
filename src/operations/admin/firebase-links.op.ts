import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { getViaListOp } from './_get-via-list.js';
import { adminApi, listOp, parentOf, removeOp } from './_helpers.js';

type IFirebaseLink = protos.google.analytics.admin.v1alpha.IFirebaseLink;

const firebaseLink = z.looseObject({
  name: z.string(),
  project: z.string().nullish(),
  createTime: z.unknown().nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Project', path: 'project' },
  { header: 'Create Time', path: 'createTime' },
];

export const listFirebaseLinks = listOp({
  id: 'admin.firebase-links.list',
  summary: 'List Firebase links for a property',
  rpc: 'ListFirebaseLinks',
  item: firebaseLink,
  columns,
  call: async (c, ctx) => (await c.listFirebaseLinks({ parent: parentOf('property', ctx.property) }))[0],
});

// v1alpha has no GetFirebaseLink RPC (1.x called a non-existent client method).
export const getFirebaseLink = getViaListOp({
  id: 'admin.firebase-links.get',
  summary: 'Get a Firebase link',
  rpc: 'ListFirebaseLinks',
  label: 'Firebase link',
  collection: 'firebaseLinks',
  item: firebaseLink,
  columns,
  list: async (c, parent) => (await c.listFirebaseLinks({ parent }))[0],
});

export const createFirebaseLink = defineOperation({
  id: 'admin.firebase-links.create',
  summary: 'Create a Firebase link',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateFirebaseLink'),
  input: z.object({
    project: z.string().min(1).describe('Firebase project ID or resource name'),
  }),
  flags: { project: '--project <projectId>' },
  output: firebaseLink,
  columns,
  run: async ({ project }, ctx) => {
    const client = await getAdminClient();
    const body: IFirebaseLink = { project };
    const [item] = await client.createFirebaseLink({
      parent: parentOf('property', ctx.property),
      firebaseLink: body,
    });
    return item as z.infer<typeof firebaseLink>;
  },
});

export const deleteFirebaseLink = removeOp({
  id: 'admin.firebase-links.delete',
  summary: 'Delete a Firebase link',
  rpc: 'DeleteFirebaseLink',
  label: 'Firebase Link',
  verb: 'delete',
  call: (c, name) => c.deleteFirebaseLink({ name }),
});

export const firebaseLinkOps = [listFirebaseLinks, getFirebaseLink, createFirebaseLink, deleteFirebaseLink];
