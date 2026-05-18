# Stage 1 — Prerequisites & Account Setup

*Part of the [VCI Marketplace seller guide](./00-overview.md). About 15 minutes.*

Before you list anything, let's make sure you have what you need and get your seller account created.

## Part A — The checklist: do you have these?

Go through this list. If you can tick all of them, you're ready.

### Your app

- [ ] **Your app is built and working.** It's deployed somewhere with a real web address (a URL people can visit). It doesn't matter where it's hosted.
- [ ] **Your app has a place where someone could enter a code.** This can be a box on a login screen, a settings page, a "redeem" page — anywhere. If it doesn't have one yet, don't worry: Stage 4's AI assistant can add it for you.
- [ ] **You (or your AI assistant) can change your app's code a little.** In Stage 4 you'll add a small piece. It's about 10–20 lines and the assistant writes it.
- [ ] **Your app has a back-end / server side.** Even a small one. If your app is *only* a webpage with no server at all, you'll need to add a tiny server piece — the Stage 4 assistant explains how. (This is because the connection to VCI uses a secret key that must never be visible in a browser.)

### For getting paid

- [ ] **A bank account** in a [country Stripe supports](https://stripe.com/global). This is where your earnings land.
- [ ] **Basic identity info.** Stripe (our payments partner) has to verify who you are — this is a legal requirement, not a VCI thing. You'll need your legal name, address, date of birth, and possibly a photo of an ID. Have these handy for Stage 3.

### For the listing itself

- [ ] **An email address** you check regularly. This is your seller login and where sale notifications go.
- [ ] **Images of your app.** A logo, a cover image, and a few screenshots. Stage 2 lists the exact sizes — you don't need them right now, just know you'll need them.

If anything above is missing, sort it out before continuing. The most common gap is "my app has no server side" — if that's you, it's fixable, and Stage 4 walks you through it.

## Part B — Create your seller account

1. Go to **[marketplace.vcinc.ai](https://marketplace.vcinc.ai)**.
2. Click **Sign Up**.
3. Enter your email and a password.
4. Check your inbox for a verification email from VCI Marketplace and click the link inside.
5. You're now logged in.

**How to know it worked:** you can see your dashboard after logging in. If you see a "verify your email" message, you haven't clicked the link in the email yet — check your inbox (and spam folder).

## Part C — Become a seller

A fresh account can browse and buy. To *sell*, you accept the seller terms once.

1. From your dashboard, look for **"Start selling"**, **"Become a seller"**, or go to the **seller area** (often under "My Apps" or "Seller").
2. Read and accept the **Seller Terms of Service**.
3. You'll now see the seller tools: your apps, listings, payouts, and settings.

**How to know it worked:** you can see a seller dashboard with options to create a listing. If you only see buyer features (marketplace, purchases), you haven't accepted the seller terms yet.

## Part D — A quick note on test mode vs. real money

During this launch period, VCI runs payments in **test mode**. That means:

- You can go through the *entire* process — list, connect Stripe, get test "purchases" — without real money moving.
- Test purchases use fake card numbers (VCI support can give you these).
- This lets you confirm everything works before real buyers arrive.

When VCI switches on live payments, your listing and integration don't change — only the payment keys do, and VCI handles that. **Nothing you set up now gets thrown away.**

## You're done with Stage 1

You have a seller account, you've accepted the seller terms, and you know what you'll need.

**Next:** [Stage 2 — Preparing your app & listing](./02-app-and-listing-prep.md) — gather everything the listing wizard will ask for.

---

### If something goes wrong

**No verification email** — wait 2 minutes, check spam. Still nothing? Try signing up again, or contact support.

**"My app has no server side"** — Many AI-built apps are "frontend only." That's fine — you'll add a minimal server piece in Stage 4, and the assistant walks you through it. It can be a single small file. Don't let this block you now.

**I'm not sure my country is supported by Stripe** — Check [stripe.com/global](https://stripe.com/global). If your country isn't listed, contact VCI support before going further — getting paid out depends on it.
