import { describe, expect, it } from 'vitest';
import { generatedDocs } from '../../src/core/docs.js';
import { OPERATIONS } from '../../src/operations/index.js';

describe('generated docs are up to date (run `pnpm docs` after changing operations)', () => {
  for (const { path, current, expected } of generatedDocs(OPERATIONS)) {
    it(path, () => {
      expect(current === expected, `${path} is stale: run \`pnpm docs\``).toBe(true);
    });
  }
});
