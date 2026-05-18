# VCI Seller Integration Guide

Everything you need to validate buyer licenses, react to subscription events, and ship a working integration in under an hour.

**Audience:** developers integrating their app with the VCI marketplace as a seller.
**Status:** MVP (Stripe test mode). All endpoints + signing schemes documented here are stable.

---

## Table of contents

1. [Quickstart (5 minutes)](#1-quickstart-5-minutes)
2. [How licensing works in VCI](#2-how-licensing-works-in-vci)
3. [Authentication: per-app key vs per-code secret](#3-authentication-per-app-key-vs-per-code-secret)
4. [Validation endpoint reference](#4-validation-endpoint-reference)
5. [Rate limits](#5-rate-limits)
6. [Webhooks (outbound to your app)](#6-webhooks-outbound-to-your-app)
7. [`@vcincubator/validate` SDK](#7-vcincubatorvalidate-sdk)
8. [Code snippets (JS, Python, cURL)](#8-code-snippets-js-python-curl)
9. [Status reference](#9-status-reference)
10. [Production checklist](#10-production-checklist)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Quickstart (5 minutes)

You need three things:

1. A **VCI API key** — generate one at `/dashboard/seller/api-keys` (recommended). Looks like `vci_live_<64-hex>`. Store it in your app's server-side secrets — never in client code.
2. The **VCI API base URL** — same host you signed up with (e.g. `https://marketplace.vcinc.ai`).
3. The **buyer's redemption code** — they get it via email after purchase, and it's also visible on their `/dashboard/purchases` page.

Minimal Node.js integration:

```js
// In your app's server-side auth middleware
const response = await fetch(`${VCI_API_BASE}/api/validation/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: req.headers['x-license-code'],
    api_key: process.env.VCI_API_KEY,
  }),
});

const result = await response.json();
if (result.valid) {
  // Grant access. result.deal_id tells you which deal they bought.
} else {
  // Deny. result.status tells you why ('invalid', 'unauthorized', etc).
}
```

That's it — you're integrated. The rest of this doc explains the corners you'll hit.

---

## 2. How licensing works in VCI

```
                                                                   
   ┌────────┐    1. Buy on marketplace    ┌──────────┐             
   │ Buyer  │ ───────────────────────────▶│   VCI    │             
   └────────┘                             │ (Stripe) │             
        │                                 └──────────┘             
        │ 2. Receive code + secret (email + dashboard)             
        ▼                                                          
   ┌────────┐    3. Enter code in your app                         
   │ Buyer  │ ───────────────────────────▶┌────────────┐           
   └────────┘                             │ Your app   │           
                                          │ (server)   │           
                                          └────────────┘           
                                                │                  
                                                │ 4. Validate      
                                                ▼                  
                                          ┌──────────┐             
                                          │   VCI    │             
                                          │ /api/    │             
                                          │ validation│             
                                          └──────────┘             
                                                │                  
                                                │ 5. authorized?   
                                                ▼                  
                                          ┌────────────┐           
                                          │ Your app   │           
                                          │ unlocks /  │           
                                          │ denies     │           
                                          └────────────┘           
```

Key principles:

- **The consumer owns the code.** It's tied to their purchase, not your app. The same buyer can reuse it across re-installs, machines, and sessions. Your job is to validate, not to manage code lifecycle.
- **Validation is read-only.** Calling `POST /api/validation/verify` does NOT consume the code. You can validate as often as you need (subject to rate limits — see §5). Cache the result for a few minutes.
- **VCI is the source of truth for active/revoked state.** When a buyer cancels their subscription or their payment fails, VCI flips their code to `revoked`. Your next validate call returns `valid: false, status: 'revoked'` (collapsed to `'invalid'` in the public response). For real-time revocation, subscribe to webhooks (§6).
- **Stripe is the source of truth for payouts.** VCI handles routing via Stripe Connect; sellers see their payouts in their Stripe Express dashboard.

---

## 3. Authentication: per-app key vs per-code secret

The validation endpoint accepts **either** of two authentication forms in the `api_key` field.

### Per-app key (recommended)

```
vci_live_<64 hex characters>
```

- Issued from `/dashboard/seller/api-keys` in the seller portal.
- One key authorizes validation for any of YOUR deals (or a single deal, if you scope it).
- You control rotation — create new, revoke old.
- The key's hash is stored on the VCI side; the plaintext is shown to you exactly once.
- **Use this in 99% of integrations.**

### Per-code secret (buyer-owned)

```
~64-byte hex string, included in the buyer's confirmation email
```

- Generated per redemption code at purchase time.
- Sent to the buyer (not you) in their confirmation email + visible on their dashboard.
- Useful for apps where the buyer pastes both the code AND its secret into your form (e.g., one-off lifetime-deal redemptions with no recurring auth surface in your app).
- **Don't use this if you can avoid it** — it puts a secret in the buyer's hands and means your app has no key to rotate.

### Which one to send

Just pick one and put it in `api_key`. VCI tries both auth paths and lets you in if either matches:

```json
{ "code": "ASU-...", "api_key": "vci_live_..." }       // per-app
{ "code": "ASU-...", "api_key": "<hex-from-email>" }   // per-code
```

> **Security:** never expose either key in client-side JavaScript. Always call from your server. The SDK enforces this by being a server-only Node package.

---

## 4. Validation endpoint reference

### `POST /api/validation/verify`

The primary endpoint. Use this for every access check.

**Request:**

```json
{
  "code": "string (required)",
  "api_key": "string (required)",
  "app_id": "string (optional, only useful if you pinned app_id to the deal)"
}
```

**Response (always HTTP 200 when authorized; never reveals which codes exist to unauthorized callers):**

```json
{
  "valid": true,
  "status": "active",
  "purchase_id": "uuid",
  "expires_at": null,
  "app_access_url": "https://your-app.com/welcome",
  "deal_id": "uuid"
}
```

**Failure response:**

```json
{ "valid": false, "status": "invalid", "error": "Invalid or expired redemption code" }
```

```json
{ "valid": false, "status": "unauthorized", "error": "Invalid API key" }
```

```json
{ "valid": false, "status": "rate_limited", "error": "Too many failed attempts. Try again in N seconds.", "retryAfter": N }
```

```json
{ "valid": false, "status": "deal_inactive", "error": "Deal is no longer active" }
```

### `GET /api/validation/:code`

Lookup-style alternative. The api_key goes in the `X-API-Key` header instead of the body.

```
GET /api/validation/ASU-ABC123
X-API-Key: vci_live_...
```

Same authorization and rate-limit semantics as POST.

---

## 5. Rate limits

Three layers of protection on the validation endpoint:

| Limit | Quantity | Window | Triggered by |
|---|---|---|---|
| Per IP, total requests | 20 | 15 minutes | Any request from that IP |
| Per code, failed attempts | 5 | 1 hour | Wrong api_key for the same code |
| Per IP, failed attempts | 15 | 1 hour | Cumulative wrong api_keys from that IP |

Exceeding any returns `429 status="rate_limited"`. The `retryAfter` field tells you how long to wait.

### Recommended caching pattern

If you call validate on every request (e.g., from auth middleware), cache the result server-side. The SDK does this for you automatically (5-minute TTL by default). Without caching, an app serving 100 RPS will exhaust 20 req / 15 min in seconds.

If you build your own client:

```js
// Pseudocode
const cache = new Map(); // {code → {result, expiresAt}}

async function validate(code) {
  const cached = cache.get(code);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const result = await fetchVCI(code);
  if (result.valid) {
    cache.set(code, { result, expiresAt: Date.now() + 5 * 60_000 });
  }
  return result;
}
```

Couple this with webhook-driven invalidation (§6) for near-real-time revocation.

---

## 6. Webhooks (outbound to your app)

Register an endpoint at `/dashboard/seller/webhooks` to receive POSTed events when notable things happen to your buyers' codes. This is how you get real-time revocation without polling.

### Event types

| Event | When fired | Payload |
|---|---|---|
| `code.revoked` | Buyer's code was revoked (cancellation, payment failure, refund, manual revoke) | `{ code_id, deal_id, purchase_id, reason? }` |
| `code.reactivated` | A previously revoked code came back to active (payment recovery) | `{ code_id, deal_id, purchase_id }` |
| `subscription.cancelled` | Buyer cancelled their subscription | `{ purchase_id, deal_id, subscription_id, immediately, code_id }` |
| `payment.failed` | Stripe couldn't charge a renewal | `{ purchase_id, deal_id, invoice_id, subscription_id, attempt_count }` |
| `payment.succeeded` | Renewal charge succeeded | `{ purchase_id, deal_id, invoice_id, subscription_id, amount, currency, billing_reason }` |

### Delivery format

```http
POST /your-webhook-url HTTP/1.1
Content-Type: application/json
X-VCI-Signature: t=1700000000,v1=<64-hex-hmac>
User-Agent: VCI-Webhook/1.0

{
  "id": "delivery-uuid",
  "event_id": "event-uuid",
  "event_type": "code.revoked",
  "data": {
    "code_id": "...",
    "deal_id": "...",
    "purchase_id": "...",
    "reason": "payment_failed"
  }
}
```

### Verifying the signature

The signature is `HMAC-SHA256(secret, "${unix_ts}.${raw_request_body}")` — exactly Stripe's scheme.

**Node.js verification:**

```js
import crypto from 'crypto';

function verifyVCISignature(rawBody, header, secret) {
  if (!header) return false;
  const match = header.match(/^t=(\d+),v1=([a-f0-9]+)$/);
  if (!match) return false;
  const [, ts, sig] = match;

  // Reject if older than 5 minutes (defends against replay)
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// In your Express handler — note: use express.raw() not express.json()
app.post('/vci-webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const header = req.headers['x-vci-signature'];
  const secret = process.env.VCI_WEBHOOK_SECRET; // from /dashboard/seller/webhooks

  if (!verifyVCISignature(rawBody, header, secret)) {
    return res.status(401).end();
  }

  const event = JSON.parse(rawBody);
  // ... handle event.event_type and event.data
  // Respond 2xx within 10 seconds, or VCI will retry.
  res.status(204).end();
});
```

### Retry semantics

- VCI expects an HTTP `2xx` response within **10 seconds**.
- On any non-2xx response (or timeout, or network error), VCI retries on this schedule (from the failed attempt):
  - +1 minute → +5 minutes → +30 minutes → +2 hours → +12 hours
  - Total 6 attempts over ~14.5 hours, then the delivery is marked dead.
- After 10 consecutive failures across deliveries, the endpoint is auto-paused. Fix the receiving side, then delete + recreate the endpoint to resume.
- **Idempotency:** the `event_id` field is stable across retries. Dedup on it.

### Acting on events

The most common pattern is invalidating your validation cache when access changes:

```js
const REVOKE_EVENTS = new Set(['code.revoked', 'subscription.cancelled', 'payment.failed']);
const RESTORE_EVENTS = new Set(['code.reactivated', 'payment.succeeded']);

if (REVOKE_EVENTS.has(event.event_type) || RESTORE_EVENTS.has(event.event_type)) {
  // The data.code_id is VCI's internal ID; you cache by the user-supplied
  // code string. Easiest correct option: clear the whole cache.
  vciCache.clear();
}
```

If you build per-user state (sessions, license records), update them here too — that's the whole point.

---

## 7. `@vcincubator/validate` SDK

A tiny TypeScript SDK ships with VCI that wraps everything above (auto-retry on 429/5xx, TTL+LRU cache, type-safe responses, never-throws contract). Zero runtime dependencies.

### Install

```bash
npm install @vcincubator/validate
```

### Use

```ts
import { createClient } from '@vcincubator/validate';

const vci = createClient({
  baseUrl: 'https://marketplace.vcinc.ai',
  apiKey: process.env.VCI_API_KEY!,
});

const result = await vci.validate(userSuppliedCode);
if (result.valid) {
  // result.status === 'active'
  // result.dealId, result.purchaseId, result.appAccessUrl, result.expiresAt
} else {
  // result.status: 'invalid' | 'unauthorized' | 'deal_inactive' |
  //                'rate_limited' | 'network' | 'error'
}
```

### Options

```ts
createClient({
  baseUrl: 'https://marketplace.vcinc.ai',  // required
  apiKey: 'vci_live_...',                  // recommended; can also pass per-call
  cacheTtlMs: 5 * 60 * 1000,               // default 5min; 0 to disable
  maxRetries: 3,                           // retry budget for 429/5xx/network
  timeoutMs: 10_000,                       // per-attempt timeout
  fetchImpl: undefined,                    // inject custom fetch if needed
});
```

### Cache control

```ts
vci.invalidate(code);   // drop one entry (use this on webhook receipt)
vci.clearCache();        // drop everything
```

See the [package README](../README.md) for the full API.

---

## 8. Code snippets (JS, Python, cURL)

### Node.js (raw fetch — if you're not using the SDK)

```js
const response = await fetch(`${BASE}/api/validation/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, api_key: process.env.VCI_API_KEY }),
});
const result = await response.json();
if (result.valid) { /* grant */ } else { /* deny */ }
```

### Python (requests)

```python
import os, requests

response = requests.post(
    f"{BASE}/api/validation/verify",
    json={"code": code, "api_key": os.environ["VCI_API_KEY"]},
    timeout=10,
)
result = response.json()
if result.get("valid"):
    # grant
    pass
else:
    # deny — result["status"] is 'invalid', 'unauthorized', etc.
    pass
```

### Python (httpx, async)

```python
import os, httpx

async with httpx.AsyncClient(timeout=10) as client:
    r = await client.post(
        f"{BASE}/api/validation/verify",
        json={"code": code, "api_key": os.environ["VCI_API_KEY"]},
    )
    result = r.json()
```

### cURL (testing in a shell)

```bash
curl -sS -X POST "$VCI_BASE/api/validation/verify" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"api_key\":\"$VCI_API_KEY\"}" \
  | jq .
```

### Go (net/http)

```go
import (
    "bytes"
    "encoding/json"
    "net/http"
)

type req struct {
    Code   string `json:"code"`
    APIKey string `json:"api_key"`
}
type res struct {
    Valid bool   `json:"valid"`
    Status string `json:"status"`
    DealID string `json:"deal_id,omitempty"`
}

body, _ := json.Marshal(req{Code: code, APIKey: os.Getenv("VCI_API_KEY")})
resp, err := http.Post(base+"/api/validation/verify", "application/json", bytes.NewReader(body))
if err != nil { /* network — deny */ }
defer resp.Body.Close()
var out res
json.NewDecoder(resp.Body).Decode(&out)
if out.Valid { /* grant */ }
```

---

## 9. Status reference

| `status` | `valid` | Meaning | Action |
|---|---|---|---|
| `active` | `true` | Code is currently valid | Grant access |
| `invalid` | `false` | Code doesn't exist, expired, or revoked. Public response is intentionally collapsed to prevent enumeration. | Deny access |
| `unauthorized` | `false` | `api_key` was missing or wrong | Check your VCI_API_KEY env var; never expose in client code |
| `deal_inactive` | `false` | Code is valid but the deal is no longer `live` or `approved` | Deny — let the buyer know the deal has changed |
| `rate_limited` | `false` | Endpoint throttled this request (see §5 for limits) | Wait `retryAfter` seconds and retry; cache responses to avoid hitting limits |
| `network` | `false` | (SDK only) Could not reach VCI | Treat as denied; surface a "service unavailable" message |
| `error` | `false` | 5xx from VCI, or malformed response | Treat as denied; this is rare |

---

## 10. Production checklist

Before going live with real buyers:

- [ ] **API key stored server-side only.** Grep your codebase for `vci_live_` — should only appear in env-var references, never as a literal string.
- [ ] **Caching enabled** (5+ min TTL recommended) so you don't burn rate-limit budget.
- [ ] **Webhook endpoint registered** at `/dashboard/seller/webhooks` and subscribed to `code.revoked`, `subscription.cancelled`, `payment.failed`. Verify signatures on every delivery (§6).
- [ ] **Webhook signing secret stored server-side only** (same care as the API key).
- [ ] **Webhook endpoint URL is HTTPS** (or `localhost` for testing).
- [ ] **Webhook handler responds 2xx within 10s.** Long-running work (DB writes, notifications) happens async after the 2xx is sent.
- [ ] **Cache invalidation on webhook receipt** so a revoked code stops working within seconds, not minutes.
- [ ] **No client-side validation calls** — your buyer's browser must never see your `vci_live_` key.
- [ ] **Error handling never throws** — the SDK guarantees this; if you built your own client, check your code path treats `result.valid === false` cleanly for every status.
- [ ] **Timeout configured** (10s recommended) so a slow VCI response can't stall your middleware.
- [ ] **Tested the full flow against Stripe test mode** before flipping to live keys.

---

## 11. Troubleshooting

**`unauthorized` on every call** — your `api_key` is wrong, the key was revoked, OR you're sending a per-code secret for a different code. Open `/dashboard/seller/api-keys`, verify the key prefix matches what your app is sending (first 12 hex chars after `vci_live_`).

**`rate_limited` during normal traffic** — you're hitting the 20-req-per-15-min-per-IP limit. Add a 5+ minute cache (the SDK does this by default).

**Webhook signature verification fails** — most common cause: you're verifying against the JSON-parsed body. The signature is over the raw request bytes — use `express.raw({ type: 'application/json' })` not `express.json()` for that route.

**Webhook deliveries marked "dead" in your dashboard** — your endpoint failed 6 retries over ~14 hours. Check the response codes in the delivery log (`/dashboard/seller/webhooks` → expand endpoint → see log). Fix the underlying issue, then delete + recreate the endpoint.

**Endpoint flipped to "auto-paused"** — 10 consecutive failures across deliveries. Same recovery path: fix the issue, delete + recreate.

**Code goes `active` → `invalid` mysteriously** — something happened to the buyer's subscription. Check the `code.revoked` webhook payload's `reason` field — most likely `payment_failed`. The buyer can fix this by updating their card on `/dashboard/purchases`.

**Subscription renewals fire but no `code.reactivated` event** — the code wasn't suspended in the first place (payment didn't fail on the prior cycle). `code.reactivated` only fires when transitioning from `revoked` back to `active`.

**Validation rate from your app is suspiciously low** — make sure you're not caching errors. The SDK only caches successes, and you should do the same in custom clients.

---

## Need help?

- Seller dashboard: `/dashboard/seller`
- API keys: `/dashboard/seller/api-keys`
- Webhooks: `/dashboard/seller/webhooks`
- Webhook delivery log (per endpoint): expand endpoint card on the webhooks page
- Direct support: reply to any VCI transactional email, or use the in-platform support form

> Last updated: 2026-05 for MVP launch. Endpoints + signing scheme are stable; SDK is at `v0.1.0`. Live-mode Stripe cutover is a separate phase — the validation/webhook contract does not change.
