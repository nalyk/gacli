import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { adminApi, getOp, listOp, parentOf, removeOp } from './_helpers.js';

type IKeyEvent = protos.google.analytics.admin.v1alpha.IKeyEvent;

const COUNTING_METHODS = ['ONCE_PER_EVENT', 'ONCE_PER_SESSION'] as const;
const COUNTING_METHOD_HELP = 'Counting method (ONCE_PER_EVENT, ONCE_PER_SESSION)';

const keyEvent = z.looseObject({
  name: z.string(),
  eventName: z.string().nullish(),
  countingMethod: z.union([z.string(), z.number()]).nullish(),
  createTime: z.unknown().nullish(),
  custom: z.boolean().nullish(),
  deletable: z.boolean().nullish(),
  defaultValue: z
    .looseObject({ numericValue: z.number().nullish(), currencyCode: z.string().nullish() })
    .nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Event Name', path: 'eventName' },
  { header: 'Counting Method', path: 'countingMethod' },
  { header: 'Create Time', path: 'createTime' },
  { header: 'Custom', path: 'custom' },
  { header: 'Deletable', path: 'deletable' },
];

const valueFields = {
  defaultValue: z.coerce.number().optional().describe('Default value for the key event'),
  currencyCode: z.string().optional().describe('Currency code for the default value'),
};

const valueFlags = {
  defaultValue: '--default-value <value>',
  currencyCode: '--currency-code <code>',
};

// 1.x parity: --currency-code is only sent together with --default-value
function defaultValueOf(input: { defaultValue?: number; currencyCode?: string }): IKeyEvent['defaultValue'] {
  return input.defaultValue === undefined
    ? undefined
    : { numericValue: input.defaultValue, currencyCode: input.currencyCode };
}

export const listKeyEvents = listOp({
  id: 'admin.key-events.list',
  summary: 'List key events for a property',
  rpc: 'ListKeyEvents',
  item: keyEvent,
  columns,
  call: async (c, ctx) => (await c.listKeyEvents({ parent: parentOf('property', ctx.property) }))[0],
});

export const getKeyEvent = getOp({
  id: 'admin.key-events.get',
  summary: 'Get a key event',
  rpc: 'GetKeyEvent',
  label: 'Key event',
  item: keyEvent,
  columns,
  call: async (c, name) => (await c.getKeyEvent({ name }))[0],
});

export const createKeyEvent = defineOperation({
  id: 'admin.key-events.create',
  summary: 'Create a key event',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateKeyEvent'),
  input: z.object({
    eventName: z.string().min(1).describe('Event name'),
    countingMethod: z.enum(COUNTING_METHODS).default('ONCE_PER_EVENT').describe(COUNTING_METHOD_HELP),
    ...valueFields,
  }),
  flags: {
    eventName: '--event-name <eventName>',
    countingMethod: '--counting-method <method>',
    ...valueFlags,
  },
  output: keyEvent,
  columns: columns.slice(0, 4),
  run: async (input, ctx) => {
    const client = await getAdminClient();
    const [item] = await client.createKeyEvent({
      parent: parentOf('property', ctx.property),
      keyEvent: {
        eventName: input.eventName,
        countingMethod: input.countingMethod,
        defaultValue: defaultValueOf(input),
      },
    });
    return item as z.infer<typeof keyEvent>;
  },
});

export const updateKeyEvent = defineOperation({
  id: 'admin.key-events.update',
  summary: 'Update a key event',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateKeyEvent'),
  input: z.object({
    name: resourceName('Key event'),
    countingMethod: z.enum(COUNTING_METHODS).optional().describe(COUNTING_METHOD_HELP),
    ...valueFields,
  }),
  flags: {
    name: '--name <resourceName>',
    countingMethod: '--counting-method <method>',
    ...valueFlags,
  },
  output: keyEvent,
  columns: columns.slice(0, 3),
  run: async (input) => {
    const client = await getAdminClient();
    const event: IKeyEvent = { name: input.name };
    const paths: string[] = [];
    if (input.countingMethod) {
      event.countingMethod = input.countingMethod;
      paths.push('counting_method');
    }
    const defaultValue = defaultValueOf(input);
    if (defaultValue) {
      event.defaultValue = defaultValue;
      paths.push('default_value');
    }
    const [item] = await client.updateKeyEvent({ keyEvent: event, updateMask: { paths } });
    return item as z.infer<typeof keyEvent>;
  },
});

export const deleteKeyEvent = removeOp({
  id: 'admin.key-events.delete',
  summary: 'Delete a key event',
  rpc: 'DeleteKeyEvent',
  label: 'Key Event',
  verb: 'delete',
  call: (c, name) => c.deleteKeyEvent({ name }),
});

export const keyEventOps = [listKeyEvents, getKeyEvent, createKeyEvent, updateKeyEvent, deleteKeyEvent];
