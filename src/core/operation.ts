import type { z } from 'zod';
import type { GlobalOptions } from '../types/common.js';

export type Category = 'read' | 'create' | 'update' | 'delete' | 'action';

/** report = ReportData, reports = ReportData[], resource = typed API object(s) */
export type OutputKind = 'report' | 'reports' | 'resource';

export interface Column {
  header: string;
  path: string;
  format?: (value: unknown) => string;
}

export interface RunContext {
  /** Numeric property ID, '' when the operation does not need one. */
  property: string;
  globals: GlobalOptions;
  interactive: boolean;
}

export interface OperationDef<I extends z.ZodObject = z.ZodObject, O = unknown> {
  /** Dot path that is also the CLI path, e.g. 'admin.custom-dimensions.list'. */
  id: string;
  summary: string;
  description?: string;
  category: Category;
  idempotent?: boolean;
  api?: { service: 'data' | 'admin'; version: 'v1beta' | 'v1alpha'; rpc: string };
  needsProperty?: boolean;
  kind: OutputKind;
  input: I;
  output: z.ZodType<O>;
  columns?: Column[];
  /** Section heading for kind 'reports' in table/csv/chart output (default 'Report'). */
  reportLabel?: string;
  /** Verbatim commander flag strings keyed by input key; generated when absent. */
  flags?: Partial<Record<Extract<keyof z.input<I>, string>, string>>;
  run(input: z.output<I>, ctx: RunContext): Promise<O>;
}

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous catalogue of operations
export type AnyOperation = OperationDef<any, any>;

export function defineOperation<I extends z.ZodObject, O>(def: OperationDef<I, O>): OperationDef<I, O> {
  return def;
}

export function isMutating(category: Category): boolean {
  return category !== 'read';
}

export function cliPath(op: Pick<OperationDef, 'id'>): string[] {
  return op.id.split('.');
}
