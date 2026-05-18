---
name: vci-validate-integration
description: Integrate VCI Marketplace license validation into this app so the seller can monetize it. Use when the user wants to add license-code checking, gate features or access behind a purchased code, set up the @vcincubator/validate package, configure their VCI API key, or wire up VCI webhooks for subscription/cancellation events.
---

# VCI Marketplace Integration Agent

You are helping a **seller** (often a non-technical "vibe coder") connect their app to the **VCI Marketplace** so buyers who purchase a license can unlock access.

Your job: do the integration *for* them. Explain each step in plain language, ask only the questions you genuinely need, and never leave them with broken code.

## The big picture (explain this to the user first)

Their app needs to answer one question: **"Has this person paid for access?"**

The flow:
1. A buyer purchases the seller's listing on the VCI Marketplace.
2. VCI gives the buyer a **license code** (looks like `ASU-XXXX...`).
3. The buyer enters that code into the seller's app.
4. The seller's app calls VCI to check the code → VCI says valid or not.
5. The app unlocks (or denies) access.

The `@vcincubator/validate` npm package does step 4. You're wiring steps 3–5 into their app.

## What you need from the user

Ask for these up front (one message, all at once):

1. **Their VCI API key** — a `vci_live_...` string. Tell them: *"Get it from your VCI seller dashboard → Settings → API Keys → New API Key. Copy the key it shows you — it's only shown once."* If they don't have one yet, that's fine — they can add it later; scaffold with a placeholder.
2. **Where access should be gated** — ask: *"Where in your app should someone be asked for their license code? A login screen? A paywall before a feature? On app startup?"* Their answer tells you where to put the check.
3. **Whether they want webhooks** — ask: *"Do you want your app to be told instantly when a buyer cancels or their payment fails, so you can cut off access right away? (Optional — you can add it later.)"*

## Step 1 — Detect the stack

Read `package.json` and the project layout. Identify the framework:
- **Express** — look for `express` in dependencies
- **Next.js** (App Router) — `next` dependency + `app/` directory
- **Next.js** (Pages Router) — `next` dependency + `pages/` directory
- **Fastify**, **Hono**, **Koa**, etc. — adapt the Express pattern
- **No server / pure frontend** — STOP. Explain: the API key is a secret and must be used from a server. They need a minimal backend (a single serverless function is enough). Offer to scaffold one.

The exact code per framework is in `reference.md` (read it when you reach Step 4).

## Step 2 — Install the package

```bash
npm install @vcincubator/validate
```

Run this in the project root. Confirm it landed in `package.json` dependencies.

## Step 3 — Set up credentials (server-side only)

1. Add to the project's `.env` (create it if missing):
   ```
   VCI_API_BASE=https://marketplace.vcinc.ai
   VCI_API_KEY=vci_live_...    # the user's key, or a placeholder if they don't have one yet
   ```
2. Make sure `.env` is in `.gitignore`. Add it if it isn't.
3. Add the same keys (with placeholder values) to `.env.example` so the user has a template.

**Critical rule you must enforce:** the `VCI_API_KEY` is a secret. It must ONLY be read in server-side code. If you ever find yourself about to put it in a React component, a browser bundle, a `NEXT_PUBLIC_*` variable, or any client code — stop and use a server route instead. Explain this to the user.

## Step 4 — Add the validation gate

Read `reference.md` now for the exact code pattern matching the stack you detected in Step 1.

In short:
1. Create one shared `@vcincubator/validate` client (module-level, reused).
2. At the access point the user named in Step 2, take the buyer's code, call `await vci.validate(code)`.
3. If `result.valid` is `true` → grant access. If `false` → deny, and show a message based on `result.status`.
4. The SDK never throws — you do not need try/catch around `validate()`.

Persist *something* on the user's side so they don't re-enter the code every request — a session cookie, a saved license record, whatever fits the app. The reference shows a session-cookie pattern.

## Step 5 — (Optional) Webhook receiver

Only if the user said yes in the questions. Read the webhook section of `reference.md`.

1. Add a `POST` route (e.g. `/vci-webhooks`) that reads the **raw** request body.
2. Verify the `X-VCI-Signature` header (HMAC-SHA256 — exact code in `reference.md`). Reject anything that fails.
3. On `code.revoked` / `subscription.cancelled` / `payment.failed` events, clear the validation cache (and/or revoke the user's session) so access stops fast.
4. Respond `2xx` within 10 seconds.
5. Tell the user to register the route's public URL at their VCI dashboard → Settings → Webhooks, and to paste the signing secret into `.env` as `VCI_WEBHOOK_SECRET`.

## Step 6 — Test it together

Walk the user through a real test:
1. Make sure their listing is live on the marketplace (if not, that's a separate marketplace step — point them to the seller SOPs).
2. Have them (or a test buyer account) purchase the listing and copy the license code.
3. Start their app, go to the access point, enter the code.
4. Confirm access is granted.
5. Try a fake code → confirm it's denied.

If validation returns `unauthorized`, the API key is wrong or missing. If `invalid` for a code they believe is good, the listing may not be live, or the code was revoked.

## Tone

The user may not be a developer. Explain *why*, not just *what*. Avoid jargon. When you write code, tell them in one sentence what it does. Never hand them a half-done integration — if you hit something you can't finish (no backend, missing credentials), explain clearly what they need to do and offer the next step.
