import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { BIN, skipWithoutDist } from '../helpers/dist.js';

// Every flag string a 1.x leaf command accepted must still be accepted (new flags are fine).
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

const run = promisify(execFile);

// Bounded parallelism: spawning all leaves at once starves other spawn-based test files.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const env = {
  ...process.env,
  NO_COLOR: '1',
  CLAUDECODE: '',
  CODEX_THREAD_ID: '',
  AI_AGENT: '',
  GACLI_AGENT: '',
};

describe.skipIf(skipWithoutDist)('1.x help surface is preserved', () => {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.txt'));

  it('has fixtures and extracts flag tokens from them', () => {
    expect(files.length).toBeGreaterThan(70);
    const runFlags = flagTokens(readFileSync(join(FIXTURES, 'report_run.txt'), 'utf-8'));
    expect(runFlags).toHaveLength(10);
    expect(runFlags).toContain('-m, --metrics <metrics...>');
  });

  it('every 1.x flag string is still accepted by every leaf command', async () => {
    const missing = await mapLimit(files, 8, async (file) => {
      const path = file.replace(/\.txt$/, '').split('_');
      const before = flagTokens(readFileSync(join(FIXTURES, file), 'utf-8'));
      const { stdout } = await run(process.execPath, [BIN, ...path, '--help'], { encoding: 'utf-8', env });
      const after = new Set(flagTokens(stdout));
      const lost = before.filter((f) => !after.has(f));
      return lost.length ? `gacli ${path.join(' ')}: ${lost.join(' | ')}` : null;
    });
    expect(missing.filter(Boolean)).toEqual([]);
  }, 60_000);
});
