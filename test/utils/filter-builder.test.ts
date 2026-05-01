import { describe, expect, it } from 'vitest';
import { buildFilterExpression, parseFilterString, parseJsonFilter } from '../../src/utils/filter-builder.js';

describe('parseFilterString', () => {
  it('parses == as EXACT stringFilter', () => {
    expect(parseFilterString('country==US')).toEqual({
      filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'US' } },
    });
  });

  it('parses != as notExpression around EXACT stringFilter', () => {
    expect(parseFilterString('country!=US')).toEqual({
      notExpression: {
        filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'US' } },
      },
    });
  });

  it('parses =~ as FULL_REGEXP stringFilter', () => {
    expect(parseFilterString('pagePath=~^/blog/.*')).toEqual({
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'FULL_REGEXP', value: '^/blog/.*' },
      },
    });
  });

  it('parses !~ as notExpression around FULL_REGEXP', () => {
    expect(parseFilterString('pagePath!~^/admin')).toEqual({
      notExpression: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'FULL_REGEXP', value: '^/admin' },
        },
      },
    });
  });

  it('parses > as GREATER_THAN numericFilter', () => {
    expect(parseFilterString('sessions>100')).toEqual({
      filter: {
        fieldName: 'sessions',
        numericFilter: { operation: 'GREATER_THAN', value: { doubleValue: 100 } },
      },
    });
  });

  it('parses < as LESS_THAN numericFilter', () => {
    expect(parseFilterString('sessions<10')).toEqual({
      filter: {
        fieldName: 'sessions',
        numericFilter: { operation: 'LESS_THAN', value: { doubleValue: 10 } },
      },
    });
  });

  it('parses >= as GREATER_THAN_OR_EQUAL (regression: order of regex alternation)', () => {
    // Bug: with 1-char `>` ordered before 2-char `>=`, `sessions>=100` parsed as `>` operator
    // and value `=100`, which Number()-coerces to NaN and silently broke the filter.
    const parsed = parseFilterString('sessions>=100');
    expect(parsed).toEqual({
      filter: {
        fieldName: 'sessions',
        numericFilter: { operation: 'GREATER_THAN_OR_EQUAL', value: { doubleValue: 100 } },
      },
    });
    expect(parsed.filter?.numericFilter?.value.doubleValue).not.toBeNaN();
  });

  it('parses <= as LESS_THAN_OR_EQUAL (regression)', () => {
    const parsed = parseFilterString('bounceRate<=0.5');
    expect(parsed).toEqual({
      filter: {
        fieldName: 'bounceRate',
        numericFilter: { operation: 'LESS_THAN_OR_EQUAL', value: { doubleValue: 0.5 } },
      },
    });
    expect(parsed.filter?.numericFilter?.value.doubleValue).not.toBeNaN();
  });

  it('throws on missing operator', () => {
    expect(() => parseFilterString('justaword')).toThrow(/Invalid filter format/);
  });

  it('throws on empty string', () => {
    expect(() => parseFilterString('')).toThrow(/Invalid filter format/);
  });

  it('preserves regex special chars in value verbatim', () => {
    const parsed = parseFilterString('pagePath=~/foo\\.bar(.*)');
    expect(parsed.filter?.stringFilter?.value).toBe('/foo\\.bar(.*)');
  });

  it('handles multi-character values containing operator-like chars', () => {
    // Value containing `=` after the operator should be captured as part of value via greedy `.+`.
    const parsed = parseFilterString('label==a==b');
    expect(parsed.filter?.stringFilter?.value).toBe('a==b');
  });
});

describe('buildFilterExpression', () => {
  it('returns undefined for empty input', () => {
    expect(buildFilterExpression([])).toBeUndefined();
  });

  it('returns the single expression unwrapped when one filter', () => {
    expect(buildFilterExpression(['country==US'])).toEqual({
      filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'US' } },
    });
  });

  it('combines multiple filters with AND', () => {
    const built = buildFilterExpression(['country==US', 'sessions>=100']);
    expect(built).toEqual({
      andGroup: {
        expressions: [
          { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'US' } } },
          {
            filter: {
              fieldName: 'sessions',
              numericFilter: {
                operation: 'GREATER_THAN_OR_EQUAL',
                value: { doubleValue: 100 },
              },
            },
          },
        ],
      },
    });
  });

  it('propagates parse errors from invalid components', () => {
    expect(() => buildFilterExpression(['country==US', 'broken'])).toThrow(/Invalid filter format/);
  });
});

describe('parseJsonFilter', () => {
  it('round-trips a JSON FilterExpression', () => {
    const json = JSON.stringify({
      filter: { fieldName: 'x', stringFilter: { matchType: 'EXACT', value: 'y' } },
    });
    expect(parseJsonFilter(json)).toEqual({
      filter: { fieldName: 'x', stringFilter: { matchType: 'EXACT', value: 'y' } },
    });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJsonFilter('{not json')).toThrow();
  });
});
