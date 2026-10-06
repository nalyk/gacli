import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { BIN, skipWithoutDist } from '../helpers/dist.js';

// Wall-clock budgets for the built CLI (median of 5). Opt-in (GACLI_STARTUP_BUDGET=1) because timing
// is only meaningful on an otherwise idle machine; CI runs it in a dedicated step.
const enabled = process.env.GACLI_STARTUP_BUDGET === '1';
const scale = Number(process.env.GACLI_STARTUP_BUDGET_SCALE ?? 1);

function medianMs(args: string[]): number {
  const runs: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = process.hrtime.bigint();
    execFileSync(process.execPath, [BIN, ...args], {
      stdio: 'ignore',
      env: { ...process.env, CLAUDECODE: '' },
    });
    runs.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  return runs.sort((a, b) => a - b)[2];
}

describe.skipIf(!enabled || skipWithoutDist)('startup budget', () => {
  // Spec success criterion 1: root --help (and --version) under 150ms.
  it('--version stays under 150ms', () => {
    expect(medianMs(['--version'])).toBeLessThan(150 * scale);
  });

  it('--help stays under 150ms', () => {
    expect(medianMs(['--help'])).toBeLessThan(150 * scale);
  });

  it('an operation command (report run --help) stays under 400ms', () => {
    expect(medianMs(['report', 'run', '--help'])).toBeLessThan(400 * scale);
  });
});
