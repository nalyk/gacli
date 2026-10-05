import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeFlags } from '../../src/core/cli-adapter.js';
import type { AnyOperation } from '../../src/core/operation.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'help-v1');

/** Flag tokens of a 1.x help fixture (same parsing as test/cli/help-compat.test.ts). */
export function fixtureFlags(op: AnyOperation): string[] {
  const help = readFileSync(join(FIXTURES, `${op.id.replaceAll('.', '_')}.txt`), 'utf-8');
  const start = help.indexOf('\nOptions:\n');
  if (start === -1) return [];
  const end = help.indexOf('\n\n', start + 10);
  return help
    .slice(start + 10, end === -1 ? undefined : end)
    .split('\n')
    .map((l) => l.match(/^ {2}(-\S.*?)(?: {2,}|$)/)?.[1])
    .filter((t): t is string => !!t && t !== '-h, --help');
}

/** 1.x flags the op no longer exposes (expected to be empty). */
export function lostFlags(op: AnyOperation): string[] {
  const now = new Set(describeFlags(op).map((f) => f.flag));
  return fixtureFlags(op).filter((f) => !now.has(f));
}
