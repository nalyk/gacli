import { describe, expect, it } from 'vitest';
import { ZodError, z } from 'zod';
import { GacliError } from '../../src/core/errors.js';
import { validate, validatePropertyId } from '../../src/validation/validators.js';

describe('validatePropertyId', () => {
  it('strips the properties/ prefix', () => {
    expect(validatePropertyId('properties/123')).toBe('123');
  });

  it('throws a usage error when missing', () => {
    expect(() => validatePropertyId('')).toThrow(GacliError);
    try {
      validatePropertyId('');
    } catch (e) {
      expect((e as GacliError).kind).toBe('usage');
    }
  });

  it('rejects non-numeric IDs', () => {
    expect(() => validatePropertyId('abc')).toThrow('Invalid property ID "abc": expected digits');
  });
});

describe('validate', () => {
  it('returns parsed data', () => {
    expect(validate(z.object({ a: z.coerce.number() }), { a: '1' })).toEqual({ a: 1 });
  });

  it('throws (does not exit) on invalid data', () => {
    expect(() => validate(z.object({ a: z.number() }), { a: 'x' })).toThrow(ZodError);
  });
});
