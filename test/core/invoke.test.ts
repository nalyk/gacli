import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GacliError } from '../../src/core/errors.js';
import { parseOperationInput, resolveProperty, toEnvelope } from '../../src/core/invoke.js';
import { defineOperation } from '../../src/core/operation.js';
import { renderResult } from '../../src/core/render.js';

const op = defineOperation({
  id: 'demo.things.list',
  summary: 'List',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  input: z.object({ limit: z.coerce.number().int().positive().optional() }),
  output: z.array(z.object({ id: z.string() })),
  run: async () => [],
});
const noProp = { ...op, needsProperty: false };

describe('parseOperationInput', () => {
  it('returns parsed input', () => {
    expect(parseOperationInput(op, { limit: '3' })).toEqual({ limit: 3 });
  });

  it('throws a usage GacliError labelled by the given mapper', () => {
    try {
      parseOperationInput(op, { limit: 'x' }, (k) => `--${k}`);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(GacliError);
      expect((e as GacliError).kind).toBe('usage');
      expect((e as GacliError).message).toMatch(/^--limit: /);
    }
  });
});

describe('resolveProperty', () => {
  it('validates when the op needs a property', () => {
    expect(resolveProperty(op, 'properties/12')).toBe('12');
    expect(() => resolveProperty(op, undefined)).toThrow(GacliError);
  });

  it('returns empty when not needed', () => {
    expect(resolveProperty(noProp, undefined)).toBe('');
  });
});

describe('toEnvelope matches the -f json output exactly', () => {
  const report = { headers: ['c', 's'], rows: [['RO', '1']], rowCount: 1, metadata: { currencyCode: 'USD' } };
  const cases: [string, Parameters<typeof renderResult>[0], unknown][] = [
    ['report', { kind: 'report' }, report],
    ['resource list', { kind: 'resource' }, [{ id: 'a' }, { id: 'b' }]],
    ['resource single', { kind: 'resource' }, { id: 'a' }],
    ['reports (1)', { kind: 'reports' }, [report]],
    ['reports (2)', { kind: 'reports' }, [report, report]],
  ];
  for (const [name, kindOp, result] of cases) {
    it(name, () => {
      expect(JSON.stringify(toEnvelope(kindOp, result))).toBe(
        renderResult(kindOp, result, { format: 'json', pretty: false }),
      );
    });
  }

  it('report envelope shape', () => {
    expect(toEnvelope({ kind: 'report' }, report)).toEqual({
      rowCount: 1,
      data: [{ c: 'RO', s: '1' }],
      metadata: { currencyCode: 'USD' },
    });
  });
});
