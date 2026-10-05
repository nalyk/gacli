import { describe, expect, it } from 'vitest';
import { getGrpcCode, getGrpcMessage, isDailyQuotaError } from '../../src/utils/grpc-error.js';

describe('getGrpcCode', () => {
  it('prefers a numeric error.code', () => {
    expect(getGrpcCode(Object.assign(new Error('boom'), { code: 7 }))).toBe(7);
  });

  it('falls back to an anchored "<code> " message prefix', () => {
    expect(getGrpcCode(new Error('5 NOT_FOUND: x'))).toBe(5);
  });

  it('ignores digits in the middle of a non-gRPC message', () => {
    expect(getGrpcCode(new Error("ENOENT: open '/x/404 report.json'"))).toBeUndefined();
  });

  it('ignores string error codes', () => {
    expect(getGrpcCode(Object.assign(new Error('nope'), { code: 'ENOENT' }))).toBeUndefined();
  });

  it('ignores non-errors', () => {
    expect(getGrpcCode('5 NOT_FOUND')).toBeUndefined();
  });
});

describe('getGrpcMessage', () => {
  it('strips the code and status name prefix', () => {
    expect(getGrpcMessage(new Error('7 PERMISSION_DENIED: no access'))).toBe('no access');
  });

  it('leaves non-gRPC messages intact', () => {
    expect(getGrpcMessage(new Error("ENOENT: open '/x/404 report.json'"))).toBe(
      "ENOENT: open '/x/404 report.json'",
    );
  });
});

describe('isDailyQuotaError', () => {
  it('detects daily token exhaustion', () => {
    expect(
      isDailyQuotaError(
        new Error('8 RESOURCE_EXHAUSTED: Exhausted property tokens per day for a project per property'),
      ),
    ).toBe(true);
  });

  it('does not flag hourly exhaustion', () => {
    expect(
      isDailyQuotaError(new Error('8 RESOURCE_EXHAUSTED: Exhausted property tokens per hour for a project')),
    ).toBe(false);
  });
});
