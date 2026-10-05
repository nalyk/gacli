import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { getViaListOp } from './_get-via-list.js';
import { adminApi, listOp, parentOf, removeOp } from './_helpers.js';

type IGoogleAdsLink = protos.google.analytics.admin.v1alpha.IGoogleAdsLink;

const googleAdsLink = z.looseObject({
  name: z.string(),
  customerId: z.string().nullish(),
  canManageClients: z.boolean().nullish(),
  adsPersonalizationEnabled: z.unknown().nullish(),
  createTime: z.unknown().nullish(),
  updateTime: z.unknown().nullish(),
});

const name = { header: 'Name', path: 'name' };
const customerId = { header: 'Customer ID', path: 'customerId' };
const adsPersonalization = { header: 'Ads Personalization Enabled', path: 'adsPersonalizationEnabled' };
const createTime = { header: 'Create Time', path: 'createTime' };
const updateTime = { header: 'Update Time', path: 'updateTime' };

const columns = [
  name,
  customerId,
  { header: 'Can Manage Clients', path: 'canManageClients' },
  adsPersonalization,
  createTime,
  updateTime,
];

export const listGoogleAdsLinks = listOp({
  id: 'admin.google-ads-links.list',
  summary: 'List Google Ads links for a property',
  rpc: 'ListGoogleAdsLinks',
  item: googleAdsLink,
  columns,
  call: async (c, ctx) => (await c.listGoogleAdsLinks({ parent: parentOf('property', ctx.property) }))[0],
});

// v1alpha has no GetGoogleAdsLink RPC (1.x called a non-existent client method).
export const getGoogleAdsLink = getViaListOp({
  id: 'admin.google-ads-links.get',
  summary: 'Get a Google Ads link',
  rpc: 'ListGoogleAdsLinks',
  label: 'Google Ads link',
  collection: 'googleAdsLinks',
  item: googleAdsLink,
  columns,
  list: async (c, parent) => (await c.listGoogleAdsLinks({ parent }))[0],
});

export const createGoogleAdsLink = defineOperation({
  id: 'admin.google-ads-links.create',
  summary: 'Create a Google Ads link',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateGoogleAdsLink'),
  input: z.object({
    customerId: z.string().min(1).describe('Google Ads customer ID'),
  }),
  flags: { customerId: '--customer-id <customerId>' },
  output: googleAdsLink,
  columns: [name, customerId, adsPersonalization, createTime],
  run: async ({ customerId }, ctx) => {
    const client = await getAdminClient();
    // 1.x sent a plain boolean for this BoolValue field
    const body = { customerId, adsPersonalizationEnabled: true } as unknown as IGoogleAdsLink;
    const [item] = await client.createGoogleAdsLink({
      parent: parentOf('property', ctx.property),
      googleAdsLink: body,
    });
    return item as z.infer<typeof googleAdsLink>;
  },
});

export const updateGoogleAdsLink = defineOperation({
  id: 'admin.google-ads-links.update',
  summary: 'Update a Google Ads link',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateGoogleAdsLink'),
  input: z.object({
    name: resourceName('Google Ads link'),
    adsPersonalizationEnabled: z
      .string()
      .optional()
      .describe('Enable/disable ads personalization (true/false)'),
  }),
  flags: {
    name: '--name <resourceName>',
    adsPersonalizationEnabled: '--ads-personalization-enabled <enabled>',
  },
  output: googleAdsLink,
  columns: [name, customerId, adsPersonalization, updateTime],
  run: async ({ name, adsPersonalizationEnabled }) => {
    const client = await getAdminClient();
    // 1.x parity: any non-empty value other than 'true' is false; the mask is always sent
    const body = {
      name,
      adsPersonalizationEnabled: adsPersonalizationEnabled ? adsPersonalizationEnabled === 'true' : undefined,
    } as unknown as IGoogleAdsLink;
    const [item] = await client.updateGoogleAdsLink({
      googleAdsLink: body,
      updateMask: { paths: ['ads_personalization_enabled'] },
    });
    return item as z.infer<typeof googleAdsLink>;
  },
});

export const deleteGoogleAdsLink = removeOp({
  id: 'admin.google-ads-links.delete',
  summary: 'Delete a Google Ads link',
  rpc: 'DeleteGoogleAdsLink',
  label: 'Google Ads Link',
  verb: 'delete',
  call: (c, name) => c.deleteGoogleAdsLink({ name }),
});

export const googleAdsLinkOps = [
  listGoogleAdsLinks,
  getGoogleAdsLink,
  createGoogleAdsLink,
  updateGoogleAdsLink,
  deleteGoogleAdsLink,
];
