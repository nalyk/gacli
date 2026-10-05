import { describe, expect, it } from 'vitest';
import { LAZY_COMMANDS, targetCommand } from '../../src/command-registry.js';
import { GROUP_DESCRIPTIONS } from '../../src/core/cli-adapter.js';

describe('lazy command registry', () => {
  it.each(Object.entries(LAZY_COMMANDS))('stub "%s" describes the real command', async (name, lazy) => {
    const real = lazy.load === 'operations' ? GROUP_DESCRIPTIONS[name] : (await lazy.load()).description();
    expect(lazy.description).toBe(real);
  });

  it.each([
    [['report', 'run'], 'report'],
    [['-p', '123', '-f', 'json', 'admin', 'accounts', 'list'], 'admin'],
    [['--property', 'x', 'config'], 'config'],
    [['help', 'auth'], 'auth'],
    [['--help'], undefined],
    [['-v', '--no-color'], undefined],
  ])('targetCommand(%j) = %s', (args, expected) => {
    expect(targetCommand(args)).toBe(expected);
  });
});
