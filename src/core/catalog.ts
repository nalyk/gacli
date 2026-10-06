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

export const reportEnvelope = z.object({
  rowCount: z.number(),
  data: z
    .array(z.record(z.string(), z.string()))
    .describe('One object per row, keyed by dimension/metric name'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Schema of what `-f json` actually prints for this operation (see render.ts), not the internal result. */
export function jsonOutputSchema(op: AnyOperation): z.ZodType {
  switch (op.kind) {
    case 'report':
      return reportEnvelope;
    case 'reports':
      return z
        .union([reportEnvelope, z.array(reportEnvelope)])
        .describe('An array when more than one report is returned');
    case 'resource': {
      const isList = (op.output as z.ZodType & { def: { type: string } }).def.type === 'array';
      return isList ? z.object({ rowCount: z.number(), data: op.output }) : z.object({ data: op.output });
    }
  }
}

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
      output: jsonSchema(jsonOutputSchema(op), 'output'),
    })),
  };
}

/** One-line description of what `-f json` prints for an operation (shared with docs.ts). */
export function envelopeText(op: CatalogEntry): string {
  if (op.kind === 'report') return '`{rowCount, data: [{<dimension|metric>: string}], metadata?}`';
  if (op.kind === 'reports') return 'one report envelope, or an array of them for several requests';
  const required = (op.output as { required?: string[] }).required ?? [];
  return required.includes('rowCount') ? '`{rowCount, data}` (list)' : '`{data}` (single resource)';
}

const LLMS_PREAMBLE = [
  'gacli is a Google Analytics 4 CLI. Agent defaults: compact JSON on stdout when piped or under an AI agent,',
  'one JSON error line on stderr (`{"error":{code,message,hint,exitCode}}`), never an interactive prompt.',
  '',
  '- Auth: `GACLI_ACCESS_TOKEN=<oauth token>` (agents/CI), or `gacli auth login [--scopes readonly|edit|chat]`,',
  '  or a service account (`GOOGLE_APPLICATION_CREDENTIALS` / `gacli config set credentials <sa.json>`), else',
  '  Application Default Credentials. Check with `gacli auth token >/dev/null` (exit 3 = not authenticated).',
  '- Property: `-p <id>` or `gacli config set property <id>`; find IDs with `gacli admin accounts summaries`.',
  '- Discovery: `gacli schema [command...]` returns flags and input/output JSON Schema for any operation.',
  "- Anything not listed: `gacli api <admin|admin.v1beta|data|data.v1alpha> <Method> --body '<json>'`.",
  '- Writes: `--dry-run` previews; deletes/archives need `--yes` (exit 4 without it). `--fields a,b.c` projects output.',
  '- Lists: `-m sessions activeUsers` or `-m sessions,activeUsers`. JSON flags take inline JSON, `@file` or `@-`.',
];

export function toLlmsMarkdown(catalog: Catalog): string {
  const lines = [
    `# gacli${catalog.version ? ` ${catalog.version}` : ''} — operation reference`,
    '',
    ...LLMS_PREAMBLE,
    '',
    'Global: `-p <property>`, `-f table|json|ndjson|csv|chart` (json when piped), `-o <file>`.',
    `Exit codes: ${Object.entries(catalog.exitCodes)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ')}.`,
    '',
  ];
  for (const op of catalog.operations) {
    const positional = op.flags.find((f) => f.positional);
    lines.push(
      `## ${op.command}${positional ? ` [${positional.key}]` : ''}`,
      '',
      `${op.summary} — category \`${op.category}\`${op.needsProperty ? ', needs `-p`' : ''}${
        op.category === 'delete' ? ', needs `--yes`' : ''
      }.`,
      ...(op.description ? ['', op.description] : []),
      '',
      '| Flag | Required | Default | Description |',
      '|---|---|---|---|',
    );
    for (const f of op.flags) {
      const def = f.defaultValue === undefined ? '' : `\`${JSON.stringify(f.defaultValue)}\``;
      lines.push(
        `| \`${f.flag}\` | ${f.required ? 'yes' : ''} | ${def} | ${f.description.replace(/\|/g, '\\|')} |`,
      );
    }
    lines.push('', `Output: ${envelopeText(op)}.`, '');
  }
  return lines.join('\n');
}
