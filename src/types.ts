/**
 * Public types for the @vcincubator/validate SDK.
 */

export type ValidationStatus =
  | 'active'
  | 'invalid'
  | 'unauthorized'
  | 'rate_limited'
  | 'network'
  | 'deal_inactive'
  | 'error';

export interface ValidationResponse {
  /** True only when the VCI validation endpoint confirms the code is valid. */
  valid: boolean;
  /** Coarse classification of the result. See {@link ValidationStatus}. */
  status: ValidationStatus;
  /** Stable purchase identifier — present on successful validation. */
  purchaseId?: string;
  /** ISO timestamp when the code expires, or null for non-expiring codes. */
  expiresAt?: string | null;
  /** Deep-link URL the seller's app may use to onboard the buyer. */
  appAccessUrl?: string | null;
  /** The marketplace deal the code belongs to. */
  dealId?: string;
  /** Human-readable description of the failure. Never contains secrets. */
  error?: string;
}

export interface ClientOptions {
  /**
   * VCI Marketplace API base URL, e.g. `https://marketplace.vcinc.ai`.
   * The SDK appends `/api/validation/verify` to this.
   */
  baseUrl: string;
  /**
   * API key sent with every validate call.
   *
   * Two valid forms:
   *  - **per-app key** (recommended): `vci_live_<hex>` issued from your
   *    seller dashboard. You control rotation.
   *  - **per-code secret**: the `validation_api_secret` VCI sent to the
   *    buyer in their confirmation email. The buyer hands it to your app.
   *
   * Can be overridden on a per-call basis via {@link ValidateOptions.apiKey}.
   */
  apiKey?: string;
  /**
   * Memoize successful validation results for this many milliseconds.
   *
   * Default: 5 minutes (300_000). Set to 0 to disable caching entirely.
   * Recommended for high-frequency callers (auth middleware on every
   * request) to stay under the public rate limit (20 req per 15 min per IP).
   */
  cacheTtlMs?: number;
  /**
   * Maximum number of retries for 429 / 5xx / network errors. Initial
   * attempt does not count. Default: 3 (so up to 4 total attempts).
   */
  maxRetries?: number;
  /**
   * Per-attempt timeout in milliseconds. Default: 10_000.
   */
  timeoutMs?: number;
  /**
   * Inject a `fetch`-compatible implementation. Defaults to `globalThis.fetch`.
   * Useful for testing or for environments where `fetch` is unavailable
   * (older Node, edge runtimes with restricted globals).
   */
  fetchImpl?: typeof fetch;
}

export interface ValidateOptions {
  /** Override the client-level apiKey for this call only. */
  apiKey?: string;
  /** Skip the cache lookup and force a network call. */
  bypassCache?: boolean;
}

export interface ValidationClient {
  /**
   * Validate a buyer-supplied redemption code against the VCI endpoint.
   *
   * Returns `{ valid: true, status: 'active', ... }` on success or
   * `{ valid: false, status: <reason>, error: <msg> }` on any failure.
   * NEVER throws — network/HTTP/parse errors are reported via the
   * `status` field so seller integration code can branch cleanly.
   */
  validate(code: string, options?: ValidateOptions): Promise<ValidationResponse>;

  /** Drop the cached result for `code` so the next validate hits the API. */
  invalidate(code: string): void;

  /** Wipe the entire cache. */
  clearCache(): void;
}
