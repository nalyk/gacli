import { z } from 'zod';
import { GacliError } from '../core/errors.js';
import type { OrderBy } from '../types/data-api.js';

export const reportDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  rowCount: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Metric/dimension names: `-m sessions activeUsers` and `-m sessions,activeUsers` both work (GA4 API
 * names never contain commas). Splitting after the array check keeps the input JSON Schema string[].
 */
export function nameList(opts: { min?: number } = {}) {
  const list = z.array(z.string().min(1));
  return (opts.min ? list.min(opts.min) : list).transform((names) =>
    names.flatMap((n) =>
      n
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

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
