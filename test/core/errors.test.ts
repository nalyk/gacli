import { CommanderError } from 'commander';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EXIT_CODES, GacliError, toGacliError } from '../../src/core/errors.js';

const grpc = (code: number, msg: string) => Object.assign(new Error(`${code} ${msg}`), { code });

describe('toGacliError', () => {
  it('passes GacliError through unchanged', () => {
    const e = new GacliError('usage', 'bad');
    expect(toGacliError(e)).toBe(e);
  });

  it('maps ZodError to usage (exit 2) with a readable message', () => {
    const r = z.object({ limit: z.number() }).safeParse({ limit: 'x' });
    const e = toGacliError(r.error);
    expect(e.kind).toBe('usage');
    expect(e.exitCode).toBe(2);
    expect(e.message).toContain('limit');
  });

  it('maps CommanderError to usage', () => {
    const e = toGacliError(new CommanderError(1, 'commander.unknownOption', "error: unknown option '--x'"));
    expect(e.kind).toBe('usage');
    expect(e.message).toBe("unknown option '--x'");
  });

  it.each([
    [3, 'INVALID_ARGUMENT: bad dim', 'usage', 2],
    [5, 'NOT_FOUND: nope', 'not_found', 5],
    [7, 'PERMISSION_DENIED: no', 'auth', 3],
    [16, 'UNAUTHENTICATED: expired', 'auth', 3],
    [8, 'RESOURCE_EXHAUSTED: Exhausted property tokens per day', 'quota', 6],
    [8, 'RESOURCE_EXHAUSTED: per hour', 'quota', 6],
    [14, 'UNAVAILABLE: reset', 'api', 1],
    [4, 'DEADLINE_EXCEEDED: slow', 'api', 1],
    [13, 'INTERNAL: boom', 'api', 1],
  ])('maps gRPC %i to %s (exit %i)', (code, msg, kind, exit) => {
    const e = toGacliError(grpc(code as number, msg as string));
    expect(e.kind).toBe(kind);
    expect(e.exitCode).toBe(exit);
    expect(e.grpcStatus).toBe(code);
  });

  it('strips the status prefix and labels invalid arguments', () => {
    expect(toGacliError(grpc(3, 'INVALID_ARGUMENT: bad dim')).message).toBe('Invalid argument: bad dim');
  });

  it('hints auth login for UNAUTHENTICATED and access for PERMISSION_DENIED', () => {
    expect(toGacliError(grpc(16, 'UNAUTHENTICATED: x')).hint).toContain('gacli auth login');
    expect(toGacliError(grpc(7, 'PERMISSION_DENIED: x')).hint).toMatch(/access|scope/i);
  });

  it('hints the reset for daily quota', () => {
    expect(toGacliError(grpc(8, 'RESOURCE_EXHAUSTED: Exhausted property tokens per day')).hint).toContain(
      'midnight Pacific',
    );
  });

  it('maps missing credentials to auth', () => {
    expect(toGacliError(new Error('No credentials configured. Run `gacli auth login`')).kind).toBe('auth');
  });

  it('maps a plain error to internal (exit 1)', () => {
    const e = toGacliError(new Error('boom'));
    expect(e.kind).toBe('internal');
    expect(e.exitCode).toBe(1);
  });

  it('wraps non-errors', () => {
    expect(toGacliError('weird').message).toBe('weird');
  });
});

describe('GacliError', () => {
  it('serialises to a stable JSON error envelope', () => {
    const e = new GacliError('not_found', 'gone', { hint: 'check name', grpcStatus: 5 });
    expect(e.toJSON()).toEqual({
      error: { code: 'NOT_FOUND', message: 'gone', hint: 'check name', grpcStatus: 5, exitCode: 5 },
    });
  });

  it('has the documented exit-code table', () => {
    expect(EXIT_CODES).toEqual({
      usage: 2,
      auth: 3,
      confirmation: 4,
      not_found: 5,
      quota: 6,
      api: 1,
      internal: 1,
    });
  });
});

describe('toGacliError: ADC', () => {
  it('maps missing default credentials to auth with setup hints', () => {
    const e = toGacliError(
      new Error(
        'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication',
      ),
    );
    expect(e.kind).toBe('auth');
    expect(e.hint).toContain('gacli auth login');
    expect(e.hint).toContain('gcloud auth application-default login');
  });
});

describe('toGacliError: credential hints', () => {
  it('ADC hint includes analytics scopes and the quota project', () => {
    const e = toGacliError(new Error('Could not load the default credentials.'));
    expect(e.hint).toContain('--scopes=');
    expect(e.hint).toContain('set-quota-project');
  });

  it('an UNAUTHENTICATED error under GACLI_ACCESS_TOKEN points at the token, not auth login', () => {
    const before = process.env.GACLI_ACCESS_TOKEN;
    process.env.GACLI_ACCESS_TOKEN = 'ya29.x';
    try {
      const e = toGacliError(Object.assign(new Error('16 UNAUTHENTICATED: bad'), { code: 16 }));
      expect(e.hint).toContain('GACLI_ACCESS_TOKEN');
      expect(e.hint).not.toContain('auth login');
    } finally {
      if (before === undefined) delete process.env.GACLI_ACCESS_TOKEN;
      else process.env.GACLI_ACCESS_TOKEN = before;
    }
  });
});
