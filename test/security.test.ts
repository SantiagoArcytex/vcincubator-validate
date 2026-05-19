import { describe, it, expect, vi } from 'vitest';
import { createClient } from '../src/client.js';

/** Mock `fetch` returning the given responses in order; the last repeats. */
function mockFetchSequence(
  responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>,
) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)]!;
    i++;
    return new Response(r.body ? JSON.stringify(r.body) : null, {
      status: r.status,
      headers: r.headers ?? { 'Content-Type': 'application/json' },
    });
  });
}

/**
 * Cache must be isolated per API key. A result validated under one key must
 * never be served from cache to a call presenting a different key — that
 * would bypass per-code-secret auth and leak across tenants on a shared host.
 */
describe('security — cache is isolated per API key', () => {
  it('does not serve a result validated under key A to a call using key B', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 200, body: { valid: true, status: 'active', deal_id: 'A' } },
      { status: 200, body: { valid: false, status: 'invalid' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 60_000,
    });
    const r1 = await client.validate('CODE', { apiKey: 'vci_live_AAA' });
    const r2 = await client.validate('CODE', { apiKey: 'vci_live_BBB' });
    expect(r1.valid).toBe(true);
    expect(r2.valid).toBe(false); // must NOT be the cached valid:true from key A
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('still caches when the same code + key is reused', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'active' } }]);
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'vci_live_SAME',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 60_000,
    });
    await client.validate('CODE');
    await client.validate('CODE');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('invalidate(code) drops the entry regardless of which key cached it', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'active' } }]);
    const client = createClient({
      baseUrl: 'https://x.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 60_000,
    });
    await client.validate('CODE', { apiKey: 'vci_live_K1' });
    client.invalidate('CODE');
    await client.validate('CODE', { apiKey: 'vci_live_K1' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

/** Oversized input must be rejected before it reaches the network or cache. */
describe('security — oversized input is rejected before the network', () => {
  it('rejects a code longer than the max length without calling fetch', async () => {
    const fetchImpl = vi.fn();
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    const r = await client.validate('x'.repeat(10_000));
    expect(r.valid).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

/** A single validate() call must not fan out into an unbounded request burst. */
describe('security — retry amplification is bounded', () => {
  it('caps total upstream calls even when maxRetries is set absurdly high', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 429, body: { error: 'rl' }, headers: { 'Content-Type': 'application/json' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
      maxRetries: 1_000_000,
      _sleepImpl: async () => undefined,
    } as never);
    await client.validate('CODE');
    // initial attempt + at most the hard retry cap (10)
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(11);
  });
});

/** Credentials must never appear in any error string a caller could log. */
describe('security — secrets never leak into error output', () => {
  it('redacts a vci_live_ key echoed back in a network error', async () => {
    const secret = 'vci_live_supersecretvalue123';
    const fetchImpl = vi.fn(async () => {
      throw new Error(`connect ECONNREFUSED using ${secret}`);
    });
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: secret,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
      maxRetries: 0,
    });
    const r = await client.validate('CODE');
    expect(r.status).toBe('network');
    expect(r.error ?? '').not.toContain('supersecretvalue123');
  });

  it('redacts a per-code secret (no vci_live_ prefix) echoed back in an error', async () => {
    const secret = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    const fetchImpl = vi.fn(async () => {
      throw new Error(`TLS handshake error token=${secret}`);
    });
    const client = createClient({
      baseUrl: 'https://x.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
      maxRetries: 0,
    });
    const r = await client.validate('CODE', { apiKey: secret });
    expect(r.error ?? '').not.toContain(secret);
  });
});

/** The mapped response must be internally consistent and free of injectable URLs. */
describe('security — response normalization', () => {
  it('forces status to "active" when upstream says valid:true with a contradictory status', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'invalid' } }]);
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(true);
    expect(r.status).toBe('active');
  });

  it('drops a non-http app_access_url (javascript: payload)', async () => {
    const fetchImpl = mockFetchSequence([
      {
        status: 200,
        body: { valid: true, status: 'active', app_access_url: 'javascript:alert(document.cookie)' },
      },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.appAccessUrl).toBeUndefined();
  });

  it('keeps a normal https app_access_url', async () => {
    const fetchImpl = mockFetchSequence([
      {
        status: 200,
        body: { valid: true, status: 'active', app_access_url: 'https://app.example.com/welcome' },
      },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.appAccessUrl).toBe('https://app.example.com/welcome');
  });
});

/** A hostile response body must not be able to pollute Object.prototype. */
describe('security — prototype pollution', () => {
  it('a __proto__ key in the response body does not pollute Object.prototype', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('{"valid":true,"status":"active","__proto__":{"polluted":true}}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const client = createClient({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    await client.validate('CODE');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
