/**
 * Tiny TTL+LRU cache. Backs the SDK's optional in-memory memoization of
 * successful validate() responses so high-frequency callers (auth middleware
 * on every request) don't melt their VCI rate-limit budget.
 *
 * - Per-entry expiry via `set(key, value, { ttlMs })` or default TTL.
 * - Bounded by `maxEntries`; oldest-inserted entry is evicted on overflow.
 * - `ttlMs: 0` at construction disables the cache (set is a no-op).
 */

export interface TtlCacheOptions {
  ttlMs: number;
  maxEntries: number;
}

interface Entry<V> {
  value: V;
  expiresAt: number; // Date.now() when this entry becomes invalid
}

export class TtlCache<V> {
  private readonly map = new Map<string, Entry<V>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor({ ttlMs, maxEntries }: TtlCacheOptions) {
    this.defaultTtlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  /** Lookup. Returns null when missing OR expired (and evicts expired). */
  get(key: string): V | null {
    if (this.defaultTtlMs === 0) return null;
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Store. When the cache is disabled (defaultTtlMs=0) this is a no-op.
   * When `maxEntries` is exceeded, the oldest-inserted entry is evicted.
   * Re-setting an existing key bumps it to "newest" (Map insertion order
   * is reset by delete+set).
   */
  set(key: string, value: V, opts: { ttlMs?: number } = {}): void {
    if (this.defaultTtlMs === 0) return;
    const ttl = opts.ttlMs ?? this.defaultTtlMs;
    if (ttl <= 0) return;
    if (this.map.has(key)) {
      this.map.delete(key); // ensure re-insertion at the end (LRU order)
    } else if (this.map.size >= this.maxEntries) {
      // Evict the oldest-inserted entry. Map preserves insertion order.
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttl });
  }

  invalidate(key: string): void {
    this.map.delete(key);
  }

  /** Delete every entry whose key satisfies `predicate`. */
  deleteMatching(predicate: (key: string) => boolean): void {
    for (const key of this.map.keys()) {
      if (predicate(key)) this.map.delete(key);
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
