import type { z } from 'zod';
import { GacliError } from '../../core/errors.js';
import type { Column } from '../../core/operation.js';
import { type AdminClient, getOp } from './_helpers.js';

/**
 * A get for resources the Admin API can only list (no Get RPC, e.g. Firebase / Google Ads links):
 * lists under the name's property and picks the match.
 */
export function getViaListOp<T>(o: {
  id: string;
  summary: string;
  rpc: string;
  label: string;
  /** Collection segment of the resource name, e.g. 'firebaseLinks'. */
  collection: string;
  item: z.ZodType<T>;
  columns: Column[];
  list: (client: AdminClient, parent: string) => Promise<unknown[] | null | undefined>;
}) {
  const pattern = new RegExp(`^(properties/[^/]+)/${o.collection}/[^/]+$`);
  return getOp({
    id: o.id,
    summary: o.summary,
    rpc: o.rpc,
    label: o.label,
    item: o.item,
    columns: o.columns,
    call: async (client, name) => {
      const parent = pattern.exec(name)?.[1];
      if (!parent) {
        throw new GacliError(
          'usage',
          `Invalid ${o.label} name "${name}". Expected properties/<id>/${o.collection}/<id>`,
        );
      }
      const found = ((await o.list(client, parent)) ?? []).find(
        (it) => (it as { name?: string | null }).name === name,
      );
      if (!found) throw new GacliError('not_found', `${o.label} not found: ${name}`);
      return found;
    },
  });
}
