# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run dev:clean    # Wipe .next cache and start fresh (use when stale builds occur)
npm run build        # Production build
npm run lint         # ESLint

# E2E tests (requires dev server running, or it auto-starts via webServer config)
npx playwright test                        # Run all e2e tests
npx playwright test e2e/auth-flow.spec.ts  # Run a single test file
npx playwright test --ui                   # Interactive UI mode
```

No unit test framework is configured — only Playwright e2e tests in `e2e/`.

## What SpontiCoupon Does

**SpontiCoupon is a subscription-based deal marketplace for local businesses.**

- **Vendors** pay SpontiCoupon a monthly/annual subscription ($49–$499/mo) to list deals.
- **Customers** browse and claim deals for free, then redeem them at the business via QR code or 6-digit code.
- **SpontiCoupon never handles money between customers and vendors.** Customer-to-vendor payments go directly through vendor-configured processors (Stripe Connect, PayPal, Square, Venmo, Zelle, Cash App).
- SpontiCoupon's only revenue is vendor subscription fees (billed by Stripe).

**Two deal types:**
- `sponti_coupon` — Flash deals (4–24 hours), countdown timer, sense of urgency. Sponti = Orange `#E8632B`.
- `regular` (Steady Deals) — Ongoing deals with longer windows. Steady = Blue `#29ABE2`.

**Three user roles:** `vendor`, `customer`, `admin`. A single auth account can hold both vendor and customer roles (switchable via `active_role`).

## Project Structure

```
src/
  app/                   # Next.js App Router pages + API routes
    api/                 # All API routes
      admin/             # Admin-only CRUD (verifyAdmin guard)
      auth/              # login, me, signout, switch-role, become-customer
      vendor/            # Vendor-specific actions (deals, payments, AI tools)
      stripe/            # Stripe webhook + checkout + billing portal
      social/            # Social media OAuth + auto-posting
      cron/              # Scheduled jobs (deal expiry, digests)
    admin/               # Admin dashboard pages (sidebar layout)
    vendor/              # Vendor dashboard pages (sidebar layout)
    dashboard/           # Customer dashboard pages (sidebar layout)
    deals/               # Public deals listing + deal detail pages
    auth/                # Login, signup, password reset pages
    claim/               # Deal claim + payment + manual payment flow
    redeem/              # QR code redemption (vendor-facing scanner)
    [legal pages]/       # terms, privacy, vendor-terms, loyalty-terms, dmca-policy
  components/
    layout/              # Navbar, Footer, AdminSidebar, VendorSidebar
    ui/                  # Shared UI components
    auth/                # InactivityGuard, etc.
    support/             # OliviaFloatingWidget (AI chat)
  lib/
    supabase/            # client.ts, server.ts, middleware.ts
    hooks/               # useAuth.ts
    email/               # Resend email modules (review-request, subscription-notification, etc.)
    social/              # Social auto-posting (caption-generator, post-manager, platform clients)
    ranking/             # Deal ranking algorithm (deal-ranker.ts, ranking-weights.ts)
    admin.ts             # verifyAdmin() + forbiddenResponse() helpers
    stripe.ts            # Lazy Stripe singleton (getStripe())
    constants.ts         # Deal image fallbacks
    constants/           # payment-processors.ts, tour-steps.ts
    types/               # database.ts — TypeScript types for all DB entities
  middleware.ts          # Auth session refresh + inactivity timeout (1 hour)
supabase/
  migrations/            # 036 SQL migrations (numbered sequentially)
e2e/                     # Playwright tests (auth-flow, vendor-flow, customer-flow)
```

## Authentication Architecture

**Critical:** The Supabase browser client deadlocks if you call `.from().select()` inside an `onAuthStateChange` callback (it blocks `initializePromise`). This is a known bug that was fixed.

**The fix:** Auth and role data are always fetched via server-side API endpoints:
- Login → `POST /api/auth/login`
- Get current user/role → `GET /api/auth/me`
- Sign out → `POST /api/auth/signout`

`useAuth()` (`src/lib/hooks/useAuth.ts`) listens to `onAuthStateChange` but calls `/api/auth/me` to get the role — never queries Supabase directly from the browser. It also has a 2-second fallback timer in case `onAuthStateChange` is stuck.

**Middleware** (`src/middleware.ts`) refreshes the Supabase session on every request and enforces:
- Auth guard: redirects unauthenticated users from `/vendor`, `/admin`, `/dashboard` to `/auth/login`
- 1-hour inactivity timeout via `sb-last-activity` cookie

**Supabase clients:**
- `createServerSupabaseClient()` — cookie-based SSR client (uses `next/headers`; Node runtime only)
- `createServiceRoleClient()` — bypasses RLS, for admin/server operations

## API Route Patterns

**Node runtime routes (default):**
```typescript
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();
  const supabase = await createServiceRoleClient();
  // ...
}
```

**Edge runtime routes** (e.g. `src/app/api/admin/leads/search/route.ts`):
- `export const runtime = 'edge'`
- Cannot use `next/headers` or `createServerSupabaseClient`
- Use inline `verifyAdminEdge(request)` that reads cookies from `request.cookies.getAll()` directly
- Use `createServerClient` from `@supabase/ssr` + `createClient` from `@supabase/supabase-js` for service role

## Database

PostgreSQL via Supabase with Row-Level Security. 36 sequential migrations in `supabase/migrations/`.

**Core tables:** `user_profiles`, `vendors`, `customers`, `deals`, `claims`, `redemptions`, `subscriptions`, `reviews`

**Key relationships:**
- `vendors.id` = `user_profiles.id` = `auth.users.id` (all same UUID)
- `deals` belong to `vendors`; `claims` belong to `customers` + `deals`
- `subscriptions` tracks Stripe subscription state per vendor (tier + status)

**To add a migration:** Create `supabase/migrations/NNN_description.sql` (next number), then push via Supabase CLI or the admin `/api/admin/run-migration` endpoint.

## Stripe Integration

SpontiCoupon uses Stripe **only for vendor subscription billing** — not for customer-to-vendor transactions.

- Subscription checkout: `/api/stripe/checkout` creates a Stripe Checkout Session for vendor signup
- Webhook: `/api/stripe/webhook` handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
- Billing portal: `/api/stripe/portal` opens the Stripe Customer Portal for plan changes/cancellations
- `getStripe()` in `src/lib/stripe.ts` is a lazy singleton

**Vendor payment processors** (customer → vendor, not SpontiCoupon):
- `integrated` tier: Stripe Connect (OAuth, automatic confirmation via `/api/webhooks/stripe-connect/`)
- `link` tier: Static payment links (Stripe, Square, PayPal)
- `manual` tier: Venmo, Zelle, Cash App — vendor manually confirms receipt from dashboard

## Brand & Styling Rules

- **Sponti (primary) = Orange `#E8632B`** — flash deals, countdown timers, primary CTAs, `text-primary-*`
- **Steady (secondary) = Blue `#29ABE2`** — steady deals, `.btn-secondary`, `text-secondary-*`
- **NO purple/violet/indigo anywhere** — these colors are banned
- Dark backgrounds use `bg-gray-900`, NOT `bg-secondary-*` (secondary is reserved for Steady deal branding)
- Fonts: Inter (body), Bebas Neue (`--font-bebas`, headings), Instrument Serif (`--font-instrument`)

## AI Features

All AI keys are server-side env vars — never `NEXT_PUBLIC_` prefixed:
- `GEMINI_API_KEY` — Gemini 2.5 Flash for captions, tags; Veo 3.1 for video generation; Nano Banana 2 for image generation
- `ANTHROPIC_API_KEY` — Ava, the AI deal strategist (Claude via AI SDK)
- `APIFY_API_KEY` — Website scraping for deal import

Social auto-posting (`src/lib/social/`) fires when a deal is published: generates AI captions via Gemini, posts to Facebook/Instagram/X/TikTok for both SpontiCoupon brand accounts and vendor-connected accounts. Brand account posts get `#Ad` appended (FTC § 255).

## Admin Leads Tool

`/admin/leads` — helps admin find local businesses to pitch in person.

- Search: `GET /api/admin/leads/search` (**Edge function**) — proxies to Yelp Fusion API. `YELP_API_KEY` never reaches the browser.
- CRUD: `GET/POST/PATCH/DELETE /api/admin/leads` — saves leads to `vendor_leads` table
- Export: `GET /api/admin/leads/export` — CSV download of all saved leads

## Environment Variables

All sensitive keys live in `.env.local` (never committed). Key vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, safe in browser
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — server-only
- `RESEND_API_KEY` — server-only (transactional email)
- `GEMINI_API_KEY` — server-only (Google AI)
- `YELP_API_KEY` — server-only (leads search)
- `SOCIAL_TOKEN_ENCRYPTION_KEY` — AES-256 key for stored OAuth tokens

## Legal / Compliance

All legal pages are in `src/app/[page-name]/page.tsx` (static Next.js pages, no client JS needed).

Key compliance implementations:
- FTC Negative Option Rule: two-checkbox vendor signup (ToS + separate auto-renewal consent with dynamic price)
- Confirmation emails on subscription start/cancellation (`src/lib/email/subscription-notification.ts`)
- CPRA/multi-state privacy: full Section 9 with appeals process covering 8 states
- All legal pages use entity name "Online Commerce Hub, LLC DBA SpontiCoupon"
- SpontiCoupon is **not** a money transmitter, payment processor, or bank
