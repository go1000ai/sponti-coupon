import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/vendor/collect-balance
// Creates a Stripe Checkout Session on the vendor's connected Stripe account
// for the remaining balance on a redeemed deal. No application fee — 100% goes to vendor.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify vendor role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can use this endpoint' }, { status: 403 });
  }

  const { redemption_id, amount, deal_title, customer_name } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'No balance to collect' }, { status: 400 });
  }

  // Get vendor's Stripe Connect account ID
  const serviceClient = await createServiceRoleClient();
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('stripe_connect_account_id, business_name')
    .eq('user_id', user.id)
    .single();

  if (!vendor?.stripe_connect_account_id) {
    return NextResponse.json({
      error: 'No Stripe account connected. Connect your Stripe account in Settings to use this feature.',
      code: 'NO_STRIPE_CONNECT',
    }, { status: 400 });
  }

  const stripe = getStripe();
  const amountCents = Math.round(amount * 100);

  const lineItemName = deal_title
    ? `${deal_title} — Remaining Balance`
    : 'Deal Remaining Balance';

  const description = customer_name
    ? `Payment from ${customer_name} via SpontiCoupon`
    : 'Payment via SpontiCoupon';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: lineItemName,
            description,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/vendor/scan`,
    payment_intent_data: {
      // Transfer 100% to vendor's Stripe account — no application fee
      transfer_data: {
        destination: vendor.stripe_connect_account_id,
      },
      description: `SpontiCoupon redemption balance${redemption_id ? ` (${redemption_id.slice(0, 8)})` : ''}`,
    },
    metadata: {
      redemption_id: redemption_id || '',
      vendor_id: user.id,
      source: 'sponticoupon_scan',
    },
  });

  return NextResponse.json({ checkout_url: session.url });
}
