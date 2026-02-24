import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const { tier, vendorId, interval = 'month' } = await request.json();

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

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
      },
      metadata: { vendor_id: vendorId, tier, interval },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
