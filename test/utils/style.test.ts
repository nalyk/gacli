import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setColorEnabled, style } from '../../src/utils/style.js';

describe('style', () => {
  const tty = { isTTY: true } as NodeJS.WriteStream;
  const pipe = { isTTY: false } as NodeJS.WriteStream;

  beforeEach(() => {
    vi.stubEnv('NO_COLOR', '');
    vi.stubEnv('FORCE_COLOR', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setColorEnabled(true);
  });

  it('returns plain text when colour is disabled', () => {
    setColorEnabled(false);
    expect(style('red', 'x', tty)).toBe('x');
  });

  it('emits ANSI codes on a TTY stream', () => {
    expect(style('red', 'x', tty)).toContain('\x1b[');
  });

  it('emits plain text on a piped stream', () => {
    expect(style('red', 'x', pipe)).toBe('x');
  });

  it('FORCE_COLOR colours a piped stream', () => {
    vi.stubEnv('FORCE_COLOR', '1');
    expect(style('red', 'x', pipe)).toContain('\x1b[');
  });

  it('FORCE_COLOR=0 does not force colour', () => {
    vi.stubEnv('FORCE_COLOR', '0');
    expect(style('red', 'x', pipe)).toBe('x');
  });

  it('honours NO_COLOR even when enabled', () => {
    vi.stubEnv('NO_COLOR', '1');
    expect(style('red', 'x', tty)).toBe('x');
  });
});
