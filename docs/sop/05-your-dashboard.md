# Stage 5 — Your Dashboard & Earnings

*Part of the [VCI Marketplace seller guide](./00-overview.md). About 10 minutes.*

Your listing is live, your app validates codes, and money is coming in. Here's where to see all of it.

## The two places your numbers live

| Where | What you see there |
|---|---|
| **Your VCI seller dashboard** | Sales, revenue, active listings, recent purchases — the marketplace view |
| **Your Stripe Express dashboard** | Your balance, payout history, and when money hits your bank — the money view |

You'll use both. VCI shows you *what sold*; Stripe shows you *when you get paid*.

## Part A — Your VCI seller dashboard

1. Log in to **[marketplace.vcinc.ai](https://marketplace.vcinc.ai)**.
2. Go to your **seller area** (under "My Apps" / "Seller").

There you'll find:

- **Your listings** — each one with its status (draft, under review, live, paused) and its purchase count.
- **A Metrics view** — switch to the metrics/performance tab to see:
  - **Total revenue** — what your app has earned
  - **Total sales** — how many purchases
  - **Active deals** — how many listings are live
  - **Pending payouts** — earnings on the way to you
  - **Charts** — revenue over time, and a breakdown across your listings
- **Recent purchases** — the latest buyers (emails partly hidden for privacy).

> **Reading revenue:** the numbers here reflect *your share* — after VCI's marketplace commission. What you see is what's yours.

## Part B — Your Stripe Express dashboard (the money)

VCI sends your earnings through Stripe. For the real money detail — balance, payout dates, bank transfers — you go to your **Stripe Express dashboard**.

1. In your VCI seller area, open the **Payouts** page.
2. Click the button to **open your Stripe dashboard** (it says something like "Open Stripe Express Dashboard"). It opens Stripe in a new tab.
3. If you're not already logged in to Stripe, it'll ask you to — use the same login from your Stripe setup in Stage 3.

In Stripe you'll see:
- **Available balance** — money ready to be paid out
- **Pending balance** — money still in the holding period
- **Payout history** — past transfers to your bank, with dates
- **Per-transaction detail** — every charge and its fees

## Part C — How payouts actually work

1. A buyer purchases your app.
2. The sale amount (minus VCI's commission and payment processing fees) becomes **your earnings**.
3. Earnings sit in a **holding period** — a protection window in case of refunds or disputes.
4. After the holding period, the money becomes **available** and Stripe pays it to your bank on its normal schedule.
5. It lands in your bank account a few business days later.

So there's a natural delay between "someone bought my app" and "money in my bank." That's normal and expected — the dashboard shows you exactly where each amount is in that journey.

## Part D — Emails keep you informed

You don't have to watch the dashboard all day. VCI emails you when things happen:

| Email you'll get | When |
|---|---|
| **New sale** | Someone buys your app |
| **Subscription renewal** | A subscriber's recurring payment goes through |
| **Subscription cancelled** | A subscriber cancels |
| **Payment failed** | A subscriber's card was declined (Stripe will retry automatically) |
| **Refund issued** | A purchase was refunded |
| **Payout processed** | Money was sent to your bank |
| **Listing approved / needs changes** | After VCI reviews a listing |

Buyers get their own emails too (purchase confirmation with their code, renewal receipts, etc.) — so you don't have to handle any of that.

## Part E — Ongoing: managing your listing

From your seller area you can, anytime:

- **Edit a listing** — update descriptions, images, features
- **Pause a listing** — temporarily stop new sales without deleting it
- **Post an update** — tell your buyers about a new version
- **Create more listings** — sell multiple apps, or multiple tiers of one app
- **Manage API keys** — rotate or revoke the key your app uses (Settings → API Keys)
- **Manage webhooks** — if you set up instant updates (Settings → Webhooks)

## You've finished the guide

You've gone from nothing to a live, paid, monetized app:

1. ✅ Seller account created
2. ✅ App and listing prepared
3. ✅ Stripe connected for payouts
4. ✅ Validation added to your app
5. ✅ Dashboard and earnings — you know where everything is

Congratulations — you're a VCI Marketplace seller. Now go make sales.

---

### If something goes wrong

**My revenue number looks lower than the price I set** — That's expected. The number is *your share* after VCI's marketplace commission and payment processing fees. The full breakdown is on each sale.

**I made a sale but there's no money in Stripe yet** — Earnings go through a holding period before becoming available, then Stripe pays out on a schedule. Check the "pending" vs "available" balance in your Stripe dashboard — your money is there, just not released yet.

**The "Open Stripe Dashboard" button asks me to log in and I don't know the login** — It's the Stripe account you created in Stage 3. If you truly can't get in, use Stripe's account recovery, or contact VCI support.

**A subscriber shows as cancelled but I think they're still active** — Check the purchase detail. If their payment failed, the subscription may be in a retry state. The "payment failed" email has the details. Stripe retries automatically before fully cancelling.

**I want to stop selling an app** — Pause the listing (stops new sales, keeps existing buyers working) or contact support to fully remove it. Existing buyers' access continues per what they paid for.
