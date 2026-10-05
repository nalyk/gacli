import { z } from 'zod';
import { listOp } from './_helpers.js';

const account = z.looseObject({
  name: z.string(),
  displayName: z.string().nullish(),
  regionCode: z.string().nullish(),
});

export const listAccounts = listOp({
  id: 'admin.accounts.list',
  summary: 'List all GA4 accounts accessible by the caller',
  rpc: 'ListAccounts',
  needsProperty: false,
  item: account,
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Display Name', path: 'displayName' },
    { header: 'Create Time', path: 'createTime' },
    { header: 'Update Time', path: 'updateTime' },
    { header: 'Region Code', path: 'regionCode' },
  ],
  call: async (c) => (await c.listAccounts({}))[0],
});

export const accountOps = [listAccounts];
