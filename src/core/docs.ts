import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCatalog, type Catalog, type CatalogEntry, envelopeText, toLlmsMarkdown } from './catalog.js';
import type { AnyOperation } from './operation.js';

// Markdown rendered from the operation catalogue (scripts/gen-docs.ts writes it; a test checks drift).

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function replaceRegion(text: string, name: string, content: string): string {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const a = text.indexOf(begin);
  const b = text.indexOf(end);
  if (a === -1 || b === -1 || b < a) throw new Error(`Missing generated-region markers for "${name}"`);
  return `${text.slice(0, a + begin.length)}\n${content}\n${text.slice(b)}`;
}

function section(op: CatalogEntry): string {
  const positional = op.flags.find((f) => f.positional);
  const usage = `${op.command}${positional ? ` [${positional.key}]` : ''} [options]`;
  const facts = [
    op.category === 'delete' ? 'Destructive: requires `--yes` when not interactive.' : '',
    op.category !== 'read' ? 'Supports `--dry-run`.' : '',
    op.needsProperty ? 'Needs `-p <property>`.' : '',
  ].filter(Boolean);
  const rows = op.flags.map(
    (f) =>
      `| \`${f.flag}\` | ${f.required ? 'yes' : ''} | ${f.defaultValue === undefined ? '' : `\`${JSON.stringify(f.defaultValue)}\``} | ${cell(f.description)} |`,
  );
  return [
    `## ${op.command}`,
    '',
    op.summary,
    ...(op.description ? ['', op.description] : []),
    '',
    '```',
    usage,
    '```',
    '',
    '| Flag | Required | Default | Description |',
    '|---|---|---|---|',
    ...rows,
    '',
    ...(facts.length ? [facts.join(' '), ''] : []),
    `Output: \`-f json\` → ${envelopeText(op)}.`,
  ].join('\n');
}

export function renderHelpSections(catalog: Catalog): string {
  return catalog.operations.map(section).join('\n\n');
}

export function renderCatalogIndex(catalog: Catalog): string {
  const groups = new Map<string, CatalogEntry[]>();
  for (const op of catalog.operations) {
    const group = op.command.split(' ')[1];
    groups.set(group, [...(groups.get(group) ?? []), op]);
  }
  return [...groups]
    .map(([group, ops]) =>
      [
        `### ${group}`,
        '',
        '| Command | Category | Purpose |',
        '|---|---|---|',
        ...ops.map((op) => `| \`${op.command}\` | ${op.category} | ${cell(op.summary)} |`),
      ].join('\n'),
    )
    .join('\n\n');
}

export interface GeneratedDoc {
  path: string;
  current: string;
  expected: string;
}

/** Every generated file with its current and expected content (paths relative to the repo root). */
export function generatedDocs(ops: AnyOperation[], root = process.cwd()): GeneratedDoc[] {
  // No version in generated text: a release bump must not make the docs stale.
  const catalog = { ...buildCatalog(ops), version: '' };
  const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');
  const region = (path: string, name: string, content: string): GeneratedDoc => {
    const current = read(path);
    return { path, current, expected: replaceRegion(current, name, content) };
  };
  let llms = '';
  try {
    llms = read('llms.txt');
  } catch {
    // first generation
  }
  return [
    region('help.md', 'operations', renderHelpSections(catalog)),
    region('extensions/_core/command-catalog.md', 'operations-index', renderCatalogIndex(catalog)),
    { path: 'llms.txt', current: llms, expected: `${toLlmsMarkdown(catalog)}\n` },
  ];
}
