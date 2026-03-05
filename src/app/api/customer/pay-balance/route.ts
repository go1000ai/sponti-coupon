import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/customer/pay-balance
// Customer creates a Stripe Checkout Session to pay the remaining balance on their redeemed deal.
// 100% goes to vendor's connected Stripe account — no application fee.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claim_id } = await request.json();

  if (!claim_id) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch the claim — must belong to this customer and be redeemed
  const { data: claim } = await serviceClient
    .from('claims')
    .select('*, deal:deals(id, title, deal_price, deposit_amount, vendor_id)')
    .eq('id', claim_id)
    .eq('customer_id', user.id)
    .eq('redeemed', true)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found or not redeemed' }, { status: 404 });
  }

  const depositPaid = claim.deal?.deposit_amount || 0;
  const dealPrice = claim.deal?.deal_price || 0;
  const remainingBalance = Math.max(0, dealPrice - depositPaid);

  if (remainingBalance <= 0) {
    return NextResponse.json({ error: 'No balance remaining' }, { status: 400 });
  }

  // Check if already collected
  const { data: redemption } = await serviceClient
    .from('redemptions')
    .select('id, collection_completed')
    .eq('claim_id', claim_id)
    .single();

  if (redemption?.collection_completed) {
    return NextResponse.json({ error: 'Balance already paid' }, { status: 400 });
  }

  // Get vendor's Stripe Connect info
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('stripe_connect_account_id, stripe_connect_charges_enabled, business_name')
    .eq('id', claim.deal.vendor_id)
    .single();

  if (!vendor?.stripe_connect_account_id || !vendor.stripe_connect_charges_enabled) {
    return NextResponse.json({
      error: 'This vendor does not accept online payments. Please pay in person.',
      code: 'NO_STRIPE',
    }, { status: 400 });
  }

  // Get customer name for description
  const { data: customer } = await serviceClient
    .from('customers')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  const customerName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer';

  const stripe = getStripe();
  const amountCents = Math.round(remainingBalance * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${claim.deal.title} — Remaining Balance`,
            description: `Payment to ${vendor.business_name} via SpontiCoupon`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${APP_URL}/dashboard/my-deals?paid=true&claim_id=${claim_id}`,
    cancel_url: `${APP_URL}/dashboard/my-deals`,
    payment_intent_data: {
      transfer_data: {
        destination: vendor.stripe_connect_account_id,
      },
      description: `SpontiCoupon balance — ${claim.deal.title} (${customerName})`,
    },
    metadata: {
      claim_id,
      redemption_id: redemption?.id || '',
      vendor_id: claim.deal.vendor_id,
      customer_id: user.id,
      source: 'sponticoupon_customer_balance',
    },
  });

  return NextResponse.json({ checkout_url: session.url, session_id: session.id });
}
