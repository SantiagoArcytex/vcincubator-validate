# VCI Integration — Code Reference

Copy-paste-ready patterns for the `vci-validate-integration` skill. Use the
section that matches the stack you detected. Adapt variable names to fit the
project's conventions.

All examples assume:
```
VCI_API_BASE=https://marketplace.vcinc.ai
VCI_API_KEY=vci_live_...
```

---

## Shared client

Create one client module, import it everywhere. Don't create a client per request.

```js
// lib/vci.js  (or .ts)
import { createClient } from '@vcincubator/validate';

export const vci = createClient({
  baseUrl: process.env.VCI_API_BASE,
  apiKey: process.env.VCI_API_KEY,
  cacheTtlMs: 5 * 60 * 1000, // cache valid results 5 min — stays under rate limits
});
```

---

## Express

### Validation route + middleware

```js
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { vci } from './lib/vci.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// In-memory sessions (use a DB / store in production)
const sessions = new Map();

// The buyer submits their code here
app.post('/activate', async (req, res) => {
  const code = (req.body.code || '').trim();
  const result = await vci.validate(code);
  if (!result.valid) {
    return res.status(403).send(`Access denied: ${result.status}`);
  }
  const sid = crypto.randomUUID();
  sessions.set(sid, { code, dealId: result.dealId });
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/app');
});

// Gate the protected part of the app
function requireLicense(req, res, next) {
  const session = sessions.get(req.cookies.sid);
  if (!session) return res.redirect('/activate');
  next();
}

app.get('/app', requireLicense, (req, res) => {
  res.send('Unlocked.');
});
```

For a stricter gate, re-validate inside `requireLicense` (cheap — the SDK
caches): `const r = await vci.validate(session.code); if (!r.valid) { ... }`.

---

## Next.js — App Router

### Server action or route handler

```ts
// app/api/activate/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { vci } from '@/lib/vci';

export async function POST(req: Request) {
  const { code } = await req.json();
  const result = await vci.validate(code);
  if (!result.valid) {
    return NextResponse.json({ ok: false, status: result.status }, { status: 403 });
  }
  // Set a signed session cookie / create a license record keyed to result.purchaseId
  cookies().set('vci_licensed', '1', { httpOnly: true, sameSite: 'lax' });
  return NextResponse.json({ ok: true, dealId: result.dealId });
}
```

Gate pages with a server component check or middleware that reads the cookie.
The `vci` client and `validate()` call MUST stay in server code (route
handlers, server components, server actions) — never in a Client Component.

---

## Next.js — Pages Router

```ts
// pages/api/activate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { vci } from '../../lib/vci';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const result = await vci.validate(req.body.code);
  if (!result.valid) {
    return res.status(403).json({ ok: false, status: result.status });
  }
  res.setHeader('Set-Cookie', 'vci_licensed=1; HttpOnly; SameSite=Lax; Path=/');
  res.json({ ok: true, dealId: result.dealId });
}
```

---

## No SDK (raw fetch fallback)

If for some reason the package can't be used, the raw call is simple:

```js
const response = await fetch(`${process.env.VCI_API_BASE}/api/validation/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, api_key: process.env.VCI_API_KEY }),
});
const result = await response.json(); // { valid, status, deal_id, ... }
```

Prefer the SDK — it adds retries, caching, and timeouts.

---

## Status handling

Map `result.status` to a user-facing message:

```js
const MESSAGES = {
  invalid: 'That code is invalid, expired, or has been revoked.',
  unauthorized: 'This app is misconfigured — contact the developer.',
  deal_inactive: 'This product is no longer available.',
  rate_limited: 'Too many attempts. Wait a minute and try again.',
  network: 'Could not reach the license server. Try again shortly.',
  error: 'Something went wrong. Try again shortly.',
};
```

`unauthorized` almost always means a bad/missing `VCI_API_KEY`.

---

## Webhooks (optional — real-time revocation)

### Receiver route (Express)

The signature is computed over the RAW request bytes. Use a raw body parser
for this route — NOT `express.json()`.

```js
import crypto from 'node:crypto';

app.post('/vci-webhooks', express.raw({ type: '*/*' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const header = req.headers['x-vci-signature'];
  const secret = process.env.VCI_WEBHOOK_SECRET;

  if (!verifyVciSignature(rawBody, header, secret)) {
    return res.status(401).end();
  }

  const event = JSON.parse(rawBody);
  // event.event_type: code.revoked | code.reactivated | subscription.cancelled
  //                   | payment.failed | payment.succeeded
  if (['code.revoked', 'subscription.cancelled', 'payment.failed'].includes(event.event_type)) {
    vci.clearCache();        // next validate() re-checks against VCI
    // ...also revoke the affected user's session if you track it
  }

  res.status(204).end(); // respond fast — heavy work goes after this line
});

function verifyVciSignature(rawBody, header, secret) {
  if (typeof header !== 'string') return false;
  const m = header.match(/^t=(\d+),v1=([a-f0-9]+)$/);
  if (!m) return false;
  const ts = Number(m[1]);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false; // reject stale (>5 min)
  const expected = crypto.createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`).digest('hex');
  const a = Buffer.from(m[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

### Receiver (Next.js App Router)

```ts
// app/api/vci-webhooks/route.ts
import crypto from 'node:crypto';
import { vci } from '@/lib/vci';

export async function POST(req: Request) {
  const rawBody = await req.text();           // raw bytes — do NOT req.json() first
  const header = req.headers.get('x-vci-signature');
  if (!verifyVciSignature(rawBody, header, process.env.VCI_WEBHOOK_SECRET)) {
    return new Response(null, { status: 401 });
  }
  const event = JSON.parse(rawBody);
  if (['code.revoked', 'subscription.cancelled', 'payment.failed'].includes(event.event_type)) {
    vci.clearCache();
  }
  return new Response(null, { status: 204 });
}
// verifyVciSignature: same function as the Express example above
```

### After adding the receiver

Tell the user:
1. Deploy the app so the webhook URL is publicly reachable (for local testing,
   use `ngrok http <port>`).
2. Register `https://<their-domain>/vci-webhooks` at the VCI seller dashboard →
   Settings → Webhooks.
3. Copy the signing secret VCI shows them into `.env` as `VCI_WEBHOOK_SECRET`.
4. Use the "Test" button on the dashboard to fire a sample event and confirm
   the receiver logs it.

---

## Event payloads

| `event_type` | When | `data` fields |
|---|---|---|
| `code.revoked` | Access pulled (cancel / payment fail / refund) | `code_id, deal_id, purchase_id, reason` |
| `code.reactivated` | Access restored after a recovered payment | `code_id, deal_id, purchase_id` |
| `subscription.cancelled` | Buyer cancelled | `purchase_id, deal_id, subscription_id, immediately` |
| `payment.failed` | A renewal charge failed | `purchase_id, deal_id, invoice_id, attempt_count` |
| `payment.succeeded` | A renewal charge succeeded | `purchase_id, deal_id, invoice_id, amount` |

Every webhook request body is `{ id, event_id, event_type, data }`. The
`event_id` is stable across retries — dedupe on it if you do non-idempotent work.
