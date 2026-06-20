# Creative Prompt Pack — Sales + Sign-up Tracks

Companion to the Full Playbook. These are **copy-paste prompts**. Fill the `[BRACKETS]`, run, launch 3–5 variants per angle, let Meta pick the winner.

**Two tracks, two intents:**
- **SALES** → drive a purchase. CTA: *Shop Now*. Destination: product page.
- **SIGN-UP** → drive an opt-in. CTA: *Sign Up / Get the free [X]*. Destination: opt-in page.

The same product can run both — sales ads sell it, sign-up ads offer a lead magnet (guide, discount code, free sample, access) tied to it.

---

## STEP 1 — Claude: hooks, scripts, copy (do this first)

Paste your **swipe file** (the winning competitor ads you saved) as reference before the prompt for much better output.

### 1A. SALES — UGC scripts

```
You're a direct-response UGC scriptwriter for paid Meta ads.

PRODUCT: [name + 1-line description]
AUDIENCE: [who buys it]
CORE PAIN: [the problem it solves]
OFFER: [discount / bundle / guarantee]
PRICE / AOV: [$]
REFERENCE WINNERS: [paste 3-5 swipe-file ads or describe them]

Write 5 UGC scripts, ~15 seconds each (≈35-45 words spoken). Each uses a
DIFFERENT hook angle:
1. Curiosity gap
2. Problem-agitate-solve
3. Social proof / testimonial
4. Before/after transformation
5. Contrarian ("stop doing X")

Format each as:
HOOK (first 3 sec — must stop the scroll):
BODY:
CTA: (drive to Shop Now)

Then give me 5 primary-text variants and 5 headlines (max 40 chars) for Meta's
Advantage+ to rotate. Punchy, no corporate voice.
```

### 1B. SIGN-UP — lead-magnet scripts

```
You're a direct-response scriptwriter for Meta LEAD-GEN ads.

PRODUCT/BRAND: [name]
LEAD MAGNET: [free guide / discount code / sample / checklist / access]
AUDIENCE: [who]
WHY THEY'D OPT IN: [the value they get instantly]
WHAT I DO WITH THE LEAD: [nurture → sell what]

Write 5 short scripts (~12 sec) whose ONLY goal is the email/phone opt-in — not
a sale. Each a different hook angle (curiosity, fear-of-missing-out, free-value,
quick-win, insider-access).

Format:
HOOK:
BODY (tease the value, don't give it all away):
CTA: (Sign Up / Get the free [X])

Then 5 primary texts + 5 headlines optimized for opt-in, not purchase.
Lead with the free value, not the product.
```

> Tip: feed the winning output back in — *"Take script #3, write 5 new hooks for it"* — once you see which angle performs.

---

## STEP 2 — HeyGen: UGC / spokesperson video

HeyGen = authentic human presenter. Paste the **script from Step 1** into HeyGen, then use these as the *setup brief* (avatar + setting + format choices).

### 2A. SALES
```
AVATAR: pick one matching [demographic] — [young/energetic | relatable everyday | premium/sophisticated]
SCRIPT: [paste winning SALES script from 1A]
PRODUCT PHOTO: upload [product image] — use HeyGen product placement
SETTING: [bedroom=authentic | kitchen=lifestyle | gym=fitness | office=B2B]
FORMAT: export 9:16 (Reels/Stories) AND 1:1 (feed)
CAPTIONS: on, bold, animated
PACING: fast cut, hook visible in first second
```

### 2B. SIGN-UP
```
AVATAR: relatable everyday creator (trust > polish for opt-ins)
SCRIPT: [paste winning SIGN-UP script from 1B]
SETTING: casual / handheld feel
FORMAT: 9:16 primary
ON-SCREEN TEXT: show the free offer as a text overlay ("FREE [X] — link below")
CTA CARD: end frame with "Sign Up" + arrow to button
```

**Make 2 avatars per track** (different faces/voices) — face is a testable variable. Disclose AI use to stay compliant.

---

## STEP 3 — Higgsfield: product / cinematic video

Higgsfield = cinematic motion + product-from-URL. Best for SALES hero shots; usable for SIGN-UP if the product visual *is* the hook.

### 3A. Click-to-Ad (fastest)
```
1. Paste product URL: [your product page] → let Hermes agent extract assets
2. Creative direction:
   - SALES: "CGI commercial" or "cinematic narrative"
   - SIGN-UP: "UGC style" (softer, less salesy)
3. Camera presets: pick 2 — [crash zoom | 360 rotation | push-in | bullet time]
4. Export: 9:16 + 1:1
```

### 3B. Manual prompt (more control)
```
Product: [name]. Scene: [lifestyle context]. Mood: [premium / playful / clean].
Motion: slow push-in on product, then [crash zoom] on the key feature.
Lighting: [soft studio / golden hour / high-contrast].
End on product hero shot with space for text overlay top-third.
Duration: 5-8 sec. Style: scroll-stopping, reads clearly on a phone.
```

**Credit discipline:** Higgsfield premium models (Sora 2/Veo) burn 40–70 credits/clip. Generate your *winning* angle here, not every test. Test cheap with static/HeyGen first, then make the winner cinematic.

---

## STEP 4 — Image AI + Claude Design: static ads

Statics are cheapest to test and often win cold sign-up traffic. Two-step.

### 4A. Image generation (tool-agnostic — works in most image AIs)
```
A high-converting ecommerce ad background featuring [product] in [context/scene].
[Lifestyle: e.g. "on a marble bathroom counter, morning light"] OR
[Clean studio: "on a seamless [brand-color] backdrop, soft shadow"].
Photorealistic, sharp product focus, leave NEGATIVE SPACE in the [top third]
for headline text. No text in the image. 4:5 and 1:1 versions.
```
> Once you tell me the exact tool you meant by "file AI," I'll convert this into that tool's precise syntax + export specs.

### 4B. Build the ad in Claude Design
Bring the generated image onto the canvas and chat:
```
Take this product image and build a Meta feed ad, 1:1 and 4:5.
- Headline (top third): "[HOOK from Step 1]"
- Offer badge: "[BOGO / Free Guide / 30% off]" — [top-right corner]
- CTA button graphic: "[Shop Now / Sign Up]" — bottom, [brand color]
- Brand colors: [hex codes]
- Keep it clean, mobile-legible, thumb-stopping.
Give me 3 variants: one bold/loud, one minimal/premium, one urgency-driven.
```

**Per track:**
- SALES static → product + price/offer + Shop Now.
- SIGN-UP static → the free thing front and center + Sign Up (downplay the product).

---

## STEP 5 — Launch loadout (what goes into each ad set)

Per offer, launch one ad set with **5 creatives, same offer, different hooks/formats**:

**SALES ad set:**
1. HeyGen UGC (problem-solve angle)
2. HeyGen UGC (testimonial angle)
3. Higgsfield cinematic hero
4. Static — bold variant
5. Static — urgency variant

**SIGN-UP ad set:**
1. HeyGen UGC (free-value angle)
2. HeyGen UGC (quick-win angle)
3. Static — offer-forward (loud)
4. Static — minimal/premium
5. Higgsfield UGC-style (only if product visual sells the opt-in)

Then run the kill/scale loop from the Playbook (CPA for sales, CPL for sign-ups; 3-sec view ≥30%, CTR ≥1.5%). Kill losers at 24–72h, iterate winners, scale ~20–30% every few days.

---

## The reusable loop

1. Swipe file → **Step 1** (Claude scripts/hooks/copy)
2. → **Steps 2–4** (HeyGen + Higgsfield + Image AI/Claude Design = 5 variants)
3. → **Step 5** (launch both tracks)
4. → read data → kill/iterate/scale
5. → feed winning angles back into Step 1 → repeat

When this loop produces consistent winners, *that's* when Claude Code builds the orchestration layer to run it at scale (Playbook Part 6).

---

*Name the "file AI" image tool and I'll specialize Step 4A. Want me to pre-fill this whole pack for one specific product/site of yours so it's ready to run, not just a template?*
