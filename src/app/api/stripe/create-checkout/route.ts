import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

const TIER_PRICES: Record<string, number> = {
  starter: 4900,
  pro: 9900,
  business: 19900,
  enterprise: 49900,
};

const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const { tier, vendorId } = await request.json();

    if (!tier || !vendorId || !TIER_PRICES[tier]) {
      return NextResponse.json({ error: 'Invalid tier or vendor' }, { status: 400 });
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
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Sponti Coupon ${TIER_NAMES[tier]} Plan`,
              description: `Monthly subscription for ${TIER_NAMES[tier]} tier`,
            },
            unit_amount: TIER_PRICES[tier],
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: { vendor_id: vendorId, tier },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/vendor-signup?subscription=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
