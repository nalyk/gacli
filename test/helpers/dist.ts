import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const BIN = resolve(process.cwd(), 'dist/index.js');

// Locally a missing build just skips the CLI e2e tests; in CI it must fail loudly instead
// (a skipped safety net is how a dropped flag would slip through).
export const skipWithoutDist = !existsSync(BIN) && !process.env.CI;
