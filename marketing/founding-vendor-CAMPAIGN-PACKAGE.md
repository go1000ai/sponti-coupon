# Founding Vendor Campaign — GHL Hand-Off Package

Everything you need to send the campaign from GHL's UI. The contacts are already in GHL with the right tags.

---

## 1. The Email — copy-paste ready

### Subject line
```
You're invited: 3 months free on SpontiCoupon — no credit card
```

### From name
```
Heriberto Santiago
```

### From email
```
hsantiago@sponticoupon.com
```

### Reply-To
```
hsantiago@sponticoupon.com
```

### HTML body
Open this file and paste the full contents into GHL's "Source" / HTML editor:

**`marketing/founding-vendor-email-CLEAN.html`**

(I removed the hardcoded test data — "Hi Maria" → "Hi there", the "12 of 15" sample count → "a few of 15", and demo unsubscribe URLs.)

### Plain-text fallback (if GHL asks)

```
Hi there,

I'm Heriberto, founder of SpontiCoupon — a deal marketplace built for local businesses like yours. We help you fill quiet hours and bring in new customers without discounting your way to zero.

I'm picking 15 founding vendors to launch with us, and I'd love yours to be one of them.

What you get:
  • 3 months FREE on our Business plan
  • No credit card required at signup
  • 150 deals/month (50 Sponti Deals + 100 Steady Deals)
  • We post your deals on our own Facebook and Instagram
  • Zero commission. You keep 100% of every sale.
  • 20% off forever when you stay on after the trial

Only a few of 15 founding spots left. Claim yours here (no card needed):
https://sponticoupon.com/founding-vendor

If you don't get customers in 3 months, walk away. No risk. No charge. No follow-up.

Reply to this email if you have questions — or text/call me at (321) 335-0773. I answer personally.

Heriberto Santiago
Founder, SpontiCoupon
(321) 335-0773

P.S. Founding-vendor spots usually fill in under 2 weeks. Grab yours before they're gone.
```

---

## 2. Where to go in GHL (step by step)

### Path A — Use **Email Marketing → Campaigns** (best for scheduled sends)

1. Open GHL, log into the SpontiCoupon sub-account
2. Left sidebar → **Marketing**
3. Top tabs → **Emails**
4. Click **+ New Campaign** (or **+ Create Email Template**)
5. Choose **"Send to Smart List"** (NOT a workflow trigger)
6. Fill in:
   - Subject: see above
   - From Name: Heriberto Santiago
   - From Email: hsantiago@sponticoupon.com
7. Click into the email body → find **"</> Source"** or **"HTML"** toggle (top of editor)
8. Paste the contents of `founding-vendor-email-CLEAN.html`
9. Click **Recipients** / **Audience**
10. Add a **Smart List filter** (see Filter section below)
11. **Schedule** → pick "Send Now" OR pick a future date

### Path B — **Bulk Action on a Smart List** (fastest, sends to all at once)

1. Left sidebar → **Contacts**
2. Top filter button → build the Smart List filter (see below)
3. Top-right → **Select All**
4. **Bulk Action** button → **Send Email**
5. Paste the subject, from, and HTML body
6. **Send Now**

**Use Path A if** you want to schedule + track in one place. **Use Path B if** you just want to push send right now and watch replies roll in.

---

## 3. The Smart List filter (recipients)

GHL filter UI — combine these:

```
Tag IS "founding-vendor-pilot"
   OR
(Tag IS "groupon vendor" AND Email Valid IS true)
```

**Expected reach: ~365 contacts total.**

If you only want to send to people who **haven't been emailed yet** by my catch-up runs, add this filter too:

```
AND NOT (Tag IS "founding-vendor-sent")
```

⚠️ I have NOT applied a `founding-vendor-sent` tag to the 139 I've already sent. If you want to avoid double-sending, you have two options:
1. **Let me tag them first** — I can run a one-line script that adds `founding-vendor-sent` to all 139 in the queue with `status=sent`
2. **Skip filtering** — send to all 365, GHL will simply log a 2nd send to the 139. They get a 2nd touch, which often increases reply rates.

---

## 4. What to do after sending

- Watch your GHL **Conversations** inbox — replies arrive as email threads
- Check `sponticoupon.com/founding-vendor` periodically — the page shows live sign-up count climbing
- You'll get an email at `info@sponticoupon.com` + `info@go1000.ai` every time someone signs up (I wired that yesterday)
- Once 15 sign up, the page auto-switches to "sold out, see pricing"

---

## 5. If you want me to keep firing the batches instead

You said you want to manage it in GHL — totally fine. But if you change your mind, I can keep doing daily catch-up runs from my side (same as today's 70). Just message me "fire batch" and I'll send the next ~73 within 5 minutes. No Vercel needed.
