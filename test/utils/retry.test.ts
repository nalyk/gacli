import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRetry } from '../../src/utils/retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { maxRetries: 3 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on gRPC code 8 (quota)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('8 RESOURCE_EXHAUSTED quota exceeded'))
      .mockResolvedValue('ok');
    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on gRPC code 14 (unavailable)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('14 UNAVAILABLE service down'))
      .mockResolvedValue('recovered');
    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on gRPC code 3 (invalid argument)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('3 INVALID_ARGUMENT bad metric'));
    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow(/INVALID_ARGUMENT/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on gRPC code 7 (permission denied)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('7 PERMISSION_DENIED'));
    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow(/PERMISSION_DENIED/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on gRPC code 16 (unauthenticated)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('16 UNAUTHENTICATED'));
    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow(/UNAUTHENTICATED/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on errors without a gRPC code prefix', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('generic JavaScript error'));
    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow(/generic/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries on a persistently retriable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('14 UNAVAILABLE'))
      .mockRejectedValueOnce(new Error('14 UNAVAILABLE'))
      .mockRejectedValueOnce(new Error('14 UNAVAILABLE'));
    const promise = withRetry(fn, { maxRetries: 2, baseDelayMs: 0 });
    const assertion = expect(promise).rejects.toThrow(/UNAVAILABLE/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
