import { z } from 'zod';
import { type Column, defineOperation } from '../../core/operation.js';
import { getPropertyQuotasSnapshot } from '../../services/data-api.service.js';

const quotaStatus = z.looseObject({ consumed: z.number().nullish(), remaining: z.number().nullish() });

const propertyQuota = z.looseObject({
  tokensPerDay: quotaStatus.nullish(),
  tokensPerHour: quotaStatus.nullish(),
  concurrentRequests: quotaStatus.nullish(),
  serverErrorsPerProjectPerHour: quotaStatus.nullish(),
  potentiallyThresholdedRequestsPerHour: quotaStatus.nullish(),
  tokensPerProjectPerHour: quotaStatus.nullish(),
});

const snapshot = z.looseObject({
  name: z.string(),
  corePropertyQuota: propertyQuota.nullish(),
  realtimePropertyQuota: propertyQuota.nullish(),
  funnelPropertyQuota: propertyQuota.nullish(),
});

type Snapshot = z.infer<typeof snapshot>;

const usage = (value: unknown): string => {
  const q = value as { consumed?: number | null; remaining?: number | null } | null | undefined;
  return q ? `${q.consumed ?? 0} / ${q.remaining ?? ''}` : '';
};

const FAMILIES = [
  ['corePropertyQuota', 'Core'],
  ['realtimePropertyQuota', 'Realtime'],
  ['funnelPropertyQuota', 'Funnel'],
] as const;

const QUOTAS = [
  ['tokensPerDay', 'tokens/day'],
  ['tokensPerHour', 'tokens/hour'],
  ['concurrentRequests', 'concurrent'],
  ['serverErrorsPerProjectPerHour', 'server errors/hour'],
  ['potentiallyThresholdedRequestsPerHour', 'thresholded/hour'],
] as const;

export const reportQuota = defineOperation({
  id: 'report.quota',
  summary: 'Show the property quota snapshot (consumed / remaining per quota category)',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: { service: 'data', version: 'v1alpha', rpc: 'GetPropertyQuotasSnapshot' },
  input: z.object({}),
  output: snapshot,
  columns: [
    { header: 'Name', path: 'name' },
    ...FAMILIES.flatMap(([family, label]) =>
      QUOTAS.map(
        ([quota, what]): Column => ({
          header: `${label} ${what}`,
          path: `${family}.${quota}`,
          format: usage,
        }),
      ),
    ),
  ],
  run: async (_input, ctx) => (await getPropertyQuotasSnapshot(ctx.property)) as Snapshot,
});
