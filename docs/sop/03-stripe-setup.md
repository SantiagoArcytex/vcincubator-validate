# Stage 3 — Connecting Stripe (Getting Paid)

*Part of the [VCI Marketplace seller guide](./00-overview.md). About 15 minutes.*

VCI uses **Stripe** to handle payments and send your earnings to your bank. Before your listing can go live, you connect a Stripe account. This is a one-time setup.

## Why this is required

When a buyer pays for your app, the money flows through Stripe. Stripe needs to know who you are and where to send your share — that's the law (anti-fraud and tax rules), not a VCI policy. No Stripe connection means VCI literally cannot pay you, so the marketplace won't let a listing go live without it.

**You do not need to already have a Stripe account.** The steps below create one for you as part of the flow.

## What you'll need (have these ready)

- Your **legal name** and **address**
- Your **date of birth**
- Your **bank account details** (account + routing number, or local equivalent)
- Possibly a **photo of a government ID** — Stripe decides based on your country
- If you're registering as a business: business name and tax ID

## Steps

1. Log in to **[marketplace.vcinc.ai](https://marketplace.vcinc.ai)** as your seller account.
2. Go to your **seller area** (look under "My Apps" or "Seller").
3. You'll see a banner or button about **setting up payments** / **connecting Stripe**. Click it.
4. You're handed off to **Stripe** to fill in your details. Work through their form:
   - Choose **Individual** or **Business** — pick what matches how you operate.
   - Enter your personal/business info.
   - Enter your **bank account** for payouts.
   - Complete any **identity verification** Stripe asks for (this varies by country).
5. When Stripe is done, it sends you **back to VCI automatically**.
6. The payments banner in your seller area now shows **connected**.

**How to know it worked:** the "set up payments" banner is gone or shows a green "connected" state, and you're no longer blocked from submitting a listing.

## Good to know

- **Test mode:** during the launch period, this runs in Stripe's test mode. You can complete the whole setup with Stripe's test details (VCI support can provide them) — no real bank verification needed yet. When live payments switch on, you'll do the real verification once.
- **Payout timing:** earnings are held for a protection period after each sale, then paid out to your bank on Stripe's normal schedule. You'll see exact dates in your dashboard (Stage 5).
- **One Stripe account per seller.** If you already have a Stripe account, the flow can connect it; you don't need a brand-new one.
- **Your Stripe dashboard is yours.** Once connected, you get a Stripe "Express" dashboard showing your balance, transfers, and payout history. Stage 5 shows you how to reach it.

## How to know this stage is done

- [ ] You completed the Stripe handoff and landed back on VCI
- [ ] Your seller area shows payments as connected
- [ ] You're no longer blocked from submitting a listing

**Next:** [Stage 4 — Adding validation to your app](./04-add-validation.md) — the one code step, done for you by an AI assistant.

---

### If something goes wrong

**Stripe didn't send me back to VCI** — Return to your seller area on marketplace.vcinc.ai and click the payments banner again. If you finished Stripe's form, it should now show connected. If it still asks you to start over, you may have closed the Stripe tab early — just redo it.

**Stripe says it needs more information** — Stripe sometimes asks for extra verification (a clearer ID photo, a proof of address). Follow their prompts. Until Stripe is satisfied, payouts are held — but you can still finish the rest of the VCI setup. Come back and clear Stripe's requests when you can.

**"My country isn't available"** — Stripe operates in specific countries. If yours isn't supported, you can't currently receive payouts. Contact VCI support.

**The banner still says "set up payments" after I finished** — Refresh the page. If it persists, your Stripe onboarding didn't fully complete — click the banner and finish any remaining steps Stripe shows you.
