import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setJsonErrors } from '../../src/core/errors.js';
import { handleError } from '../../src/utils/error-handler.js';
import { logger } from '../../src/utils/logger.js';

class ExitCalled extends Error {
  constructor(public exitCode: number | undefined) {
    super(`exit ${exitCode}`);
  }
}

describe('handleError', () => {
  let errors: string[];
  let infos: string[];
  let stderr: string[];

  beforeEach(() => {
    errors = [];
    infos = [];
    stderr = [];
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitCalled(code);
    }) as never);
    vi.spyOn(logger, 'error').mockImplementation((m: string) => {
      errors.push(m);
    });
    vi.spyOn(logger, 'info').mockImplementation((m: string) => {
      infos.push(m);
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string) => {
      stderr.push(String(chunk));
      return true;
    }) as never);
  });

  afterEach(() => {
    setJsonErrors(false);
    vi.restoreAllMocks();
  });

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

  it('maps PERMISSION_DENIED to auth exit 3 with a hint line', () => {
    expect(exitCodeOf(Object.assign(new Error('7 PERMISSION_DENIED: no access'), { code: 7 }))).toBe(3);
    expect(errors[0]).toBe('Permission denied: no access');
    expect(infos[0]).toMatch(/^hint: /);
  });

  it('maps daily quota to exit 6', () => {
    expect(exitCodeOf(new Error('8 RESOURCE_EXHAUSTED: Exhausted property tokens per day'))).toBe(6);
  });

  it('emits one JSON line on stderr in JSON mode', () => {
    setJsonErrors(true);
    expect(exitCodeOf(Object.assign(new Error('5 NOT_FOUND: gone'), { code: 5 }))).toBe(5);
    expect(errors).toEqual([]);
    expect(stderr).toHaveLength(1);
    const parsed = JSON.parse(stderr[0]);
    expect(parsed.error.code).toBe('NOT_FOUND');
    expect(parsed.error.exitCode).toBe(5);
  });
});
