import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { jsonArg } from '../json-arg.js';
import { resourceName } from '../shared.js';
import { adminApi, getOp, listOp, parentOf, removeOp, updateMask } from './_helpers.js';

type IAudience = protos.google.analytics.admin.v1alpha.IAudience;
type IAudienceFilterClause = protos.google.analytics.admin.v1alpha.IAudienceFilterClause;

// AudienceFilterClause: a clause type plus exactly one of simpleFilter / sequenceFilter (shape checked by the API).
const filterClause = z
  .looseObject({
    clauseType: z.enum(['AUDIENCE_CLAUSE_TYPE_UNSPECIFIED', 'INCLUDE', 'EXCLUDE']).optional(),
    simpleFilter: z.looseObject({}).optional(),
    sequenceFilter: z.looseObject({}).optional(),
  })
  .refine(
    (c) => !(c.simpleFilter && c.sequenceFilter),
    'Use either simpleFilter or sequenceFilter, not both',
  );

const audience = z.looseObject({
  name: z.string(),
  displayName: z.string().nullish(),
  description: z.string().nullish(),
  membershipDurationDays: z.number().nullish(),
  adsPersonalizationEnabled: z.boolean().nullish(),
  filterClauses: z.array(z.looseObject({})).nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Display Name', path: 'displayName' },
  { header: 'Description', path: 'description' },
  { header: 'Membership Duration Days', path: 'membershipDurationDays' },
];

export const listAudiences = listOp({
  id: 'admin.audiences.list',
  summary: 'List audiences for a property',
  rpc: 'ListAudiences',
  item: audience,
  columns,
  call: async (c, ctx) => (await c.listAudiences({ parent: parentOf('property', ctx.property) }))[0],
});

export const getAudience = getOp({
  id: 'admin.audiences.get',
  summary: 'Get an audience',
  rpc: 'GetAudience',
  label: 'Audience',
  item: audience,
  columns,
  call: async (c, name) => (await c.getAudience({ name }))[0],
});

export const createAudience = defineOperation({
  id: 'admin.audiences.create',
  summary: 'Create an audience',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateAudience'),
  input: z.object({
    displayName: z.string().min(1).describe('Display name'),
    description: z.string().optional().describe('Description of the audience'),
    membershipDurationDays: z.coerce
      .number()
      .int()
      .positive()
      .default(30)
      .describe('Membership duration in days'),
    filterClauses: jsonArg(z.array(filterClause)).optional().describe('Filter clauses as JSON string'),
  }),
  flags: {
    displayName: '--display-name <displayName>',
    description: '--description <description>',
    membershipDurationDays: '--membership-duration-days <days>',
    filterClauses: '--filter-clauses <json>',
  },
  output: audience,
  columns,
  run: async (input, ctx) => {
    const client = await getAdminClient();
    const [item] = await client.createAudience({
      parent: parentOf('property', ctx.property),
      audience: {
        displayName: input.displayName,
        description: input.description || '',
        membershipDurationDays: input.membershipDurationDays,
        filterClauses: (input.filterClauses ?? []) as IAudienceFilterClause[],
        adsPersonalizationEnabled: true,
      },
    });
    return item as z.infer<typeof audience>;
  },
});

export const updateAudience = defineOperation({
  id: 'admin.audiences.update',
  summary: 'Update an audience',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateAudience'),
  input: z.object({
    name: resourceName('Audience'),
    displayName: z.string().optional().describe('New display name'),
    description: z.string().optional().describe('New description'),
  }),
  flags: {
    name: '--name <resourceName>',
    displayName: '--display-name <displayName>',
    description: '--description <description>',
  },
  output: audience,
  columns,
  run: async ({ name, ...changes }) => {
    const client = await getAdminClient();
    // 1.x parity: an empty display name is not sent
    const { body, paths } = updateMask(
      { ...changes, displayName: changes.displayName || undefined },
      { displayName: 'display_name', description: 'description' },
    );
    const aud: IAudience = { name, ...body };
    const [item] = await client.updateAudience({ audience: aud, updateMask: { paths } });
    return item as z.infer<typeof audience>;
  },
});

export const archiveAudience = removeOp({
  id: 'admin.audiences.archive',
  summary: 'Archive an audience',
  rpc: 'ArchiveAudience',
  label: 'Audience',
  verb: 'archive',
  call: (c, name) => c.archiveAudience({ name }),
});

export const audienceOps = [listAudiences, getAudience, createAudience, updateAudience, archiveAudience];
