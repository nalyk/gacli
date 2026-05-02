import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetExtensionsRootCache, resolveExtensionsRoot } from '../../src/utils/extension-root.js';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'gacli-ext-root-test-'));
  resetExtensionsRootCache();
});

afterEach(() => {
  delete process.env.GACLI_EXTENSIONS_DIR;
  resetExtensionsRootCache();
  rmSync(workDir, { recursive: true, force: true });
});

describe('resolveExtensionsRoot', () => {
  it('honors GACLI_EXTENSIONS_DIR override when it points to a valid tree', () => {
    const ext = join(workDir, 'extensions');
    mkdirSync(join(ext, '_core'), { recursive: true });
    writeFileSync(join(ext, '_core', 'README.md'), '', 'utf-8');
    process.env.GACLI_EXTENSIONS_DIR = ext;
    expect(resolveExtensionsRoot()).toBe(ext);
  });

  it('throws when GACLI_EXTENSIONS_DIR is set but missing _core/', () => {
    const ext = join(workDir, 'extensions');
    mkdirSync(ext, { recursive: true });
    process.env.GACLI_EXTENSIONS_DIR = ext;
    expect(() => resolveExtensionsRoot()).toThrow(/does not look like a gacli extensions tree/);
  });
});
