// Regenerate (or with --check, verify) the docs rendered from the operation catalogue.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatedDocs } from '../src/core/docs.js';
import { OPERATIONS } from '../src/operations/index.js';

const check = process.argv.includes('--check');
const stale = generatedDocs(OPERATIONS).filter((d) => d.current !== d.expected);

if (check) {
  if (stale.length) {
    process.stderr.write(`Stale generated docs: ${stale.map((d) => d.path).join(', ')}\nRun \`pnpm docs\`.\n`);
    process.exit(1);
  }
  process.stderr.write('Generated docs are up to date.\n');
} else {
  for (const doc of stale) writeFileSync(resolve(doc.path), doc.expected);
  process.stderr.write(stale.length ? `Updated ${stale.map((d) => d.path).join(', ')}\n` : 'Nothing to update.\n');
}
