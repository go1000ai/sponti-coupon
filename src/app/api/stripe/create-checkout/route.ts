import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

/* ─── Founders Launch Config ─── */
const FOUNDERS_LAUNCH = {
  active: new Date() <= new Date('2026-04-30T23:59:59-04:00'), // Expires end of April 30, 2026 ET
  freeTrialDays: 60,                  // 2 months free
  couponId: 'FOUNDERS20',             // 20% off forever — create this in Stripe Dashboard
  eligiblePlans: ['pro', 'business'], // only these plans get the founders deal
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate the caller
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier, vendorId, interval = 'month', promo } = await request.json();

    // Verify the caller is the same vendor (prevent creating checkout for other vendors)
    if (vendorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: vendor mismatch' }, { status: 403 });
    }

    if (!tier || !vendorId || !TIER_NAMES[tier]) {
      return NextResponse.json({ error: 'Invalid tier or vendor' }, { status: 400 });
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
        { error: `No Stripe price ID configured for ${TIER_NAMES[tier]} (${interval})` },
        { status: 500 },
      );
    }

    const supabase = await createServiceRoleClient();

    // Check if vendor already has a Stripe customer
    const { data: vendor } = await supabase
      .from('vendors')
      .select('stripe_customer_id, email, business_name')
      .eq('id', vendorId)
      .single();

    let customerId = vendor?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: vendor?.email,
        name: vendor?.business_name,
        metadata: { vendor_id: vendorId },
      });
      customerId = customer.id;

      await supabase
        .from('vendors')
        .update({ stripe_customer_id: customerId })
        .eq('id', vendorId);
    }

    // ─── Determine trial & discount ───
    const isFoundersEligible =
      FOUNDERS_LAUNCH.active &&
      promo === 'founders' &&
      FOUNDERS_LAUNCH.eligiblePlans.includes(tier);

    const trialDays = isFoundersEligible
      ? FOUNDERS_LAUNCH.freeTrialDays  // 60 days (2 months free)
      : 14;                            // standard 14-day trial

    // Build the checkout session config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          vendor_id: vendorId,
          tier,
          interval,
          ...(isFoundersEligible ? { promo: 'founders' } : {}),
        },
      },
      metadata: {
        vendor_id: vendorId,
        tier,
        interval,
        ...(isFoundersEligible ? { promo: 'founders' } : {}),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=canceled`,
    };

    const session = await getStripe().checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
