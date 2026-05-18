import { TtlCache } from './cache.js';
import { withRetry, parseRetryAfter, type RetryableError } from './retry.js';
import type {
  ClientOptions,
  ValidateOptions,
  ValidationClient,
  ValidationResponse,
  ValidationStatus,
} from './types.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BACKOFF_BASE_MS = 250;
const DEFAULT_BACKOFF_CAP_MS = 8_000;
const DEFAULT_CACHE_MAX = 1000;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

interface InternalOptions extends ClientOptions {
  /** Test-only: override the sleep used in retry backoff. */
  _sleepImpl?: (ms: number) => Promise<void>;
}

/**
 * Create a VCI validation client.
 *
 * The returned object has stable identity — keep a single instance per
 * process. The internal cache and rate-limit state are per-instance.
 */
export function createClient(opts: InternalOptions): ValidationClient {
  const baseUrl = opts.baseUrl.replace(/\/+$/, '');
  const apiKey = opts.apiKey;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const cacheTtlMs = opts.cacheTtlMs ?? DEFAULT_TTL_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sleepImpl = opts._sleepImpl;

  const cache = new TtlCache<ValidationResponse>({ ttlMs: cacheTtlMs, maxEntries: DEFAULT_CACHE_MAX });

  async function doFetch(code: string, key: string | undefined): Promise<ValidationResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/api/validation/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, api_key: key }),
          signal: controller.signal,
        });
      } catch (err) {
        // Network or timeout. Retry on transient; never throw out.
        const wrapped = new Error(redactSecrets(stringifyError(err))) as RetryableError;
        wrapped.retryable = true;
        throw wrapped;
      }

      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        const wrapped = new Error(`http_${response.status}`) as RetryableError;
        wrapped.retryable = true;
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
        if (retryAfter !== null) wrapped.retryAfterMs = retryAfter;
        // Stash a default failure response on the error so the outer catch
        // can convert it to a ValidationResponse if retries are exhausted.
        (wrapped as RetryableError & { fallbackResponse: ValidationResponse }).fallbackResponse =
          response.status === 429
            ? { valid: false, status: 'rate_limited', error: 'Rate limited' }
            : { valid: false, status: 'error', error: `Upstream error (HTTP ${response.status})` };
        throw wrapped;
      }

      // Non-retryable HTTP. 401 → unauthorized. Other 4xx → invalid.
      if (response.status === 401 || response.status === 403) {
        return { valid: false, status: 'unauthorized', error: 'Unauthorized' };
      }
      if (response.status >= 400 && response.status < 500) {
        return { valid: false, status: 'invalid', error: `Invalid request (HTTP ${response.status})` };
      }

      // 2xx — parse body and map.
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        return { valid: false, status: 'error', error: 'Malformed response from VCI' };
      }
      return mapResponseBody(json);
    } finally {
      clearTimeout(timer);
    }
  }

  async function validate(code: string, options: ValidateOptions = {}): Promise<ValidationResponse> {
    if (typeof code !== 'string' || code.length === 0) {
      return { valid: false, status: 'error', error: 'code must be a non-empty string' };
    }
    const effectiveKey = options.apiKey ?? apiKey;
    if (!effectiveKey) {
      return {
        valid: false,
        status: 'unauthorized',
        error: 'No apiKey configured — pass apiKey to createClient() or to validate()',
      };
    }

    if (!options.bypassCache) {
      const cached = cache.get(code);
      if (cached) return cached;
    }

    let result: ValidationResponse;
    try {
      result = await withRetry(() => doFetch(code, effectiveKey), {
        maxRetries,
        baseMs: DEFAULT_BACKOFF_BASE_MS,
        capMs: DEFAULT_BACKOFF_CAP_MS,
        jitter: true,
        sleep: sleepImpl,
      });
    } catch (err) {
      // Retries exhausted. Convert the thrown error to a final response.
      const fallback = (err as RetryableError & { fallbackResponse?: ValidationResponse }).fallbackResponse;
      if (fallback) {
        result = fallback;
      } else {
        result = { valid: false, status: 'network', error: redactSecrets(stringifyError(err)) };
      }
    }

    // Only cache successful validations. We deliberately don't cache
    // failures so a transient outage doesn't pin "valid: false" responses
    // in memory.
    if (result.valid) {
      cache.set(code, result);
    }
    return result;
  }

  function invalidate(code: string): void {
    cache.invalidate(code);
  }

  function clearCache(): void {
    cache.clear();
  }

  return { validate, invalidate, clearCache };
}

function mapResponseBody(body: unknown): ValidationResponse {
  if (!body || typeof body !== 'object') {
    return { valid: false, status: 'error', error: 'Empty or non-object response' };
  }
  const b = body as Record<string, unknown>;
  const valid = b.valid === true;
  const rawStatus = typeof b.status === 'string' ? b.status : (valid ? 'active' : 'invalid');
  const status = normalizeStatus(rawStatus);
  const response: ValidationResponse = { valid, status };
  if (typeof b.purchase_id === 'string') response.purchaseId = b.purchase_id;
  if (b.expires_at === null) response.expiresAt = null;
  else if (typeof b.expires_at === 'string') response.expiresAt = b.expires_at;
  if (typeof b.app_access_url === 'string') response.appAccessUrl = b.app_access_url;
  else if (b.app_access_url === null) response.appAccessUrl = null;
  if (typeof b.deal_id === 'string') response.dealId = b.deal_id;
  if (typeof b.error === 'string') response.error = b.error;
  return response;
}

function normalizeStatus(s: string): ValidationStatus {
  switch (s) {
    case 'active':
    case 'invalid':
    case 'unauthorized':
    case 'rate_limited':
    case 'network':
    case 'deal_inactive':
    case 'error':
      return s;
    default:
      return 'invalid';
  }
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'unknown error';
  }
}

/**
 * Defense-in-depth: even though we never serialize the api_key into
 * thrown errors directly, redact any vci_live_* substring from
 * outbound-facing messages so a leaked secret can't reach logs.
 */
function redactSecrets(message: string): string {
  return message.replace(/vci_live_[a-zA-Z0-9_-]+/g, 'vci_live_***');
}
