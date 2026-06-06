import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

const VALID_TIERS = ['starter', 'pro', 'business', 'enterprise'];

export async function POST(request: NextRequest) {
  // Unauthenticated (guest signup) — cap Stripe Checkout Session creation per IP.
  const limited = rateLimit(request, { maxRequests: 15, windowMs: 10 * 60 * 1000, identifier: 'guest-checkout' });
  if (limited) return limited;

  try {
    const { tier, interval = 'month' } = await request.json();

    if (!tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (interval !== 'month' && interval !== 'year') {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as SubscriptionTier];
    const priceId = interval === 'year'
      ? tierConfig.stripe_annual_price_id
      : tierConfig.stripe_price_id;

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price ID configured for ${tier} (${interval})` },
        { status: 500 },
      );
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: { tier, interval, flow_type: 'guest_signup' },
      },
      metadata: { tier, interval, flow_type: 'guest_signup' },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com'}/auth/complete-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com'}/pricing?subscription=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Guest checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
