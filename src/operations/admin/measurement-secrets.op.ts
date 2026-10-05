import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { adminApi, listOp, removeOp } from './_helpers.js';

const secret = z.looseObject({
  name: z.string(),
  displayName: z.string().nullish(),
  secretValue: z.string().nullish(),
});

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Display Name', path: 'displayName' },
  { header: 'Secret Value', path: 'secretValue' },
];

const streamArg = z
  .string()
  .regex(/^properties\/\d+\/dataStreams\/\d+$/, 'expected properties/<id>/dataStreams/<id>')
  .describe('Data stream resource name (properties/<id>/dataStreams/<id>)');

const listMeasurementSecretsBase = listOp({
  id: 'admin.measurement-secrets.list',
  summary: 'List Measurement Protocol secrets for a data stream',
  rpc: 'ListMeasurementProtocolSecrets',
  item: secret,
  columns,
  needsProperty: false,
  input: z.object({ stream: streamArg }),
  flags: { stream: '--stream <dataStreamName>' },
  call: async (c, _ctx, { stream }) => (await c.listMeasurementProtocolSecrets({ parent: stream }))[0],
});

// secretValue is a write credential for Measurement Protocol ingestion: not in the read-only MCP default.
export const listMeasurementSecrets = { ...listMeasurementSecretsBase, sensitive: true };

export const createMeasurementSecret = defineOperation({
  id: 'admin.measurement-secrets.create',
  summary: 'Create a Measurement Protocol secret',
  category: 'create',
  kind: 'resource',
  api: adminApi('CreateMeasurementProtocolSecret'),
  input: z.object({
    stream: streamArg,
    displayName: z.string().min(1).describe('Human-readable name of the secret'),
  }),
  flags: { stream: '--stream <dataStreamName>', displayName: '--display-name <displayName>' },
  output: secret,
  columns,
  run: async ({ stream, displayName }) => {
    const client = await getAdminClient();
    const [item] = await client.createMeasurementProtocolSecret({
      parent: stream,
      measurementProtocolSecret: { displayName },
    });
    return item as z.infer<typeof secret>;
  },
});

export const deleteMeasurementSecret = removeOp({
  id: 'admin.measurement-secrets.delete',
  summary: 'Delete a Measurement Protocol secret',
  rpc: 'DeleteMeasurementProtocolSecret',
  label: 'Measurement Protocol secret',
  verb: 'delete',
  call: (c, name) => c.deleteMeasurementProtocolSecret({ name }),
});

export const measurementSecretOps = [
  listMeasurementSecrets,
  createMeasurementSecret,
  deleteMeasurementSecret,
];
