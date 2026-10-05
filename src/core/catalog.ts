import { z } from 'zod';
import { VERSION } from '../version.js';
import { describeFlags, type FlagSpec } from './cli-adapter.js';
import { EXIT_CODES } from './errors.js';
import { type AnyOperation, type Category, cliPath, type OutputKind } from './operation.js';

export interface CatalogEntry {
  id: string;
  command: string;
  summary: string;
  description?: string;
  category: Category;
  kind: OutputKind;
  api?: AnyOperation['api'];
  needsProperty: boolean;
  flags: Omit<FlagSpec, 'hidden'>[];
  input: unknown;
  output: unknown;
}

export interface Catalog {
  version: string;
  exitCodes: Record<string, number>;
  operations: CatalogEntry[];
}

const jsonSchema = (schema: z.ZodType, io: 'input' | 'output') =>
  z.toJSONSchema(schema, { io, unrepresentable: 'any' });

export function buildCatalog(ops: AnyOperation[]): Catalog {
  return {
    version: VERSION,
    exitCodes: { ok: 0, ...EXIT_CODES },
    operations: ops.map((op) => ({
      id: op.id,
      command: `gacli ${cliPath(op).join(' ')}`,
      summary: op.summary,
      ...(op.description ? { description: op.description } : {}),
      category: op.category,
      kind: op.kind,
      ...(op.api ? { api: op.api } : {}),
      needsProperty: !!op.needsProperty,
      flags: describeFlags(op)
        .filter((f) => !f.hidden)
        .map(({ hidden: _hidden, ...f }) => f),
      input: jsonSchema(op.input, 'input'),
      output: jsonSchema(op.output, 'output'),
    })),
  };
}

export function toLlmsMarkdown(catalog: Catalog): string {
  const lines = [
    `# gacli ${catalog.version} — operation reference`,
    '',
    'Global: `-p <property>`, `-f table|json|ndjson|csv|chart` (json when piped), `-o <file>`.',
    `Exit codes: ${Object.entries(catalog.exitCodes)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ')}.`,
    '',
  ];
  for (const op of catalog.operations) {
    lines.push(
      `## ${op.command}`,
      '',
      `${op.summary} — category \`${op.category}\`${op.needsProperty ? ', needs `-p`' : ''}.`,
      '',
    );
    lines.push('| Flag | Required | Description |', '|---|---|---|');
    for (const f of op.flags) {
      lines.push(`| \`${f.flag}\` | ${f.required ? 'yes' : ''} | ${f.description.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
