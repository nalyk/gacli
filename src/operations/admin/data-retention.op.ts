import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { withRetry } from '../../utils/retry.js';
import { adminApi, updateMask } from './_helpers.js';

type IDataRetentionSettings = protos.google.analytics.admin.v1alpha.IDataRetentionSettings;

const DURATIONS = [
  'TWO_MONTHS',
  'FOURTEEN_MONTHS',
  'TWENTY_SIX_MONTHS',
  'THIRTY_EIGHT_MONTHS',
  'FIFTY_MONTHS',
] as const;

const settings = z.looseObject({
  name: z.string(),
  eventDataRetention: z.union([z.string(), z.number()]).nullish(),
  userDataRetention: z.union([z.string(), z.number()]).nullish(),
  resetUserDataOnNewActivity: z.boolean().nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Event Data Retention', path: 'eventDataRetention' },
  { header: 'User Data Retention', path: 'userDataRetention' },
  { header: 'Reset On New Activity', path: 'resetUserDataOnNewActivity' },
];

const settingsName = (property: string) => `properties/${property}/dataRetentionSettings`;

export const getDataRetention = defineOperation({
  id: 'admin.data-retention.get',
  summary: 'Get the data retention settings of a property',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('GetDataRetentionSettings'),
  input: z.object({}),
  output: settings,
  columns,
  run: async (_input, ctx) => {
    const client = await getAdminClient();
    const [item] = await withRetry(
      () => client.getDataRetentionSettings({ name: settingsName(ctx.property) }),
      {
        label: 'GetDataRetentionSettings',
      },
    );
    return item as z.infer<typeof settings>;
  },
});

const durationArg = (what: string) =>
  z
    .enum(DURATIONS)
    .optional()
    .describe(`${what} (${DURATIONS.join(', ')}; over 14 months needs GA4 360)`);

export const updateDataRetention = defineOperation({
  id: 'admin.data-retention.update',
  summary: 'Update the data retention settings of a property',
  category: 'update',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('UpdateDataRetentionSettings'),
  input: z
    .object({
      eventDataRetention: durationArg('How long event-level data is retained'),
      userDataRetention: durationArg('How long user-level data is retained'),
      resetUserDataOnNewActivity: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional()
        .describe('Reset the user identifier retention period on new activity from that user (true|false)'),
    })
    .superRefine((v, ctx) => {
      if (Object.values(v).every((x) => x === undefined)) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Nothing to update: pass --event-data-retention, --user-data-retention or --reset-user-data-on-new-activity',
        });
      }
    }),
  flags: {
    eventDataRetention: '--event-data-retention <duration>',
    userDataRetention: '--user-data-retention <duration>',
    resetUserDataOnNewActivity: '--reset-user-data-on-new-activity <boolean>',
  },
  output: settings,
  columns,
  run: async (input, ctx) => {
    const client = await getAdminClient();
    const { body, paths } = updateMask(input, {
      eventDataRetention: 'event_data_retention',
      userDataRetention: 'user_data_retention',
      resetUserDataOnNewActivity: 'reset_user_data_on_new_activity',
    });
    const dataRetentionSettings: IDataRetentionSettings = { name: settingsName(ctx.property), ...body };
    const [item] = await client.updateDataRetentionSettings({ dataRetentionSettings, updateMask: { paths } });
    return item as z.infer<typeof settings>;
  },
});

export const dataRetentionOps = [getDataRetention, updateDataRetention];
