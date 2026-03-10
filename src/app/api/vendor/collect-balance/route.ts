import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { getSquareForVendor } from '@/lib/square';
import { getValidSquareToken } from '@/lib/square-token';
import { createOrder as createPayPalOrder } from '@/lib/paypal';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/vendor/collect-balance
// Creates a checkout session on the vendor's connected payment processor
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

  const { redemption_id, amount, deal_title, customer_name, processor = 'stripe' } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'No balance to collect' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // --- PayPal branch ---
  if (processor === 'paypal') {
    const { data: vendor } = await serviceClient
      .from('vendors')
      .select('paypal_connect_merchant_id, paypal_connect_charges_enabled, business_name')
      .eq('id', user.id)
      .single();

    if (!vendor?.paypal_connect_merchant_id) {
      return NextResponse.json({
        error: 'No PayPal account connected. Go to Payments → PayPal Connect to link your account.',
        code: 'NO_PAYPAL_CONNECT',
      }, { status: 400 });
    }

    if (!vendor.paypal_connect_charges_enabled) {
      return NextResponse.json({
        error: 'Your PayPal account is not yet active. Complete PayPal onboarding to accept payments.',
        code: 'PAYPAL_NOT_ACTIVE',
      }, { status: 400 });
    }

    const lineItemName = deal_title
      ? `${deal_title} — Remaining Balance`
      : 'Deal Remaining Balance';

    // PayPal return URL goes to capture route (PayPal requires explicit capture)
    const returnUrl = `${APP_URL}/api/paypal/capture`;
    const cancelUrl = `${APP_URL}/vendor/scan`;

    const order = await createPayPalOrder(
      vendor.paypal_connect_merchant_id,
      amount,
      lineItemName,
      returnUrl,
      cancelUrl
    );

    const approveLink = order.links.find(l => l.rel === 'approve')?.href;
    if (!approveLink) {
      return NextResponse.json({ error: 'PayPal did not return an approval link' }, { status: 500 });
    }

    // Store the order ID on the claim for webhook tracking
    if (redemption_id) {
      await serviceClient
        .from('claims')
        .update({ paypal_checkout_order_id: order.id })
        .eq('id', redemption_id);
    }

    return NextResponse.json({
      checkout_url: approveLink,
      paypal_order_id: order.id,
      processor: 'paypal',
    });
  }

  // --- Square branch ---
  if (processor === 'square') {
    const { data: vendor } = await serviceClient
      .from('vendors')
      .select('square_connect_merchant_id, square_connect_charges_enabled, square_connect_location_id, business_name')
      .eq('id', user.id)
      .single();

    if (!vendor?.square_connect_merchant_id) {
      return NextResponse.json({
        error: 'No Square account connected. Go to Payments → Square Connect to link your account.',
        code: 'NO_SQUARE_CONNECT',
      }, { status: 400 });
    }

    if (!vendor.square_connect_charges_enabled) {
      return NextResponse.json({
        error: 'Your Square account is not yet active. Complete Square onboarding to accept payments.',
        code: 'SQUARE_NOT_ACTIVE',
      }, { status: 400 });
    }

    if (!vendor.square_connect_location_id) {
      return NextResponse.json({
        error: 'No Square location found. Please reconnect your Square account.',
        code: 'NO_SQUARE_LOCATION',
      }, { status: 400 });
    }

    const accessToken = await getValidSquareToken(serviceClient, user.id);
    if (!accessToken) {
      return NextResponse.json({
        error: 'Square token expired. Please reconnect your Square account.',
        code: 'SQUARE_TOKEN_EXPIRED',
      }, { status: 400 });
    }

    const squareClient = getSquareForVendor(accessToken);
    const amountCents = Math.round(amount * 100);

    const lineItemName = deal_title
      ? `${deal_title} — Remaining Balance`
      : 'Deal Remaining Balance';

    const paymentLink = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: `${redemption_id || user.id}-${Date.now()}`,
      quickPay: {
        name: lineItemName,
        priceMoney: {
          amount: BigInt(amountCents),
          currency: 'USD',
        },
        locationId: vendor.square_connect_location_id,
      },
      checkoutOptions: {
        redirectUrl: `${APP_URL}/payment-success?square_order=true`,
      },
    });

    const orderId = paymentLink.relatedResources?.orders?.[0]?.id || null;

    // Store the order ID on the claim for webhook tracking
    if (redemption_id && orderId) {
      await serviceClient
        .from('claims')
        .update({ square_checkout_order_id: orderId })
        .eq('id', redemption_id);
    }

    return NextResponse.json({
      checkout_url: paymentLink.paymentLink?.url,
      order_id: orderId,
      processor: 'square',
    });
  }

  // --- Stripe branch (default) ---
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('stripe_connect_account_id, stripe_connect_charges_enabled, business_name')
    .eq('id', user.id)
    .single();

  if (!vendor?.stripe_connect_account_id) {
    return NextResponse.json({
      error: 'No Stripe account connected. Go to Settings → Stripe Connect to link your account.',
      code: 'NO_STRIPE_CONNECT',
    }, { status: 400 });
  }

  if (!vendor.stripe_connect_charges_enabled) {
    return NextResponse.json({
      error: 'Your Stripe account is not yet active. Complete Stripe onboarding in Settings to accept payments.',
      code: 'STRIPE_NOT_ACTIVE',
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

  return NextResponse.json({ checkout_url: session.url, session_id: session.id, processor: 'stripe' });
}
