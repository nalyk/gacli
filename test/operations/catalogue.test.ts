import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '../../src/operations/index.js';

describe('phase 4 operations are registered', () => {
  it.each([
    'report.quota',
    'report.tasks.create',
    'report.chat',
    'admin.accounts.summaries',
    'admin.annotations.create',
    'admin.change-history.search',
    'admin.access-report.run',
    'admin.measurement-secrets.delete',
    'admin.data-retention.update',
  ])('%s', (id) => {
    expect(OPERATIONS.map((o) => o.id)).toContain(id);
  });

  it('change-history filters a property with --filter-property, not the global -p', () => {
    const op = OPERATIONS.find((o) => o.id === 'admin.change-history.search');
    expect(Object.keys(op?.input.shape ?? {})).toContain('filterProperty');
    expect(Object.keys(op?.input.shape ?? {})).not.toContain('property');
  });
});
