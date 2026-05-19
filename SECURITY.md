# Security Policy

`@vcincubator/validate` gates paid access for the apps that depend on it, so we
take security reports seriously.

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.1.x` | ✅ |

Always run the latest published version — `npm install @vcincubator/validate@latest`.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Report privately, either:

- **GitHub** → the repository's **Security → Report a vulnerability** tab
  (private advisory), or
- **Email** → security@arcytex.com

Please include: affected version, a description, and a minimal reproduction if
possible. We aim to acknowledge within 3 business days and to ship a fix or a
mitigation plan within 14 days for confirmed issues.

## Scope

In scope: the published package — the SDK (`src/`), the CLI (`bin/`), and the
bundled skill (`skill/`).

Out of scope: the VCI Marketplace API itself, and how a consuming application
*uses* a validation result (e.g. session handling, redirect logic).

## Design notes for integrators

- The SDK is **server-only**. Never ship your `vci_live_` key or a per-code
  secret to a browser.
- `validate()` **never throws** — every failure maps to `{ valid: false }`.
  Treat any non-`valid` result as "deny access".
- Successful results are cached in memory, **keyed on `(code, apiKey)`** — a
  result authorized under one key is never served to a call using another.
- The SDK does not, and cannot, rate-limit a brute-force attacker on its own;
  abuse defense is enforced by the VCI API. Don't disable that expectation by
  retrying failed validations in a tight loop.
