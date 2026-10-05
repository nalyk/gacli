import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { adminApi, getOp, listOp, removeOp } from './_helpers.js';

type IAccessBinding = protos.google.analytics.admin.v1alpha.IAccessBinding;

const accessBinding = z.looseObject({
  name: z.string(),
  user: z.string().nullish(),
  roles: z.array(z.string()).nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'User', path: 'user' },
  {
    header: 'Roles',
    path: 'roles',
    format: (v: unknown) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v)),
  },
];

const parentInput = (description: string) => z.string().min(1).describe(description);

export const listAccessBindings = listOp({
  id: 'admin.access-bindings.list',
  summary: 'List access bindings for an account or property',
  rpc: 'ListAccessBindings',
  item: accessBinding,
  columns,
  needsProperty: false,
  input: z.object({
    parent: parentInput('Account or property resource name (e.g., accounts/123 or properties/456)'),
  }),
  flags: { parent: '--parent <parent>' },
  call: async (c, _ctx, { parent }) => (await c.listAccessBindings({ parent }))[0],
});

export const getAccessBinding = getOp({
  id: 'admin.access-bindings.get',
  summary: 'Get an access binding',
  rpc: 'GetAccessBinding',
  label: 'Access binding',
  item: accessBinding,
  columns,
  call: async (c, name) => (await c.getAccessBinding({ name }))[0],
});

export const createAccessBinding = defineOperation({
  id: 'admin.access-bindings.create',
  summary: 'Create an access binding',
  category: 'create',
  kind: 'resource',
  api: adminApi('CreateAccessBinding'),
  input: z.object({
    parent: parentInput('Account or property resource name'),
    user: z.string().min(1).describe('User email address'),
    roles: z.array(z.string().min(1)).min(1).describe('Roles to assign (variadic)'),
  }),
  flags: {
    parent: '--parent <parent>',
    user: '--user <email>',
    roles: '--roles <roles...>',
  },
  output: accessBinding,
  columns,
  run: async ({ parent, user, roles }) => {
    const client = await getAdminClient();
    const body: IAccessBinding = { user, roles };
    const [item] = await client.createAccessBinding({ parent, accessBinding: body });
    return item as z.infer<typeof accessBinding>;
  },
});

export const updateAccessBinding = defineOperation({
  id: 'admin.access-bindings.update',
  summary: 'Update an access binding',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateAccessBinding'),
  input: z.object({
    name: resourceName('Access binding'),
    roles: z.array(z.string().min(1)).min(1).describe('New roles to assign (variadic)'),
  }),
  flags: {
    name: '--name <resourceName>',
    roles: '--roles <roles...>',
  },
  output: accessBinding,
  columns,
  run: async ({ name, roles }) => {
    const client = await getAdminClient();
    // UpdateAccessBinding has no update mask; 1.x sent name + roles only
    const body: IAccessBinding = { name, roles };
    const [item] = await client.updateAccessBinding({ accessBinding: body });
    return item as z.infer<typeof accessBinding>;
  },
});

export const deleteAccessBinding = removeOp({
  id: 'admin.access-bindings.delete',
  summary: 'Delete an access binding',
  rpc: 'DeleteAccessBinding',
  label: 'Access Binding',
  verb: 'delete',
  call: (c, name) => c.deleteAccessBinding({ name }),
});

export const accessBindingOps = [
  listAccessBindings,
  getAccessBinding,
  createAccessBinding,
  updateAccessBinding,
  deleteAccessBinding,
];
