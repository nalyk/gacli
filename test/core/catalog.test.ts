import { describe, expect, it } from 'vitest';
import { buildCatalog, toLlmsMarkdown } from '../../src/core/catalog.js';
import { OPERATIONS } from '../../src/operations/index.js';

const catalog = buildCatalog(OPERATIONS);
const entry = (id: string) => catalog.operations.find((o) => o.id === id);

describe('buildCatalog', () => {
  it('lists every operation once with its CLI command', () => {
    const ids = catalog.operations.map((o) => o.id);
    expect(new Set(ids).size).toBe(OPERATIONS.length);
    expect(entry('admin.custom-dimensions.list')?.command).toBe('gacli admin custom-dimensions list');
  });

  it('exposes the exit-code table and version', () => {
    expect(catalog.exitCodes).toMatchObject({ ok: 0, usage: 2, confirmation: 4 });
    expect(catalog.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('describes verbatim flags with required-ness', () => {
    expect(entry('report.run')?.flags).toContainEqual(
      expect.objectContaining({ flag: '-m, --metrics <metrics...>', key: 'metrics', required: true }),
    );
    expect(entry('report.run')?.flags).toContainEqual(
      expect.objectContaining({ flag: '--limit <number>', required: false }),
    );
  });

  it('includes injected flags by category', () => {
    const flags = (id: string) => entry(id)?.flags.map((f) => f.flag) ?? [];
    expect(flags('admin.custom-dimensions.archive')).toEqual(
      expect.arrayContaining(['-y, --yes', '--dry-run', '--fields <paths>']),
    );
    expect(flags('report.run')).not.toContain('--dry-run');
  });

  it('emits JSON Schema for input and output', () => {
    const run = entry('report.run');
    expect(run?.input).toMatchObject({ type: 'object', required: expect.arrayContaining(['metrics']) });
    expect(run?.output).toMatchObject({ type: 'object' });
  });
});

describe('toLlmsMarkdown', () => {
  it('renders one section per operation', () => {
    const md = toLlmsMarkdown(catalog);
    expect(md).toContain('## gacli report run');
    expect(md).toContain('`-m, --metrics <metrics...>`');
    expect(md.match(/^## /gm)?.length).toBe(OPERATIONS.length);
  });
});
