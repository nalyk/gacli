import { z } from 'zod';
import { type Column, defineOperation, type OperationDef, type RunContext } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { withRetry } from '../../utils/retry.js';
import { resourceName } from '../shared.js';

export type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

export const adminApi = (rpc: string) => ({ service: 'admin' as const, version: 'v1alpha' as const, rpc });

export function parentOf(kind: 'property' | 'account', id: string): string {
  return kind === 'property' ? `properties/${id}` : `accounts/${id}`;
}

interface ListOpOptions<I extends z.ZodObject, T> {
  id: string;
  summary: string;
  rpc: string;
  item: z.ZodType<T>;
  columns: Column[];
  call: (client: AdminClient, ctx: RunContext, input: z.output<I>) => Promise<unknown[] | null | undefined>;
  input?: I;
  flags?: Partial<Record<Extract<keyof z.input<I>, string>, string>>;
  needsProperty?: boolean;
}

/** A read-only list; retried; `needsProperty` defaults to true. */
export function listOp<I extends z.ZodObject = z.ZodObject<Record<string, never>>, T = unknown>(
  o: ListOpOptions<I, T>,
): OperationDef<I, T[]> {
  return defineOperation({
    id: o.id,
    summary: o.summary,
    category: 'read',
    kind: 'resource',
    needsProperty: o.needsProperty ?? true,
    api: adminApi(o.rpc),
    input: (o.input ?? z.object({})) as I,
    flags: o.flags,
    output: z.array(o.item),
    columns: o.columns,
    run: async (input, ctx) => {
      const client = await getAdminClient();
      return ((await withRetry(() => o.call(client, ctx, input), { label: o.rpc })) ?? []) as T[];
    },
  });
}

const nameInput = (label: string) => z.object({ name: resourceName(label) });
const nameFlags = { name: '--name <resourceName>' };

/** A read-only get by full resource name (`--name`); retried. */
export function getOp<T>(o: {
  id: string;
  summary: string;
  rpc: string;
  label: string;
  item: z.ZodType<T>;
  columns: Column[];
  call: (client: AdminClient, name: string) => Promise<unknown>;
}) {
  return defineOperation({
    id: o.id,
    summary: o.summary,
    category: 'read',
    kind: 'resource',
    api: adminApi(o.rpc),
    input: nameInput(o.label),
    flags: nameFlags,
    output: o.item,
    columns: o.columns,
    run: async ({ name }) => {
      const client = await getAdminClient();
      return (await withRetry(() => o.call(client, name), { label: o.rpc })) as T;
    },
  });
}

/** delete/archive by `--name`: category 'delete' (needs --yes), 1.x-style status row output. */
export function removeOp(o: {
  id: string;
  summary: string;
  rpc: string;
  label: string;
  verb: 'delete' | 'archive';
  call: (client: AdminClient, name: string) => Promise<unknown>;
}) {
  const flag = o.verb === 'delete' ? 'deleted' : 'archived';
  return defineOperation({
    id: o.id,
    summary: o.summary,
    category: 'delete',
    kind: 'resource',
    api: adminApi(o.rpc),
    input: nameInput(o.label),
    flags: nameFlags,
    output: z.object({ name: z.string(), [flag]: z.literal(true) }),
    columns: [
      { header: 'Status', path: flag, format: () => (o.verb === 'delete' ? 'Deleted' : 'Archived') },
      { header: o.label, path: 'name' },
    ],
    run: async ({ name }) => {
      const client = await getAdminClient();
      await o.call(client, name);
      return { name, [flag]: true } as { name: string } & Record<typeof flag, true>;
    },
  });
}

/** Body + FieldMask paths for the fields actually provided. */
export function updateMask<T extends object>(
  input: T,
  map: Partial<Record<keyof T, string>>,
): { body: Partial<T>; paths: string[] } {
  const body: Partial<T> = {};
  const paths: string[] = [];
  for (const [key, path] of Object.entries(map) as [keyof T, string][]) {
    if (input[key] !== undefined) {
      body[key] = input[key];
      paths.push(path);
    }
  }
  return { body, paths };
}
