import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every flag string a 1.x leaf command accepted must still be accepted (new flags are fine).
const BIN = resolve(process.cwd(), 'dist/index.js');
const FIXTURES = resolve(process.cwd(), 'test/fixtures/help-v1');

export function flagTokens(help: string): string[] {
  const start = help.indexOf('\nOptions:\n');
  if (start === -1) return [];
  const end = help.indexOf('\n\n', start + 10);
  return help
    .slice(start + 10, end === -1 ? undefined : end)
    .split('\n')
    .map((l) => l.match(/^ {2}(-\S.*?)(?: {2,}|$)/)?.[1])
    .filter((t): t is string => !!t && t !== '-h, --help');
}

const env = {
  ...process.env,
  NO_COLOR: '1',
  CLAUDECODE: '',
  CODEX_THREAD_ID: '',
  AI_AGENT: '',
  GACLI_AGENT: '',
};

describe.skipIf(!existsSync(BIN))('1.x help surface is preserved', () => {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.txt'));

  it('has fixtures and extracts flag tokens from them', () => {
    expect(files.length).toBeGreaterThan(70);
    const runFlags = flagTokens(readFileSync(join(FIXTURES, 'report_run.txt'), 'utf-8'));
    expect(runFlags).toHaveLength(10);
    expect(runFlags).toContain('-m, --metrics <metrics...>');
  });

  for (const file of files) {
    const path = file.replace(/\.txt$/, '').split('_');
    it(`gacli ${path.join(' ')}`, () => {
      const before = flagTokens(readFileSync(join(FIXTURES, file), 'utf-8'));
      const after = flagTokens(
        execFileSync(process.execPath, [BIN, ...path, '--help'], { encoding: 'utf-8', env }),
      );
      expect(after).toEqual(expect.arrayContaining(before));
    });
  }
});
