# Stage 2 — Preparing Your App & Listing

*Part of the [VCI Marketplace seller guide](./00-overview.md). About 30–60 minutes, mostly gathering text and images.*

The marketplace has a **listing wizard** — a step-by-step form that creates your listing. This guide lists *everything the wizard will ask for*, so you can gather it all first and then fill the wizard out in one smooth pass.

> **Tip:** open a blank document and paste your answers there as you go. Then Stage 2's wizard is just copy-paste.

## The wizard has 7 steps

The wizard walks through: **Basics → Technical Details → Media → Pricing → Features → Preview → Submit.** Here's what each one needs.

---

### Step 1 — Basics

| Field | What it is | Tips |
|---|---|---|
| **Title** | Your app's name as buyers see it | Clear over clever. "InvoiceBot — AI invoicing" beats "InvoiceBot". |
| **Slug** | The web-address version of your title | Auto-filled from the title. You can usually leave it. |
| **Short description** | One-line pitch (about 160 characters) | This shows on the marketplace card. Make it punchy. |
| **Long description** | The full pitch | Explain what the app does, who it's for, and why it's worth it. Supports basic formatting. |

---

### Step 2 — Technical Details

This step connects your listing to your actual app.

| Field | What it is | Tips |
|---|---|---|
| **App URL** | Where your app lives | The address buyers go to use your app. |
| **Demo URL** | A link to try it (optional) | Optional but recommended — buyers trust what they can try. |
| **"Enter your code" URL** | The page in *your* app where a buyer pastes their license code | **Important.** If your app doesn't have this page yet, that's fine — you'll create it in Stage 4, then come back and fill this in. It's the page the buyer lands on to unlock access. |
| **Access method** | How buyers get into your app | Pick what matches: public signup, invite, coupon, etc. |
| **Built with** | The tech behind your app | Informational. List your stack. |
| **Terms of Service URL** | A link to your app's terms | **Required for review.** If you don't have one, you need to create one — there are free generators online. |
| **Privacy Policy URL** | A link to your app's privacy policy | **Required for review.** Same as above. |
| **Uses AI?** | Yes/no — does your app use AI features | Just answer honestly. |
| **Reviewer access** | Confirm a VCI reviewer can test your app | Make sure your app is reachable and testable when you submit. |

> **Don't have Terms of Service or a Privacy Policy?** You must have both before your listing can be approved. Free generators (search "terms of service generator") produce a usable starting point. Host them as simple pages and use those URLs.

---

### Step 3 — Media (images)

Buyers judge with their eyes. Prepare these images at the exact sizes below — the wizard will warn you if they're off.

| Image | Shape | Minimum size | Max file size | What it's for |
|---|---|---|---|---|
| **App logo** | Square (1:1) | 400 × 400 px | 2 MB | Your icon, shown everywhere |
| **Cover image** | Widescreen (16:9) | 1200 × 630 px | 5 MB | The big hero image on your listing |
| **Background image** | Widescreen (16:9) | 1920 × 1080 px | 8 MB | Optional ambient backdrop |
| **Screenshots** | 16:10 | 1280 × 800 px | 5 MB each | 3–5 shots of your app in action |

Accepted formats: **JPG, PNG, or WebP.**

> **Tip:** screenshots are your best sales tool. Show the app *doing the thing it does* — not empty states or login screens.

---

### Step 4 — Pricing

Decide how buyers pay.

| Choice | Options |
|---|---|
| **Payment model** | **One-time** (buyer pays once, keeps access forever) or **Subscription** (buyer pays on a schedule) |
| **Billing interval** | If subscription: **monthly** or **yearly** |
| **Price** | What you charge |
| **Original price** | Optional — shows as a struck-through "was" price to signal a deal |

Notes:
- During the launch period there's a **price ceiling**. If you set the price too high, the wizard won't let you submit and will tell you the maximum. Start within range; you can revisit pricing later.
- VCI takes a marketplace commission on each sale. Your exact take-home is shown on every sale and in your dashboard.
- **Subscription vs one-time:** subscriptions earn recurring revenue but buyers can cancel. One-time is simpler. If unsure, start with one-time.

---

### Step 5 — Features, FAQs, Testimonials

This is where you build buyer confidence.

| Section | What to add | Tips |
|---|---|---|
| **Features** | Bullet points of what your app does | At least 3. Lead with benefits, not technical details. |
| **FAQs** | Question-and-answer pairs | Optional. Answer the things buyers hesitate about. |
| **Testimonials** | Quotes from happy users | Optional. Real quotes with a name build trust. |

---

### Step 6 — Preview

The wizard shows you exactly how your listing will look — both the small card on the marketplace and the full detail page. Look it over. Fix anything ugly before moving on.

---

### Step 7 — Submit for review

When you submit, your listing goes to the VCI team for review. They check that:

- Your app actually works and is reachable
- Your images and text are appropriate
- Your Terms of Service and Privacy Policy links work
- Pricing is sane

**This is normal and expected — every listing is reviewed.** You'll get an email when it's approved (or, if something needs fixing, an email telling you exactly what).

> **You can't submit until Stripe is connected.** The wizard (or the submit step) will block you if you haven't done Stage 3. That's intentional — VCI won't list something it can't pay you for.

## How to know this stage is done

- [ ] You've gathered all the text fields above into a document
- [ ] You have your logo, cover image, and 3–5 screenshots at the right sizes
- [ ] You have working Terms of Service and Privacy Policy URLs
- [ ] You know your pricing model and price
- [ ] You either have an "enter your code" page in your app, OR you know you'll add it in Stage 4 and come back

You don't have to *submit* the wizard yet — you can save a draft and finish after Stages 3 and 4. Many sellers do Stage 3 (Stripe) and Stage 4 (validation) first, then come back and submit.

**Next:** [Stage 3 — Connecting Stripe](./03-stripe-setup.md) — set up how you get paid.

---

### If something goes wrong

**"I don't have Terms of Service / Privacy Policy"** — You must create them. Use a free online generator, host them as simple pages on your site, and use those URLs. This is a hard requirement for review.

**"My images are the wrong size"** — The wizard warns you but may still accept them. For best results, resize to the exact dimensions in the table. Free tools: any image editor, or online resizers.

**"I don't have an 'enter your code' page yet"** — Skip that field for now, save your listing as a draft, do Stage 4 (which creates that page), then come back and fill in the URL.

**"The wizard won't let me submit"** — Most common reason: Stripe isn't connected (do Stage 3) or a required field is blank (the wizard highlights which one).
