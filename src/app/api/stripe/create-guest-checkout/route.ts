import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

const VALID_TIERS = ['starter', 'pro', 'business', 'enterprise'];

/* ─── Founders Launch Config ─── */
const FOUNDERS_LAUNCH = {
  active: new Date() <= new Date('2026-04-30T23:59:59-04:00'),
  freeTrialDays: 60,
  couponId: 'FOUNDERS20',
  eligiblePlans: ['pro', 'business'],
};

export async function POST(request: NextRequest) {
  try {
    const { tier, interval = 'month', promo } = await request.json();

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

    // Determine trial & discount for Founders Launch
    const isFoundersEligible =
      FOUNDERS_LAUNCH.active &&
      promo === 'founders' &&
      FOUNDERS_LAUNCH.eligiblePlans.includes(tier);

    const trialDays = isFoundersEligible
      ? FOUNDERS_LAUNCH.freeTrialDays
      : 14;

    // Build checkout session — no customer required, Stripe collects email
    // Stripe does not allow both allow_promotion_codes and discounts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionConfig: any = {
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(isFoundersEligible
        ? { discounts: [{ coupon: FOUNDERS_LAUNCH.couponId }] }
        : { allow_promotion_codes: true }),
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          tier,
          interval,
          flow_type: 'guest_signup',
          ...(isFoundersEligible ? { promo: 'founders' } : {}),
        },
      },
      metadata: {
        tier,
        interval,
        flow_type: 'guest_signup',
        ...(isFoundersEligible ? { promo: 'founders' } : {}),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/complete-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=canceled`,
    };

    const session = await getStripe().checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Guest checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
