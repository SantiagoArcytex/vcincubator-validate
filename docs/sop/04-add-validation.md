# Stage 4 — Adding Validation to Your App

*Part of the [VCI Marketplace seller guide](./00-overview.md). About 20–40 minutes.*

This is the one stage with code. Don't worry — you won't write it. We give you an AI assistant that does the whole integration for you. Your job is to run two commands and answer a few questions.

## What "validation" means

Your app needs to check: *"Has this person actually bought access?"*

VCI gives you a tiny tool called **`@vcincubator/validate`**. You add it to your app, and it does exactly that check — your app asks VCI, VCI answers yes or no.

## Before you start

You need:
- Your app's code on your computer (the project folder)
- **Claude Code** installed — this is the AI assistant that does the integration. If you built your app with AI, you may already have it. If not, install it (free): see [claude.com/claude-code](https://claude.com/claude-code).
- About 20–40 minutes

## Part A — Get your VCI API key

Your app proves it's *your* app using an **API key** — a secret password. Get it first:

1. Log in to **[marketplace.vcinc.ai](https://marketplace.vcinc.ai)**.
2. Go to your seller area → **Settings → API Keys** (or the **API Keys** page).
3. Click **New API Key**. Give it a name like `My App`.
4. VCI shows you a key that starts with **`vci_live_`**. **Copy it now and save it somewhere safe** — it's shown only once.

> **Treat this key like a password.** Anyone with it can validate codes as you. You'll put it somewhere safe (not in your app's public code) — the assistant handles that correctly.

If you lose the key, no problem — just delete it and make a new one.

## Part B — Install the helper tool

Open a terminal in your app's project folder and run these two commands:

```bash
npm install @vcincubator/validate
```

```bash
npx vci-validate init
```

The first command adds the `@vcincubator/validate` tool to your app.
The second command installs a **VCI integration assistant** into your project (it goes into a `.claude/skills/` folder). This assistant knows exactly how to wire VCI into your app.

**How to know it worked:** the second command prints `✓ VCI integration skill installed` and tells you what to do next.

## Part C — Let the assistant do the integration

1. Open **Claude Code** in your app's project folder (run `claude` in the terminal, or open it in your code editor).
2. Type this and send it:

   > **Set up VCI license validation in my app**

3. The assistant takes over. It will:
   - Look at how your app is built
   - Ask you a few simple questions (have your `vci_live_` key from Part A ready)
   - Add the code that checks license codes
   - Set up your secret key safely (server-side, never exposed)
   - Optionally add the "instant updates" feature (more on that below)

4. **Answer its questions in plain language.** It will ask things like *"Where in your app should someone enter their license code?"* — just tell it (e.g. "on the login page" or "I want a new page for it").

5. When it's done, it tells you. It may also help you test it right then.

> **You stay in control.** The assistant explains what it's doing. If anything is unclear, just ask it — "what does this do?" or "explain that". It's there to help, not to rush you.

## Part D — The "instant updates" feature (optional but recommended)

Normally your app checks with VCI every few minutes. That's fine. But if you want your app to know *the instant* a buyer cancels or their payment fails — so you can cut off access immediately — VCI can send your app a live notification. This is called a **webhook**.

The assistant in Part C will ask if you want this. If you say yes:

1. The assistant adds a small "receiver" to your app.
2. You then register your app's address in VCI: seller area → **Settings → Webhooks → New Endpoint**.
3. VCI gives you a **signing secret** — paste it where the assistant tells you.
4. Use the **Test** button on the Webhooks page to send a sample event and confirm your app receives it.

If you skip this now, you can add it later — your app still works fine without it.

## Part E — Fill in the "enter your code" URL on your listing

Remember the **"Enter your code" URL** field from Stage 2's wizard? Now that your app has that page (the assistant created it), go back to your listing draft and fill in its address.

This is the page VCI points buyers to after they purchase.

## Part F — Test it for real

Confirm the whole loop works before you rely on it:

1. Make sure your listing is **live** (approved by VCI — see Stage 2). If it's not live yet, you can still test once it is.
2. Get a real license code: either buy your own listing with a test card (VCI support provides test card numbers), or have a teammate do it.
3. Open your app, go to the "enter your code" page, paste the code.
4. ✅ Access should unlock.
5. Try a made-up code like `ABC-FAKE`. ❌ It should be denied.

If both work, your integration is solid.

## How to know this stage is done

- [ ] You created a `vci_live_` API key and saved it
- [ ] You ran `npm install @vcincubator/validate` and `npx vci-validate init`
- [ ] The assistant added validation to your app and you tested it
- [ ] A real code unlocks access; a fake code is denied
- [ ] Your listing's "enter your code" URL is filled in

**Next:** [Stage 5 — Your dashboard & earnings](./05-your-dashboard.md) — watch the sales come in.

---

### If something goes wrong

**"npm: command not found"** — `npm` comes with Node.js. Install Node.js from [nodejs.org](https://nodejs.org) (the "LTS" version), then try again.

**The assistant says my app has "no server side"** — Many AI-built apps are frontend-only. The API key is a secret and can't live in a browser, so your app needs a small server piece. The assistant explains how and can scaffold it. This is normal — let it guide you.

**Validation always says "unauthorized"** — Your API key is wrong, missing, or was revoked. Go to Settings → API Keys, check the key your app is using matches, or make a fresh one.

**A code I think is valid gets denied** — Two common reasons: (1) your listing isn't live yet — codes only work for live listings; (2) the buyer's subscription was cancelled or their payment failed, which revokes the code. Check the listing status and the buyer's purchase.

**I lost my API key** — No problem. Settings → API Keys → delete the old one → create a new one → update your app with the new key (ask the assistant: "update my VCI API key").

**I want to change the integration later** — Open Claude Code and ask. The assistant is still installed in your project; it can adjust things, add webhooks, or explain what's there.
