import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleError } from '../../src/utils/error-handler.js';
import { logger } from '../../src/utils/logger.js';

class ExitCalled extends Error {
  constructor(public exitCode: number | undefined) {
    super(`exit ${exitCode}`);
  }
}

describe('handleError', () => {
  let errors: string[];

  beforeEach(() => {
    errors = [];
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitCalled(code);
    }) as never);
    vi.spyOn(logger, 'error').mockImplementation((m: string) => {
      errors.push(m);
    });
  });

  afterEach(() => vi.restoreAllMocks());

  const exitCodeOf = (err: unknown): number | undefined => {
    try {
      handleError(err);
    } catch (e) {
      if (e instanceof ExitCalled) return e.exitCode;
      throw e;
    }
  };

  it('does not misread a filesystem error containing "404 x" as gRPC', () => {
    expect(exitCodeOf(new Error("ENOENT: open '/x/404 report.json'"))).toBe(1);
    expect(errors[0]).toBe("ENOENT: open '/x/404 report.json'");
  });

  it('maps numeric error.code 7 to exit 7 with the stripped message', () => {
    expect(exitCodeOf(Object.assign(new Error('7 PERMISSION_DENIED: no access'), { code: 7 }))).toBe(7);
    expect(errors[0]).toBe('Permission denied: no access');
  });

  it('explains daily quota exhaustion', () => {
    expect(exitCodeOf(new Error('8 RESOURCE_EXHAUSTED: Exhausted property tokens per day'))).toBe(8);
    expect(errors[0]).toContain('Daily quota exhausted; resets at midnight Pacific.');
  });

  it('adds a hint for UNAVAILABLE', () => {
    expect(exitCodeOf(new Error('14 UNAVAILABLE: connection reset'))).toBe(1);
    expect(errors[0]).toContain('Service unavailable');
  });
});
