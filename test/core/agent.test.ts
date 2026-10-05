import { describe, expect, it } from 'vitest';
import { detectAgent, isCI } from '../../src/core/agent.js';

describe('detectAgent', () => {
  it.each([
    [{ CLAUDECODE: '1' }, 'claude-code'],
    [{ CODEX_THREAD_ID: 'abc' }, 'codex'],
    [{ CURSOR_AGENT: '1' }, 'cursor'],
    [{ AI_AGENT: 'goose' }, 'goose'],
    [{ GACLI_AGENT: 'my-bot' }, 'my-bot'],
    [{}, undefined],
    [{ CLAUDECODE: '' }, undefined],
  ])('%o → %s', (env, expected) => {
    expect(detectAgent(env as NodeJS.ProcessEnv)).toBe(expected);
  });
});

describe('isCI', () => {
  it('reads CI', () => {
    expect(isCI({ CI: 'true' })).toBe(true);
    expect(isCI({ CI: 'false' })).toBe(false);
    expect(isCI({})).toBe(false);
  });
});
