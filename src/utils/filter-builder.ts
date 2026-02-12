import type { FilterExpression } from '../types/data-api.js';

export function parseFilterString(filterStr: string): FilterExpression {
  // Shorthand format: "dimension==value" or "metric>100"
  const match = filterStr.match(/^(\w+)(==|!=|=~|!~|>|<|>=|<=)(.+)$/);
  if (!match) {
    throw new Error(
      `Invalid filter format: "${filterStr}". Use format: fieldName==value, fieldName>100, fieldName=~regex`,
    );
  }

  const [, fieldName, operator, value] = match;

  switch (operator) {
    case '==':
      return {
        filter: {
          fieldName,
          stringFilter: { matchType: 'EXACT', value },
        },
      };
    case '!=':
      return {
        notExpression: {
          filter: {
            fieldName,
            stringFilter: { matchType: 'EXACT', value },
          },
        },
      };
    case '=~':
      return {
        filter: {
          fieldName,
          stringFilter: { matchType: 'FULL_REGEXP', value },
        },
      };
    case '!~':
      return {
        notExpression: {
          filter: {
            fieldName,
            stringFilter: { matchType: 'FULL_REGEXP', value },
          },
        },
      };
    case '>':
      return {
        filter: {
          fieldName,
          numericFilter: {
            operation: 'GREATER_THAN',
            value: { doubleValue: Number(value) },
          },
        },
      };
    case '<':
      return {
        filter: {
          fieldName,
          numericFilter: {
            operation: 'LESS_THAN',
            value: { doubleValue: Number(value) },
          },
        },
      };
    case '>=':
      return {
        filter: {
          fieldName,
          numericFilter: {
            operation: 'GREATER_THAN_OR_EQUAL',
            value: { doubleValue: Number(value) },
          },
        },
      };
    case '<=':
      return {
        filter: {
          fieldName,
          numericFilter: {
            operation: 'LESS_THAN_OR_EQUAL',
            value: { doubleValue: Number(value) },
          },
        },
      };
    default:
      throw new Error(`Unknown filter operator: ${operator}`);
  }
}

export function buildFilterExpression(filters: string[]): FilterExpression | undefined {
  if (!filters || filters.length === 0) return undefined;

  const expressions = filters.map(parseFilterString);

  if (expressions.length === 1) return expressions[0];

  return { andGroup: { expressions } };
}

export function parseJsonFilter(json: string): FilterExpression {
  return JSON.parse(json) as FilterExpression;
}
