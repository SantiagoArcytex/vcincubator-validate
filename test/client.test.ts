import { describe, it, expect, vi } from 'vitest';
import { createClient } from '../src/client.js';

/**
 * Build a mock `fetch` that returns the responses in order, one per call.
 * If more calls come than there are responses, the last response is repeated.
 */
function mockFetchSequence(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  let i = 0;
  return vi.fn(async (_url: string, _init?: RequestInit) => {
    const r = responses[Math.min(i, responses.length - 1)]!;
    i++;
    return new Response(r.body ? JSON.stringify(r.body) : null, {
      status: r.status,
      headers: r.headers ?? { 'Content-Type': 'application/json' },
    });
  });
}

describe('createClient.validate — happy path', () => {
  it('returns valid=true with parsed fields on 200 valid:true', async () => {
    const fetchImpl = mockFetchSequence([
      {
        status: 200,
        body: {
          valid: true,
          status: 'active',
          purchase_id: 'p1',
          expires_at: null,
          app_access_url: 'https://app.example.com/welcome',
          deal_id: 'd1',
        },
      },
    ]);
    const client = createClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'd2s_live_x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    const result = await client.validate('CODE-123');
    expect(result.valid).toBe(true);
    expect(result.status).toBe('active');
    expect(result.purchaseId).toBe('p1');
    expect(result.expiresAt).toBe(null);
    expect(result.appAccessUrl).toBe('https://app.example.com/welcome');
    expect(result.dealId).toBe('d1');
  });

  it('POSTs to <baseUrl>/api/validation/verify with the right body', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'active' } }]);
    const client = createClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'd2s_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    await client.validate('CODE-XYZ');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/api/validation/verify');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ code: 'CODE-XYZ', api_key: 'd2s_live_abc' });
  });

  it('handles trailing slash on baseUrl without producing double-slash URL', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'active' } }]);
    const client = createClient({
      baseUrl: 'https://api.example.com/',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    await client.validate('CODE');
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.example.com/api/validation/verify');
  });

  it('per-call apiKey overrides client-level apiKey', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'active' } }]);
    const client = createClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'd2s_live_default',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cacheTtlMs: 0,
    });
    await client.validate('CODE', { apiKey: 'per_code_secret_xyz' });
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ code: 'CODE', api_key: 'per_code_secret_xyz' });
  });
});

describe('createClient.validate — error mapping (never throws)', () => {
  it('returns status="invalid" on 200 valid:false', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 200, body: { valid: false, status: 'invalid', error: 'Invalid or expired redemption code' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('invalid');
  });

  it('returns status="unauthorized" on 401 (no retry)', async () => {
    const fetchImpl = mockFetchSequence([{ status: 401, body: { error: 'API key is required' } }]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0, maxRetries: 5,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('unauthorized');
    expect(fetchImpl).toHaveBeenCalledTimes(1); // no retry on 401
  });

  it('returns status="deal_inactive" when the upstream signals deal inactive', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: false, status: 'deal_inactive', error: 'Deal is no longer active' } }]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('deal_inactive');
  });

  it('returns status="rate_limited" on 429 after exhausting retries', async () => {
    const fetchImpl = mockFetchSequence([{ status: 429, body: { error: 'rate limited' }, headers: { 'Content-Type': 'application/json', 'Retry-After': '1' } }]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0, maxRetries: 2,
      _sleepImpl: async () => undefined,
    } as never);
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('rate_limited');
    expect(fetchImpl).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('returns status="network" on fetch throw', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0, maxRetries: 0,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('network');
  });

  it('returns status="error" on 5xx after exhausting retries', async () => {
    const fetchImpl = mockFetchSequence([{ status: 500, body: { error: 'boom' } }]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0, maxRetries: 1,
      _sleepImpl: async () => undefined,
    } as never);
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('error');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('never throws even on totally malformed response body', async () => {
    const fetchImpl = vi.fn(async () => new Response('not-json', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
  });
});

describe('createClient.validate — caching', () => {
  it('hits the network only once for repeated calls with the same code within TTL', async () => {
    const fetchImpl = mockFetchSequence([{ status: 200, body: { valid: true, status: 'active' } }]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 60_000,
    });
    await client.validate('CODE');
    await client.validate('CODE');
    await client.validate('CODE');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache failed validations', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 200, body: { valid: false, status: 'invalid' } },
      { status: 200, body: { valid: true, status: 'active' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 60_000,
    });
    const r1 = await client.validate('CODE');
    const r2 = await client.validate('CODE');
    expect(r1.valid).toBe(false);
    expect(r2.valid).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('bypassCache option forces a network call', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 200, body: { valid: true, status: 'active' } },
      { status: 200, body: { valid: true, status: 'active', purchase_id: 'updated' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 60_000,
    });
    await client.validate('CODE');
    const r2 = await client.validate('CODE', { bypassCache: true });
    expect(r2.purchaseId).toBe('updated');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('invalidate drops the cached entry so the next call hits the network', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 200, body: { valid: true, status: 'active' } },
      { status: 200, body: { valid: true, status: 'active' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 60_000,
    });
    await client.validate('CODE');
    client.invalidate('CODE');
    await client.validate('CODE');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('clearCache drops everything', async () => {
    const fetchImpl = mockFetchSequence([
      { status: 200, body: { valid: true, status: 'active' } },
      { status: 200, body: { valid: true, status: 'active' } },
    ]);
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 60_000,
    });
    await client.validate('CODE');
    client.clearCache();
    await client.validate('CODE');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('createClient.validate — input guards', () => {
  it('returns status="error" when code is empty', async () => {
    const fetchImpl = vi.fn();
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0,
    });
    const r = await client.validate('');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('error');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns status="error" when code is not a string', async () => {
    const fetchImpl = vi.fn();
    const client = createClient({
      baseUrl: 'https://x.com', apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0,
    });
    // @ts-expect-error - testing runtime guard
    const r = await client.validate(null);
    expect(r.valid).toBe(false);
    expect(r.status).toBe('error');
  });

  it('returns status="unauthorized" when no apiKey is set anywhere', async () => {
    const fetchImpl = vi.fn();
    const client = createClient({
      baseUrl: 'https://x.com',
      fetchImpl: fetchImpl as unknown as typeof fetch, cacheTtlMs: 0,
    });
    const r = await client.validate('CODE');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('unauthorized');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
