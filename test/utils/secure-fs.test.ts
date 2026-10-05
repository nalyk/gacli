import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/utils/logger.js';
import { ensureSecureDir, readJsonFile, writeFileAtomic } from '../../src/utils/secure-fs.js';

const posix = process.platform !== 'win32';
const modeOf = (p: string) => statSync(p).mode & 0o777;

describe('secure-fs', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'gacli-sfs-'));
  });

  it.runIf(posix)('writeFileAtomic tightens an existing 0644 file to 0600 and replaces content', () => {
    const f = join(dir, 'tokens.json');
    writeFileSync(f, 'old', { mode: 0o644 });
    chmodSync(f, 0o644);
    writeFileAtomic(f, 'new');
    expect(modeOf(f)).toBe(0o600);
    expect(readFileSync(f, 'utf-8')).toBe('new');
  });

  it('writeFileAtomic leaves no temp file behind', () => {
    writeFileAtomic(join(dir, 'a.json'), '{}');
    expect(readdirSync(dir).filter((n) => n.endsWith('.tmp'))).toEqual([]);
  });

  it.runIf(posix)('ensureSecureDir tightens an existing 0755 dir to 0700', () => {
    const d = join(dir, 'cfg');
    mkdirSync(d, { mode: 0o755 });
    chmodSync(d, 0o755);
    ensureSecureDir(d);
    expect(modeOf(d)).toBe(0o700);
  });

  it('ensureSecureDir creates missing nested dirs', () => {
    const d = join(dir, 'x', 'y');
    ensureSecureDir(d);
    expect(statSync(d).isDirectory()).toBe(true);
  });

  it('readJsonFile returns null for a missing file without warning', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    expect(readJsonFile(join(dir, 'missing.json'), 'config')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('readJsonFile warns once and returns null on corrupt JSON', () => {
    const f = join(dir, 'bad.json');
    writeFileSync(f, '{bad');
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    expect(readJsonFile(f, 'config')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(`Ignoring corrupt config at ${f}`);
  });

  it('readJsonFile parses valid JSON', () => {
    const f = join(dir, 'ok.json');
    writeFileSync(f, '{"a":1}');
    expect(readJsonFile<{ a: number }>(f, 'config')).toEqual({ a: 1 });
  });
});
