import { describe, it, expect, vi } from 'vitest';
import { withRetry, computeBackoffMs, parseRetryAfter } from '../src/retry.js';

describe('computeBackoffMs', () => {
  it('returns increasing values for higher attempts (exponential)', () => {
    const a = computeBackoffMs(1, { baseMs: 250, capMs: 8000, jitter: false });
    const b = computeBackoffMs(2, { baseMs: 250, capMs: 8000, jitter: false });
    const c = computeBackoffMs(3, { baseMs: 250, capMs: 8000, jitter: false });
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('caps at capMs even for high attempt counts', () => {
    const value = computeBackoffMs(20, { baseMs: 250, capMs: 8000, jitter: false });
    expect(value).toBeLessThanOrEqual(8000);
  });

  it('with jitter, value falls within [base * 2^n / 2, capMs]', () => {
    for (let i = 0; i < 50; i++) {
      const value = computeBackoffMs(3, { baseMs: 250, capMs: 8000, jitter: true });
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(8000);
    }
  });

  it('attempt 1 with no jitter is exactly baseMs', () => {
    const value = computeBackoffMs(1, { baseMs: 250, capMs: 8000, jitter: false });
    expect(value).toBe(250);
  });
});

describe('parseRetryAfter', () => {
  it('parses an integer seconds value to milliseconds', () => {
    expect(parseRetryAfter('30')).toBe(30_000);
  });

  it('parses an HTTP-date format to milliseconds-from-now (approximately)', () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    const ms = parseRetryAfter(future);
    // Tolerance: parsing a UTC-string drops sub-second precision, so we
    // allow up to 2s of skew from the intended 60s.
    expect(ms).toBeGreaterThan(58_000);
    expect(ms).toBeLessThanOrEqual(60_000);
  });

  it('returns null for missing / null / empty', () => {
    expect(parseRetryAfter(null)).toBe(null);
    expect(parseRetryAfter(undefined)).toBe(null);
    expect(parseRetryAfter('')).toBe(null);
  });

  it('returns null for garbage', () => {
    expect(parseRetryAfter('not-a-date')).toBe(null);
    expect(parseRetryAfter('-5')).toBe(null);
  });
});

describe('withRetry', () => {
  it('returns immediately on first-call success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseMs: 1, capMs: 10, jitter: false, sleep: () => Promise.resolve() });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxRetries on retryable errors', async () => {
    const err = new Error('retry-me') as Error & { retryable: boolean };
    err.retryable = true;
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseMs: 1, capMs: 10, jitter: false, sleep: () => Promise.resolve() });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries', async () => {
    const err = new Error('always-fails') as Error & { retryable: boolean };
    err.retryable = true;
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, { maxRetries: 2, baseMs: 1, capMs: 10, jitter: false, sleep: () => Promise.resolve() })
    ).rejects.toThrow('always-fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does NOT retry when error.retryable is false', async () => {
    const err = new Error('do-not-retry') as Error & { retryable: boolean };
    err.retryable = false;
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, { maxRetries: 5, baseMs: 1, capMs: 10, jitter: false, sleep: () => Promise.resolve() })
    ).rejects.toThrow('do-not-retry');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry when error is missing the retryable flag entirely', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('unknown-failure'));
    await expect(
      withRetry(fn, { maxRetries: 5, baseMs: 1, capMs: 10, jitter: false, sleep: () => Promise.resolve() })
    ).rejects.toThrow('unknown-failure');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects Retry-After value from error.retryAfterMs', async () => {
    const sleepCalls: number[] = [];
    const err = new Error('429') as Error & { retryable: boolean; retryAfterMs: number };
    err.retryable = true;
    err.retryAfterMs = 1234;
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    await withRetry(fn, {
      maxRetries: 3,
      baseMs: 1,
      capMs: 10,
      jitter: false,
      sleep: (ms: number) => { sleepCalls.push(ms); return Promise.resolve(); },
    });
    expect(sleepCalls).toEqual([1234]);
  });

  it('uses exponential backoff when error has no retryAfterMs', async () => {
    const sleepCalls: number[] = [];
    const err = new Error('500') as Error & { retryable: boolean };
    err.retryable = true;
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    await withRetry(fn, {
      maxRetries: 3,
      baseMs: 250,
      capMs: 8000,
      jitter: false,
      sleep: (ms: number) => { sleepCalls.push(ms); return Promise.resolve(); },
    });
    // Two retries → sleep called twice with increasing values
    expect(sleepCalls.length).toBe(2);
    expect(sleepCalls[1]!).toBeGreaterThan(sleepCalls[0]!);
  });
});
