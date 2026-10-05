import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Named imports of a missing built-in export are a link-time SyntaxError, so `?.` cannot guard them.
// enableCompileCache only exists from Node 22.1 while engines allows >=22.0, so the bootstrap must
// reach it through a namespace import. (No Node 22.0 runtime in CI to test this behaviourally.)
describe('src/index.ts bootstrap', () => {
  const src = readFileSync('src/index.ts', 'utf-8');

  it('does not use a named import from node:module', () => {
    expect(src).not.toMatch(/import\s*\{[^}]*\}\s*from\s*['"]node:module['"]/);
  });

  it('still enables the compile cache when available', () => {
    expect(src).toMatch(/\.enableCompileCache\?\.\(\)/);
  });
});
