# @vcincubator/validate

Validate **VCI Marketplace** license codes from your app.

Tiny (zero runtime dependencies), TypeScript-native, with auto-retry, in-memory caching, and a never-throws API so your auth code never has to wrap calls in try/catch.

If you sell your app on the VCI Marketplace, this is how your app checks that a buyer's code is real and still paid-for.

## Install

```bash
npm install @vcincubator/validate
```

## Quickstart

```ts
import { createClient } from '@vcincubator/validate';

const vci = createClient({
  baseUrl: 'https://marketplace.vcinc.ai',
  apiKey: process.env.VCI_API_KEY,   // your API key from the seller dashboard
});

const result = await vci.validate(userSuppliedCode);

if (result.valid) {
  // status is 'active' — grant access
  console.log('Welcome — deal', result.dealId);
} else {
  // result.status: 'invalid' | 'unauthorized' | 'deal_inactive' |
  //                'rate_limited' | 'network' | 'error'
  console.warn(`Denied: ${result.status} — ${result.error}`);
}
```

The SDK **never throws**. Every failure mode — bad code, expired, revoked, rate-limited, network down — maps to a `valid: false` response with a meaningful `status`.

## Let Claude do the integration for you

`@vcincubator/validate` ships with a Claude Code skill. Run this once in your project:

```bash
npx vci-validate init
```

It installs an integration skill into `.claude/skills/vci-validate/`. Then open Claude Code in your project and say:

> "Set up VCI license validation in my app"

Claude will install the package (if needed), wire the validation check into your app's access gate, set up your environment variables, and optionally add a webhook receiver — following the skill step by step.

## Authentication

Your `apiKey` is a `vci_live_...` key. Generate it in the seller dashboard at **Settings → API Keys**.

> **Always** read the key from a server-side environment variable. **Never** put it in client-side/browser code — it's a secret.

## Options

```ts
const vci = createClient({
  baseUrl: 'https://marketplace.vcinc.ai',  // required
  apiKey: 'vci_live_...',                   // your key
  cacheTtlMs: 5 * 60 * 1000,                // default 5min; 0 disables caching
  maxRetries: 3,                            // default 3 retries on 429/5xx/network
  timeoutMs: 10_000,                        // default 10s per attempt
});
```

### Per-call overrides

```ts
// Override the apiKey for this call (e.g. when a buyer pastes their per-code secret)
await vci.validate(code, { apiKey: buyerSuppliedSecret });

// Force a fresh network call, bypassing the cache
await vci.validate(code, { bypassCache: true });
```

### Cache control

```ts
vci.invalidate(code);   // drop one cached entry
vci.clearCache();        // drop everything
```

## Recommended pattern

For an access check on every request, keep the cache on (the default). A 5-minute TTL means at most 12 round-trips per code per hour — well under the rate limit.

```ts
// Express middleware example
app.use(async (req, res, next) => {
  const code = req.headers['x-license-code'];
  if (!code) return res.status(401).json({ error: 'No license code' });

  const result = await vci.validate(code);
  if (!result.valid) {
    return res.status(403).json({ error: 'Access denied', status: result.status });
  }
  req.license = result;
  next();
});
```

## Status reference

| `status` | `valid` | Meaning |
|---|---|---|
| `active` | `true` | Code is valid right now. Grant access. |
| `invalid` | `false` | Code doesn't exist, expired, or was revoked. |
| `unauthorized` | `false` | Your apiKey is missing or wrong. |
| `deal_inactive` | `false` | Code is real, but the listing isn't live anymore. |
| `rate_limited` | `false` | VCI throttled the request. The SDK already retried before giving up. |
| `network` | `false` | Could not reach VCI. |
| `error` | `false` | VCI returned a 5xx or unparseable response. SDK already retried. |

## TypeScript

```ts
import type {
  ClientOptions,
  ValidateOptions,
  ValidationResponse,
  ValidationStatus,
} from '@vcincubator/validate';
```

## Documentation

- [`docs/integration.md`](docs/integration.md) — integration guide: endpoints, auth, webhooks, code snippets
- [`docs/sop/`](docs/sop/) — step-by-step seller setup guides
- [`SECURITY.md`](SECURITY.md) — vulnerability disclosure policy
- [`skill/`](skill/) — the Claude Code integration skill (`npx vci-validate init`)

## Security

The SDK is **server-only** — never expose a `vci_live_` key or per-code secret
to a browser. Cached results are isolated per API key. Report vulnerabilities
privately per [`SECURITY.md`](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).

