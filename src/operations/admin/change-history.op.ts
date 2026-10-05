import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { validatePropertyId } from '../../validation/validators.js';
import { listOp } from './_helpers.js';

type ISearchRequest = protos.google.analytics.admin.v1alpha.ISearchChangeHistoryEventsRequest;

const RESOURCE_TYPES = [
  'ACCOUNT',
  'PROPERTY',
  'FIREBASE_LINK',
  'GOOGLE_ADS_LINK',
  'GOOGLE_SIGNALS_SETTINGS',
  'CONVERSION_EVENT',
  'MEASUREMENT_PROTOCOL_SECRET',
  'CUSTOM_DIMENSION',
  'CUSTOM_METRIC',
  'DATA_RETENTION_SETTINGS',
  'DISPLAY_VIDEO_360_ADVERTISER_LINK',
  'DISPLAY_VIDEO_360_ADVERTISER_LINK_PROPOSAL',
  'SEARCH_ADS_360_LINK',
  'DATA_STREAM',
  'ATTRIBUTION_SETTINGS',
  'EXPANDED_DATA_SET',
  'CHANNEL_GROUP',
  'BIGQUERY_LINK',
  'ENHANCED_MEASUREMENT_SETTINGS',
  'DATA_REDACTION_SETTINGS',
  'SKADNETWORK_CONVERSION_VALUE_SCHEMA',
  'ADSENSE_LINK',
  'AUDIENCE',
  'EVENT_CREATE_RULE',
  'KEY_EVENT',
  'CALCULATED_METRIC',
  'REPORTING_DATA_ANNOTATION',
  'SUBPROPERTY_SYNC_CONFIG',
  'REPORTING_IDENTITY_SETTINGS',
  'USER_PROVIDED_DATA_SETTINGS',
] as const;
const ACTIONS = ['CREATED', 'UPDATED', 'DELETED'] as const;

const timestamp = z.looseObject({
  seconds: z.union([z.string(), z.number()]).nullish(),
  nanos: z.number().nullish(),
});

const change = z.looseObject({
  resource: z.string().nullish(),
  action: z.union([z.string(), z.number()]).nullish(),
});

const changeHistoryEvent = z.looseObject({
  id: z.string().nullish(),
  changeTime: timestamp.nullish(),
  actorType: z.union([z.string(), z.number()]).nullish(),
  userActorEmail: z.string().nullish(),
  changesFiltered: z.boolean().nullish(),
  changes: z.array(change).nullish(),
});

const changesOf = (v: unknown) => (Array.isArray(v) ? (v as z.infer<typeof change>[]) : []);
const unique = (values: unknown[]) =>
  [...new Set(values.filter((x) => x !== null && x !== undefined && x !== '').map(String))].join(', ');

// ISO 8601 datetime → google.protobuf.Timestamp
const datetimeArg = (what: string) =>
  z
    .string()
    .refine((s) => /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s)), {
      message: 'expected an ISO 8601 datetime, e.g. 2026-01-31T00:00:00Z',
    })
    .transform((s) => {
      const ms = Date.parse(s);
      return { seconds: Math.floor(ms / 1000), nanos: (((ms % 1000) + 1000) % 1000) * 1_000_000 };
    })
    .optional()
    .describe(what);

export const searchChangeHistory = listOp({
  id: 'admin.change-history.search',
  summary: 'Search change history events for an account',
  rpc: 'SearchChangeHistoryEvents',
  item: changeHistoryEvent,
  needsProperty: false,
  input: z.object({
    account: z
      .string()
      .regex(/^(accounts\/)?\d+$/, 'expected an account ID (123) or resource name (accounts/123)')
      .transform((s) => (s.startsWith('accounts/') ? s : `accounts/${s}`))
      .describe('Account to search (accounts/<id> or bare numeric ID)'),
    property: z
      .string()
      .optional()
      .describe(
        'Only changes to this property (properties/<id> or numeric ID). On the CLI this is the global -p/--property, so a configured default property applies',
      ),
    resourceType: z
      .array(z.enum(RESOURCE_TYPES))
      .optional()
      .describe(`Only changes to these resource types (${RESOURCE_TYPES.join(', ')})`),
    action: z
      .array(z.enum(ACTIONS))
      .optional()
      .describe(`Only these actions (${ACTIONS.join(', ')})`),
    earliest: datetimeArg('Only changes at or after this ISO 8601 datetime'),
    latest: datetimeArg('Only changes at or before this ISO 8601 datetime'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe('Maximum number of events (one page, max 200); omit to fetch all pages'),
  }),
  flags: {
    account: '--account <id>',
    property: '--property <id>',
    resourceType: '--resource-type <types...>',
    action: '--action <actions...>',
    earliest: '--earliest <datetime>',
    latest: '--latest <datetime>',
    limit: '--limit <number>',
  },
  columns: [
    {
      header: 'Change Time',
      path: 'changeTime',
      format: (v) => {
        const t = v as z.infer<typeof timestamp> | null | undefined;
        return t?.seconds == null
          ? ''
          : new Date(Number(t.seconds) * 1000 + (t.nanos ?? 0) / 1e6).toISOString();
      },
    },
    { header: 'Actor', path: 'userActorEmail' },
    { header: 'Actor Type', path: 'actorType' },
    { header: 'Action(s)', path: 'changes', format: (v) => unique(changesOf(v).map((c) => c.action)) },
    { header: 'Resource(s)', path: 'changes', format: (v) => unique(changesOf(v).map((c) => c.resource)) },
    { header: 'Changes', path: 'changes', format: (v) => String(changesOf(v).length) },
  ],
  call: async (c, ctx, input) => {
    // commander hands --property to the global -p, so the CLI value arrives via ctx.globals
    const property = input.property || ctx.globals.property || undefined;
    const request: ISearchRequest = {
      account: input.account,
      ...(property && { property: `properties/${validatePropertyId(property)}` }),
      // Repeated-enum typings omit enum names, but protobufjs converts them like singular enums.
      ...(input.resourceType && {
        resourceType: input.resourceType as unknown as ISearchRequest['resourceType'],
      }),
      ...(input.action && { action: input.action as unknown as ISearchRequest['action'] }),
      ...(input.earliest && { earliestChangeTime: input.earliest }),
      ...(input.latest && { latestChangeTime: input.latest }),
      ...(input.limit && { pageSize: input.limit }),
    };
    return (await c.searchChangeHistoryEvents(request, input.limit ? { autoPaginate: false } : undefined))[0];
  },
});

export const changeHistoryOps = [searchChangeHistory];
