import { formatOutput, formatReports } from '../formatters/index.js';
import { formatJson } from '../formatters/json.formatter.js';
import type { OutputFormat, ReportData } from '../types/common.js';
import { GacliError } from './errors.js';
import type { Column, OperationDef } from './operation.js';

export interface RenderOptions {
  format: OutputFormat;
  fields?: string[];
  pretty: boolean;
}

/** Strips class prototypes (protobuf messages) and undefined values. */
export function toPlain<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function unknownFields(missing: string[], available: string[]): GacliError {
  return new GacliError(
    'usage',
    `Unknown field(s): ${missing.join(', ')}. Available: ${available.join(', ')}`,
  );
}

function projectReport(data: ReportData, fields?: string[]): ReportData {
  if (!fields?.length) return data;
  const missing = fields.filter((f) => !data.headers.includes(f));
  if (missing.length) throw unknownFields(missing, data.headers);
  const idx = fields.map((f) => data.headers.indexOf(f));
  return { ...data, headers: fields, rows: data.rows.map((r) => idx.map((i) => r[i] ?? '')) };
}

function renderReport(data: ReportData, opts: RenderOptions): string {
  return opts.format === 'json' ? formatJson(data, { pretty: opts.pretty }) : formatOutput(data, opts.format);
}

function renderResource(columns: Column[] | undefined, result: unknown, opts: RenderOptions): string {
  const isList = Array.isArray(result);
  const items: unknown[] = isList ? (result as unknown[]) : [result];

  if (opts.fields?.length) {
    const fields = opts.fields;
    if (items.length > 0) {
      const missing = fields.filter((f) => items.every((it) => getPath(it, f) === undefined));
      if (missing.length) {
        const available = Object.keys((items[0] ?? {}) as Record<string, unknown>);
        throw unknownFields(missing, available);
      }
    }
    // Projected keys are the literal paths ("meta.a"), so they are read back by key, not split.
    const projected = items.map((it) => Object.fromEntries(fields.map((f) => [f, getPath(it, f)])));
    if (opts.format === 'json' || opts.format === 'ndjson') {
      return renderStructured(isList ? projected : projected[0], projected, opts);
    }
    const data: ReportData = {
      headers: fields,
      rows: projected.map((it) => fields.map((f) => cell(it[f]))),
      rowCount: projected.length,
    };
    return formatOutput(data, opts.format);
  }

  if (opts.format === 'json' || opts.format === 'ndjson') {
    return renderStructured(result, items, opts);
  }

  const effective: Column[] =
    columns ?? Object.keys((items[0] ?? {}) as Record<string, unknown>).map((k) => ({ header: k, path: k }));
  const data: ReportData = {
    headers: effective.map((c) => c.header),
    rows: items.map((it) =>
      effective.map((c) => (c.format ? c.format(getPath(it, c.path)) : cell(getPath(it, c.path)))),
    ),
    rowCount: items.length,
  };
  return formatOutput(data, opts.format);
}

function renderStructured(result: unknown, items: unknown[], opts: RenderOptions): string {
  if (opts.format === 'ndjson') {
    return items.length ? `${items.map((it) => JSON.stringify(it)).join('\n')}\n` : '';
  }
  const envelope = Array.isArray(result) ? { rowCount: result.length, data: result } : { data: result };
  return opts.pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}

export function renderResult(
  op: Pick<OperationDef, 'kind' | 'columns' | 'reportLabel'>,
  result: unknown,
  opts: RenderOptions,
): string {
  switch (op.kind) {
    case 'report':
      return renderReport(projectReport(result as ReportData, opts.fields), opts);
    case 'reports':
      return formatReports(
        (result as ReportData[]).map((r) => projectReport(r, opts.fields)),
        opts.format,
        op.reportLabel,
      );
    case 'resource':
      return renderResource(op.columns, result, opts);
  }
}
