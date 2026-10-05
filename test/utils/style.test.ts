import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setColorEnabled, style } from '../../src/utils/style.js';

describe('style', () => {
  let savedNoColor: string | undefined;

  beforeEach(() => {
    savedNoColor = process.env.NO_COLOR;
    delete process.env.NO_COLOR;
  });

  afterEach(() => {
    if (savedNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = savedNoColor;
    setColorEnabled(true);
  });

  it('returns plain text when colour is disabled', () => {
    setColorEnabled(false);
    expect(style('red', 'x')).toBe('x');
  });

  it('emits ANSI codes when colour is enabled, regardless of TTY', () => {
    setColorEnabled(true);
    expect(style('red', 'x')).toContain('\x1b[');
  });

  it('honours NO_COLOR even when enabled', () => {
    process.env.NO_COLOR = '1';
    setColorEnabled(true);
    expect(style('red', 'x')).toBe('x');
  });
});
