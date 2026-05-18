import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TtlCache } from '../src/cache.js';

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('get returns null for missing key', () => {
    const cache = new TtlCache<string>({ ttlMs: 1000, maxEntries: 10 });
    expect(cache.get('missing')).toBe(null);
  });

  it('set + get within TTL returns the stored value', () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 10 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
  });

  it('get returns null after TTL expires', async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>({ ttlMs: 1000, maxEntries: 10 });
    cache.set('k', 'v');
    vi.advanceTimersByTime(999);
    expect(cache.get('k')).toBe('v');
    vi.advanceTimersByTime(2);
    expect(cache.get('k')).toBe(null);
  });

  it('respects ttlMs override on set', async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 10 });
    cache.set('k', 'v', { ttlMs: 500 });
    vi.advanceTimersByTime(501);
    expect(cache.get('k')).toBe(null);
  });

  it('ttlMs:0 means disabled — set is a no-op, get always returns null', () => {
    const cache = new TtlCache<string>({ ttlMs: 0, maxEntries: 10 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe(null);
  });

  it('evicts the oldest entry when maxEntries is exceeded', () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 3 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    expect(cache.get('a')).toBe('1');
    cache.set('d', '4'); // forces eviction of 'a' (oldest insertion)
    expect(cache.get('a')).toBe(null);
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
    expect(cache.get('d')).toBe('4');
  });

  it('invalidate removes the entry immediately', () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 10 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    cache.invalidate('k');
    expect(cache.get('k')).toBe(null);
  });

  it('clear wipes all entries', () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 10 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBe(null);
    expect(cache.get('b')).toBe(null);
  });

  it('re-setting a key updates the value AND the insertion order for eviction', () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('a', '1-updated'); // 'a' is now the most-recently inserted
    cache.set('c', '3'); // evicts 'b' (oldest), NOT 'a'
    expect(cache.get('a')).toBe('1-updated');
    expect(cache.get('b')).toBe(null);
    expect(cache.get('c')).toBe('3');
  });

  it('size returns the current entry count', () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 10 });
    expect(cache.size).toBe(0);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size).toBe(2);
    cache.invalidate('a');
    expect(cache.size).toBe(1);
  });
});
