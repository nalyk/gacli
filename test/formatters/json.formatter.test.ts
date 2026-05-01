import { formatJson } from '../../src/formatters/json.formatter.js';
import type { ReportData } from '../../src/types/common.js';

describe('formatJson', () => {
  const mockData: ReportData = {
    headers: ['Metric', 'Value', 'Dimension'],
    rows: [
      ['sessions', '1000', 'web'],
      ['users', '850', 'web'],
      ['conversions', '120', 'web'],
    ],
    rowCount: 3,
  };

  describe('basic formatting', () => {
    it('should format data as valid JSON', () => {
      const result = formatJson(mockData);
      const parsed = JSON.parse(result);
      
      expect(parsed).toHaveProperty('headers');
      expect(parsed).toHaveProperty('rows');
      expect(parsed).toHaveProperty('rowCount');
      expect(parsed.headers).toEqual(['Metric', 'Value', 'Dimension']);
      expect(parsed.rows).toHaveLength(3);
      expect(parsed.rowCount).toBe(3);
    });

    it('should preserve data integrity', () => {
      const result = formatJson(mockData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows[0]).toEqual(['sessions', '1000', 'web']);
      expect(parsed.rows[1]).toEqual(['users', '850', 'web']);
      expect(parsed.rows[2]).toEqual(['conversions', '120', 'web']);
    });

    it('should be valid JSON', () => {
      const result = formatJson(mockData);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('empty data', () => {
    it('should format empty data correctly', () => {
      const emptyData: ReportData = {
        headers: ['Metric'],
        rows: [],
        rowCount: 0,
      };

      const result = formatJson(emptyData);
      const parsed = JSON.parse(result);
      
      expect(parsed.headers).toEqual(['Metric']);
      expect(parsed.rows).toEqual([]);
      expect(parsed.rowCount).toBe(0);
    });
  });

  describe('special characters', () => {
    it('should handle special characters', () => {
      const specialData: ReportData = {
        headers: ['Metric', 'Description'],
        rows: [
          ['sessions', 'Sessions with @#$%^&*'],
          ['users', 'Users with "quotes"'],
        ],
        rowCount: 2,
      };

      const result = formatJson(specialData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows[0][1]).toBe('Sessions with @#$%^&*');
      expect(parsed.rows[1][1]).toBe('Users with "quotes"');
    });
  });

  describe('unicode characters', () => {
    it('should handle unicode characters', () => {
      const unicodeData: ReportData = {
        headers: ['Metric', 'Country'],
        rows: [
          ['sessions', '🇺🇸'],
          ['users', '🇬🇧'],
        ],
        rowCount: 2,
      };

      const result = formatJson(unicodeData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows[0][1]).toBe('🇺🇸');
      expect(parsed.rows[1][1]).toBe('🇬🇧');
    });
  });

  describe('numeric data', () => {
    it('should preserve numeric values as strings', () => {
      const numericData: ReportData = {
        headers: ['ID', 'Value', 'Score'],
        rows: [
          ['1', '100', '95.5'],
          ['2', '200', '88'],
        ],
        rowCount: 2,
      };

      const result = formatJson(numericData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows[0]).toEqual(['1', '100', '95.5']);
      expect(parsed.rows[1]).toEqual(['2', '200', '88']);
    });
  });

  describe('empty headers', () => {
    it('should handle empty headers', () => {
      const emptyHeadersData: ReportData = {
        headers: [],
        rows: [],
        rowCount: 0,
      };

      const result = formatJson(emptyHeadersData);
      const parsed = JSON.parse(result);
      
      expect(parsed.headers).toEqual([]);
      expect(parsed.rows).toEqual([]);
      expect(parsed.rowCount).toBe(0);
    });
  });

  describe('large dataset', () => {
    it('should handle large datasets', () => {
      const largeData: ReportData = {
        headers: ['Metric', 'Dimension'],
        rows: Array.from({ length: 1000 }, (_, i) => [`value_${i}`, `dim_${i}`]),
        rowCount: 1000,
      };

      const result = formatJson(largeData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows).toHaveLength(1000);
      expect(parsed.rowCount).toBe(1000);
      expect(parsed.headers).toEqual(['Metric', 'Dimension']);
    });
  });

  describe('single row', () => {
    it('should format single row correctly', () => {
      const singleRowData: ReportData = {
        headers: ['Metric'],
        rows: [['value']],
        rowCount: 1,
      };

      const result = formatJson(singleRowData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows).toEqual([['value']]);
      expect(parsed.rowCount).toBe(1);
    });
  });

  describe('empty string values', () => {
    it('should handle empty string values', () => {
      const emptyValuesData: ReportData = {
        headers: ['Metric', 'Value'],
        rows: [
          ['sessions', ''],
          ['users', ''],
        ],
        rowCount: 2,
      };

      const result = formatJson(emptyValuesData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows[0]).toEqual(['sessions', '']);
      expect(parsed.rows[1]).toEqual(['users', '']);
    });
  });

  describe('boolean string values', () => {
    it('should handle boolean string values', () => {
      const boolData: ReportData = {
        headers: ['Metric', 'Active'],
        rows: [
          ['sessions', 'true'],
          ['users', 'false'],
        ],
        rowCount: 2,
      };

      const result = formatJson(boolData);
      const parsed = JSON.parse(result);
      
      expect(parsed.rows[0]).toEqual(['sessions', 'true']);
      expect(parsed.rows[1]).toEqual(['users', 'false']);
    });
  });
});
