import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildCatalog } from '../../src/core/catalog.js';
import { renderCatalogIndex, renderHelpSections, replaceRegion } from '../../src/core/docs.js';
import { defineOperation } from '../../src/core/operation.js';

const del = defineOperation({
  id: 'admin.things.delete',
  summary: 'Delete a thing',
  description: 'Removes the thing for good.',
  category: 'delete',
  kind: 'resource',
  input: z.object({ name: z.string().describe('Thing resource name') }),
  flags: { name: '--name <resourceName>' },
  output: z.object({ name: z.string(), deleted: z.literal(true) }),
  run: async () => ({ name: 'x', deleted: true as const }),
});
const list = defineOperation({
  id: 'admin.things.list',
  summary: 'List things',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  input: z.object({ limit: z.coerce.number().optional().describe('Max rows') }),
  output: z.array(z.object({ name: z.string() })),
  run: async () => [],
});
const catalog = buildCatalog([list, del]);

describe('replaceRegion', () => {
  const text = 'head\n<!-- BEGIN GENERATED: x -->\nold\n<!-- END GENERATED: x -->\ntail\n';

  it('replaces only between the markers', () => {
    expect(replaceRegion(text, 'x', 'new')).toBe(
      'head\n<!-- BEGIN GENERATED: x -->\nnew\n<!-- END GENERATED: x -->\ntail\n',
    );
  });

  it('throws when the markers are missing', () => {
    expect(() => replaceRegion('nothing here', 'x', 'new')).toThrow(/x/);
  });
});

describe('renderHelpSections', () => {
  const md = renderHelpSections(catalog);

  it('renders one section per operation with usage and a flag table', () => {
    expect(md).toContain('## gacli admin things delete');
    expect(md).toContain('Removes the thing for good.');
    expect(md).toContain('gacli admin things delete [options]');
    expect(md).toContain('| `--name <resourceName>` | yes |');
  });

  it('states safety, property and output facts', () => {
    expect(md).toContain('requires `--yes`');
    expect(md).toContain('Supports `--dry-run`');
    expect(md).toContain('Needs `-p <property>`');
    expect(md).toMatch(/-f json.*\{rowCount, data\}/);
  });
});

describe('renderCatalogIndex', () => {
  it('groups operations by top-level command', () => {
    const md = renderCatalogIndex(catalog);
    expect(md).toContain('### admin');
    expect(md).toContain('| `gacli admin things list` | read | List things |');
  });
});
