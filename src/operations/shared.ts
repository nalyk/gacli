import { z } from 'zod';
import { GacliError } from '../core/errors.js';
import type { OrderBy } from '../types/data-api.js';

export const reportDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  rowCount: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const resourceName = (what: string) => z.string().min(1).describe(`${what} resource name`);

/** "metric:<name>[:desc]" or "dimension:<name>[:desc]" → GA4 OrderBy. */
export function parseOrderBys(specs: string[] | undefined): OrderBy[] | undefined {
  if (!specs?.length) return undefined;
  return specs.map((spec) => {
    const [type, name, dir] = spec.split(':');
    if ((type !== 'metric' && type !== 'dimension') || !name || (dir && dir !== 'desc' && dir !== 'asc')) {
      throw new GacliError(
        'usage',
        `Invalid --order-by "${spec}". Expected metric:<name>[:desc] or dimension:<name>[:desc]`,
      );
    }
    const desc = dir === 'desc';
    return type === 'metric'
      ? { metric: { metricName: name }, desc }
      : { dimension: { dimensionName: name }, desc };
  });
}
