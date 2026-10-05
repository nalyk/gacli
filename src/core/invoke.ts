import { reportToJson } from '../formatters/json.formatter.js';
import type { ReportData } from '../types/common.js';
import { validatePropertyId } from '../validation/validators.js';
import { formatZodIssues, GacliError } from './errors.js';
import type { AnyOperation, OperationDef } from './operation.js';

// Shared by the CLI and MCP adapters, so both validate and shape results identically.

export function parseOperationInput(
  op: AnyOperation,
  raw: Record<string, unknown>,
  label: (key: string) => string = (k) => k,
): Record<string, unknown> {
  const keys = Object.keys(op.input.shape);
  const parsed = op.input.safeParse(Object.fromEntries(keys.map((k) => [k, raw[k]])));
  if (!parsed.success) throw new GacliError('usage', formatZodIssues(parsed.error.issues, label));
  return parsed.data;
}

export function resolveProperty(
  op: Pick<OperationDef, 'needsProperty'>,
  candidate: string | undefined,
): string {
  return op.needsProperty ? validatePropertyId(candidate ?? '') : '';
}

export function dryRunPreview(op: AnyOperation, property: string, input: unknown) {
  return { dryRun: true, operation: op.id, rpc: op.api?.rpc, property: property || undefined, input };
}

/** Exactly the object `-f json` prints (see jsonOutputSchema in catalog.ts). */
export function toEnvelope(op: Pick<OperationDef, 'kind'>, result: unknown): unknown {
  switch (op.kind) {
    case 'report':
      return reportToJson(result as ReportData);
    case 'reports': {
      const reports = (result as ReportData[]).map(reportToJson);
      return reports.length === 1 ? reports[0] : reports;
    }
    case 'resource':
      return Array.isArray(result) ? { rowCount: result.length, data: result } : { data: result };
  }
}
