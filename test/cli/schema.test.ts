import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const BIN = resolve(process.cwd(), 'dist/index.js');
const run = promisify(execFile);
const env = {
  ...process.env,
  NO_COLOR: '1',
  CLAUDECODE: '',
  CODEX_THREAD_ID: '',
  AI_AGENT: '',
  GACLI_AGENT: '',
};

async function cli(args: string[], extraEnv: Record<string, string> = {}) {
  try {
    const { stdout, stderr } = await run(process.execPath, [BIN, ...args], { env: { ...env, ...extraEnv } });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

describe.skipIf(!existsSync(BIN))('gacli schema (e2e)', () => {
  it('filters by command path', async () => {
    const r = await cli(['schema', 'admin', 'custom-dimensions']);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).operations).toHaveLength(5);
  });

  it('exits 2 for an unknown path', async () => {
    expect((await cli(['schema', 'nope'])).code).toBe(2);
  });

  it('prints markdown with --llms', async () => {
    const r = await cli(['schema', '--llms']);
    expect(r.stdout).toContain('## gacli report run');
  });

  it('adds the agent preamble to --help only for agents', async () => {
    expect((await cli(['--help'], { CLAUDECODE: '1' })).stdout).toContain('gacli schema');
    expect((await cli(['--help'])).stdout).not.toContain('[agent mode]');
  });
});
