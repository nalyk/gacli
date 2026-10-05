import { describe, expect, it } from 'vitest';
import { GacliError } from '../../src/core/errors.js';
import { renderResult, toPlain } from '../../src/core/render.js';
import type { ReportData } from '../../src/types/common.js';

const report: ReportData = {
  headers: ['country', 'sessions', 'users'],
  rows: [
    ['RO', '100', '80'],
    ['MD', '50', '40'],
  ],
  rowCount: 2,
};
const items = [
  { name: 'properties/1/customDimensions/1', displayName: 'Plan', scope: 'EVENT', meta: { a: 1 } },
  { name: 'properties/1/customDimensions/2', displayName: 'Tier', scope: 'USER', meta: { a: 2 } },
];
const resourceOp = {
  kind: 'resource' as const,
  columns: [
    { header: 'Name', path: 'name' },
    { header: 'Scope', path: 'scope', format: (v: unknown) => `<${v}>` },
  ],
};
const opts = (format: 'json' | 'ndjson' | 'table' | 'csv', extra: object = {}) => ({
  format,
  pretty: false,
  ...extra,
});

describe('renderResult: report', () => {
  it('keeps the report envelope in json, compact or pretty', () => {
    expect(JSON.parse(renderResult({ kind: 'report' }, report, opts('json'))).rowCount).toBe(2);
    expect(renderResult({ kind: 'report' }, report, { format: 'json', pretty: true })).toContain('\n');
    expect(renderResult({ kind: 'report' }, report, opts('json'))).not.toContain('\n');
  });

  it('projects --fields as a header subset in the given order', () => {
    const out = JSON.parse(
      renderResult({ kind: 'report' }, report, opts('json', { fields: ['users', 'country'] })),
    );
    expect(out.data[0]).toEqual({ users: '80', country: 'RO' });
    expect(Object.keys(out.data[0])).toEqual(['users', 'country']);
  });

  it('rejects unknown report fields as a usage error', () => {
    expect(() => renderResult({ kind: 'report' }, report, opts('json', { fields: ['nope'] }))).toThrow(
      GacliError,
    );
  });
});

describe('renderResult: reports', () => {
  it('emits a json array for several reports', () => {
    const out = JSON.parse(renderResult({ kind: 'reports' }, [report, report], opts('json')));
    expect(out).toHaveLength(2);
  });
});

describe('renderResult: resource', () => {
  it('wraps arrays as { rowCount, data } in json', () => {
    const out = JSON.parse(renderResult(resourceOp, items, opts('json')));
    expect(out.rowCount).toBe(2);
    expect(out.data[1].meta.a).toBe(2);
  });

  it('wraps a single object as { data } without rowCount', () => {
    const out = JSON.parse(renderResult(resourceOp, items[0], opts('json')));
    expect(out).toEqual({ data: items[0] });
  });

  it('writes one ndjson line per item', () => {
    const lines = renderResult(resourceOp, items, opts('ndjson')).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).displayName).toBe('Plan');
  });

  it('uses declared columns and formatters for csv', () => {
    const out = renderResult(resourceOp, items, opts('csv'));
    expect(out.split('\n')[0]).toContain('Name');
    expect(out).toContain('<EVENT>');
    expect(out).not.toContain('displayName');
  });

  it('projects dot-path fields', () => {
    const out = JSON.parse(
      renderResult(resourceOp, items, opts('json', { fields: ['displayName', 'meta.a'] })),
    );
    expect(out.data[0]).toEqual({ displayName: 'Plan', 'meta.a': 1 });
  });

  it('uses fields as table columns when given', () => {
    const out = renderResult(resourceOp, items, opts('csv', { fields: ['displayName'] }));
    expect(out.split('\n')[0]).toContain('displayName');
    expect(out).not.toContain('Name,');
  });

  it('rejects fields absent from every item', () => {
    expect(() => renderResult(resourceOp, items, opts('json', { fields: ['missing'] }))).toThrow(
      /Unknown field\(s\): missing/,
    );
  });

  it('falls back to top-level keys when no columns are declared, stringifying objects', () => {
    const out = renderResult({ kind: 'resource' }, items, opts('csv'));
    expect(out.split('\n')[0]).toContain('displayName');
    expect(out).toContain('{""a"":1}');
  });
});

describe('toPlain', () => {
  it('drops class prototypes and undefined values', () => {
    class Msg {
      a = 1;
      b = undefined;
    }
    const plain = toPlain(new Msg());
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
    expect(plain).toEqual({ a: 1 });
  });
});
