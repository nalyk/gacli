import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { LAZY_COMMANDS, targetCommand } from '../../src/command-registry.js';
import { GROUP_DESCRIPTIONS } from '../../src/core/cli-adapter.js';
import { addGlobalOptions } from '../../src/types/common.js';

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
    [['-vp', '1', 'report'], 'report'],
    [['-vo', 'x.csv', 'schema'], 'schema'],
    [['-vf', 'json', 'config', 'list'], 'config'],
    [['-p123', 'admin'], 'admin'],
    [['--property=123', '--format=json', 'report', 'run'], 'report'],
    [['help', 'report', 'run'], 'report'],
  ])('targetCommand(%j) = %s', (args, expected) => {
    expect(targetCommand(addGlobalOptions(new Command('gacli')), args)).toBe(expected);
  });
});
