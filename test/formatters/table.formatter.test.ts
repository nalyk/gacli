import { formatTable } from '../../src/formatters/table.formatter.js';
import type { ReportData } from '../../src/types/common.js';

describe('formatTable', () => {
  const mockData: ReportData = {
    headers: ['Metric', 'Value', 'Dimension'],
    rows: [
      ['sessions', '1000', 'web'],
      ['users', '850', 'web'],
      ['conversions', '120', 'web'],
    ],
    rowCount: 3,
  };

  describe('empty data', () => {
    it('should return yellow message when no rows', () => {
      const emptyData: ReportData = {
        headers: ['Metric'],
        rows: [],
        rowCount: 0,
      };

      const result = formatTable(emptyData);
      expect(result).toContain('No data returned.');
    });
  });

  describe('normal data', () => {
    it('should format data with headers', () => {
      const result = formatTable(mockData);
      expect(result).toContain('sessions');
      expect(result).toContain('users');
      expect(result).toContain('conversions');
    });

    it('should include row count at the end', () => {
      const result = formatTable(mockData);
      expect(result).toContain('3 row(s)');
    });

    it('should include all headers', () => {
      const result = formatTable(mockData);
      expect(result).toContain('Metric');
      expect(result).toContain('Value');
      expect(result).toContain('Dimension');
    });

    it('should include all rows', () => {
      const result = formatTable(mockData);
      expect(result).toContain('1000');
      expect(result).toContain('850');
      expect(result).toContain('120');
    });
  });

  describe('single row', () => {
    it('should format single row correctly', () => {
      const singleRowData: ReportData = {
        headers: ['Metric'],
        rows: [['value']],
        rowCount: 1,
      };

      const result = formatTable(singleRowData);
      expect(result).toContain('value');
      expect(result).toContain('1 row(s)');
    });
  });

  describe('many rows', () => {
    it('should handle large datasets', () => {
      const largeData: ReportData = {
        headers: ['Metric', 'Dimension'],
        rows: Array.from({ length: 100 }, (_, i) => [`value_${i}`, `dim_${i}`]),
        rowCount: 100,
      };

      const result = formatTable(largeData);
      expect(result).toContain('100 row(s)');
      expect(result.split('\n').length).toBeGreaterThan(2);
    });
  });

  describe('special characters', () => {
    it('should handle special characters in data', () => {
      const specialData: ReportData = {
        headers: ['Metric', 'Description'],
        rows: [
          ['sessions', 'Sessions with special chars: @#$%^&*'],
          ['users', 'Users with "quotes" and \'apostrophes\''],
        ],
        rowCount: 2,
      };

      const result = formatTable(specialData);
      expect(result).toContain('special chars');
      expect(result).toContain('quotes');
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

      const result = formatTable(unicodeData);
      expect(result).toContain('🇺🇸');
      expect(result).toContain('🇬🇧');
    });
  });

  describe('long headers', () => {
    it('should handle long header names', () => {
      const longHeaderData: ReportData = {
        headers: [
          'Very Long Header Name That Might Wrap',
          'Another Very Long Header Name',
        ],
        rows: [['value1', 'value2']],
        rowCount: 1,
      };

      const result = formatTable(longHeaderData);
      expect(result).toContain('Very Long Header Name That Might Wrap');
    });
  });

  describe('long rows', () => {
    it('should handle long row values', () => {
      const longRowData: ReportData = {
        headers: ['Metric', 'Long Value'],
        rows: [
          ['sessions', 'This is a very long value that might wrap in the terminal output'],
        ],
        rowCount: 1,
      };

      const result = formatTable(longRowData);
      expect(result).toContain('This is a very long value');
    });
  });

  describe('empty headers', () => {
    it('should handle empty header array', () => {
      const emptyHeadersData: ReportData = {
        headers: [],
        rows: [],
        rowCount: 0,
      };

      const result = formatTable(emptyHeadersData);
      expect(result).toContain('No data returned.');
    });
  });

  describe('empty rows array', () => {
    it('should handle rows array with empty strings', () => {
      const emptyRowsData: ReportData = {
        headers: ['Metric', 'Value'],
        rows: [['', '']],
        rowCount: 1,
      };

      const result = formatTable(emptyRowsData);
      expect(result).toContain('');
      expect(result).toContain('1 row(s)');
    });
  });

  describe('numeric only data', () => {
    it('should handle purely numeric data', () => {
      const numericData: ReportData = {
        headers: ['ID', 'Value', 'Score'],
        rows: [
          ['1', '100', '95'],
          ['2', '200', '88'],
          ['3', '150', '92'],
        ],
        rowCount: 3,
      };

      const result = formatTable(numericData);
      expect(result).toContain('100');
      expect(result).toContain('95');
      expect(result).toContain('3 row(s)');
    });
  });

  describe('boolean values', () => {
    it('should handle boolean string values', () => {
      const boolData: ReportData = {
        headers: ['Metric', 'Is Active'],
        rows: [
          ['sessions', 'true'],
          ['users', 'false'],
          ['conversions', 'true'],
        ],
        rowCount: 3,
      };

      const result = formatTable(boolData);
      expect(result).toContain('true');
      expect(result).toContain('false');
    });
  });

  describe('null-like values', () => {
    it('should handle empty string values', () => {
      const nullData: ReportData = {
        headers: ['Metric', 'Value'],
        rows: [
          ['sessions', ''],
          ['users', ''],
        ],
        rowCount: 2,
      };

      const result = formatTable(nullData);
      expect(result).toContain('2 row(s)');
    });
  });
});
