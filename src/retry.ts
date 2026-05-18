/**
 * Retry helpers for transient HTTP failures.
 *
 * The validation endpoint rate-limits at 20 req/15 min per IP, so a busy
 * seller app calling validate() on every request will see occasional 429s
 * during traffic spikes. We retry those (and 5xx, and network errors) with
 * exponential backoff + jitter, but never retry 4xx errors that mean "your
 * request is wrong" (401, 404, 400).
 */

export interface RetryableError extends Error {
  /** Set true to opt this error into retry; default (missing/false) = no retry. */
  retryable?: boolean;
  /** Optional explicit delay before next attempt, in ms. Trumps exponential backoff. */
  retryAfterMs?: number;
}

export interface BackoffOptions {
  baseMs: number;
  capMs: number;
  jitter: boolean;
}

export interface WithRetryOptions extends BackoffOptions {
  /** Max number of retries (initial attempt not counted). */
  maxRetries: number;
  /** Injected sleep for testability. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Compute backoff in ms for `attempt` (1-indexed). With `jitter:true`,
 * picks a random value in `[0, base * 2^(attempt-1)]`, capped at capMs.
 * With `jitter:false`, returns exactly `min(base * 2^(attempt-1), capMs)`.
 */
export function computeBackoffMs(
  attempt: number,
  { baseMs, capMs, jitter }: BackoffOptions,
): number {
  const exp = baseMs * Math.pow(2, Math.max(0, attempt - 1));
  const ceiling = Math.min(exp, capMs);
  if (!jitter) return ceiling;
  return Math.floor(Math.random() * ceiling);
}

/**
 * Parse an HTTP `Retry-After` header to a milliseconds-from-now value.
 * Accepts either an integer seconds value or an HTTP-date.
 *
 * Returns null on missing / malformed / past-date inputs.
 */
export function parseRetryAfter(value: string | null | undefined): number | null {
  if (!value) return null;
  // Integer seconds
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return seconds * 1000;
  }
  // HTTP-date
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return null;
  const delta = ts - Date.now();
  if (delta <= 0) return null;
  return delta;
}

/**
 * Run `fn` and retry on `retryable` failures with backoff. Non-retryable
 * errors (including any error missing the `retryable: true` flag) propagate
 * on first throw.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: WithRetryOptions,
): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep;
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = isRetryable(err);
      if (!retryable || attempt === opts.maxRetries) {
        throw err;
      }
      const explicit = (err as RetryableError).retryAfterMs;
      const delayMs = typeof explicit === 'number' && explicit > 0
        ? explicit
        : computeBackoffMs(attempt + 1, opts);
      await sleep(delayMs);
    }
  }
  // Unreachable, but keeps TypeScript narrowing happy.
  throw lastError;
}

function isRetryable(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as RetryableError).retryable === true);
}
