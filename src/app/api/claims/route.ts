import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { generateRedemptionCode } from '@/lib/qr';
import { getStripe } from '@/lib/stripe';

/** Generate a short payment reference code like SC-4829 for manual payments */
function generatePaymentReference(): string {
  const num = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `SC-${num}`;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/claims - Create a new claim on a deal
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Must be logged in to claim a deal' }, { status: 401 });
  }

  const { deal_id } = await request.json();

  // Ensure customer record exists (FK requirement: claims.customer_id -> customers.id)
  const serviceClient = await createServiceRoleClient();
  const { data: existingCustomer } = await serviceClient
    .from('customers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existingCustomer) {
    await serviceClient.from('customers').insert({
      id: user.id,
      email: user.email || '',
    });
  }

  // Get the deal with vendor info (include Stripe Connect fields)
  const { data: deal } = await supabase
    .from('deals')
    .select('*, vendor:vendors(id, business_name, stripe_payment_link, stripe_connect_account_id, stripe_connect_charges_enabled)')
    .eq('id', deal_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  // Vendors cannot claim their own deals
  if (deal.vendor?.id === user.id) {
    return NextResponse.json({ error: 'You cannot claim your own deal' }, { status: 403 });
  }

  if (deal.status !== 'active') {
    return NextResponse.json({ error: 'Deal is no longer active' }, { status: 400 });
  }

  if (new Date(deal.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Deal has expired' }, { status: 400 });
  }

  if (deal.max_claims && deal.claims_count >= deal.max_claims) {
    return NextResponse.json({ error: 'Deal has reached maximum claims' }, { status: 400 });
  }

  // Check if customer already has an active claim on this deal
  const { data: existingClaim } = await supabase
    .from('claims')
    .select('id')
    .eq('deal_id', deal_id)
    .eq('customer_id', user.id)
    .eq('redeemed', false)
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (existingClaim) {
    return NextResponse.json({ error: 'You already have an active claim on this deal' }, { status: 400 });
  }

  const sessionToken = uuidv4();

  // ── No deposit required — instant QR + redemption code ──
  if (!deal.deposit_amount || deal.deposit_amount <= 0) {
    const qrCode = uuidv4();
    const redemptionCode = generateRedemptionCode();
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        deal_id,
        customer_id: user.id,
        session_token: sessionToken,
        deposit_confirmed: true,
        deposit_confirmed_at: new Date().toISOString(),
        qr_code: qrCode,
        qr_code_url: `${APP_URL}/redeem/${qrCode}`,
        redemption_code: redemptionCode,
        expires_at: deal.expires_at,
        payment_tier: null,
        payment_method_type: null,
      })
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    await supabase.rpc('increment_claims_count', { deal_id_param: deal_id });

    return NextResponse.json({
      claim,
      qr_code: qrCode,
      redirect_url: null,
      payment_tier: null,
    });
  }

  // ── Deposit required — determine payment tier ──

  const vendorId = deal.vendor?.id;
  const hasStripeConnect = deal.vendor?.stripe_connect_account_id
    && deal.vendor?.stripe_connect_charges_enabled;

  // Check vendor's primary payment method
  let primaryMethod: { processor_type: string; payment_link: string; payment_tier: string; display_name: string | null } | null = null;

  if (vendorId) {
    const { data } = await supabase
      .from('vendor_payment_methods')
      .select('processor_type, payment_link, payment_tier, display_name')
      .eq('vendor_id', vendorId)
      .eq('is_primary', true)
      .eq('is_active', true)
      .maybeSingle();
    primaryMethod = data;
  }

  // ── TIER 1: Integrated (Stripe Connect) ──
  if (hasStripeConnect && primaryMethod?.payment_tier === 'integrated') {
    const depositAmount = deal.deposit_amount || deal.deal_price;
    const amountCents = Math.round(depositAmount * 100);

    // Create pending claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        deal_id,
        customer_id: user.id,
        session_token: sessionToken,
        deposit_confirmed: false,
        expires_at: deal.expires_at,
        payment_method_type: 'stripe',
        payment_tier: 'integrated',
      })
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    try {
      // Create Stripe Checkout Session on the connected account
      const checkoutSession = await getStripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit: ${deal.title}`,
              description: `Deposit for deal at ${deal.vendor?.business_name || 'vendor'}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        metadata: {
          claim_id: claim.id,
          session_token: sessionToken,
          vendor_id: vendorId!,
          type: 'deal_deposit',
        },
        success_url: `${APP_URL}/claim/callback?session_token=${sessionToken}&payment_tier=integrated`,
        cancel_url: `${APP_URL}/deals/${deal_id}?deposit_canceled=true`,
      }, {
        stripeAccount: deal.vendor!.stripe_connect_account_id!,
      });

      // Store checkout session ID on the claim
      await supabase
        .from('claims')
        .update({ stripe_checkout_session_id: checkoutSession.id })
        .eq('id', claim.id);

      return NextResponse.json({
        claim,
        session_token: sessionToken,
        redirect_url: checkoutSession.url,
        payment_tier: 'integrated',
        deposit_amount: depositAmount,
      });
    } catch (stripeError) {
      console.error('[Claims] Stripe Connect checkout error:', stripeError);
      // Clean up the pending claim
      await supabase.from('claims').delete().eq('id', claim.id);
      return NextResponse.json(
        { error: 'Failed to create payment checkout. Please try again.' },
        { status: 500 }
      );
    }
  }

  // ── TIER 2: Manual (Venmo, Zelle, Cash App) ──
  const manualProcessors = ['venmo', 'zelle', 'cashapp'];
  if (primaryMethod && manualProcessors.includes(primaryMethod.processor_type)) {
    const depositAmount = deal.deposit_amount || deal.deal_price;
    const paymentReference = generatePaymentReference();

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        deal_id,
        customer_id: user.id,
        session_token: sessionToken,
        deposit_confirmed: false,
        expires_at: deal.expires_at,
        payment_method_type: primaryMethod.processor_type,
        payment_tier: 'manual',
        payment_reference: paymentReference,
      })
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    return NextResponse.json({
      claim,
      session_token: sessionToken,
      redirect_url: null,
      payment_tier: 'manual',
      payment_instructions: {
        processor: primaryMethod.processor_type,
        display_name: primaryMethod.display_name,
        payment_info: primaryMethod.payment_link,
        amount: depositAmount,
        deal_title: deal.title,
        payment_reference: paymentReference,
      },
      deposit_amount: depositAmount,
    });
  }

  // ── TIER 3: Legacy static payment link (Stripe/Square/PayPal link) ──
  if (primaryMethod && primaryMethod.payment_link.startsWith('https://')) {
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        deal_id,
        customer_id: user.id,
        session_token: sessionToken,
        deposit_confirmed: false,
        expires_at: deal.expires_at,
        payment_method_type: primaryMethod.processor_type,
        payment_tier: 'link',
      })
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    return NextResponse.json({
      claim,
      session_token: sessionToken,
      redirect_url: `${primaryMethod.payment_link}?client_reference_id=${sessionToken}`,
      payment_tier: 'link',
      deposit_amount: deal.deposit_amount,
    });
  }

  // ── Fallback: legacy stripe_payment_link on vendor record ──
  const legacyLink = deal.vendor?.stripe_payment_link;
  if (legacyLink && legacyLink.startsWith('https://')) {
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        deal_id,
        customer_id: user.id,
        session_token: sessionToken,
        deposit_confirmed: false,
        expires_at: deal.expires_at,
        payment_method_type: 'stripe',
        payment_tier: 'link',
      })
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    return NextResponse.json({
      claim,
      session_token: sessionToken,
      redirect_url: `${legacyLink}?client_reference_id=${sessionToken}`,
      payment_tier: 'link',
      deposit_amount: deal.deposit_amount,
    });
  }

  // No payment method configured
  return NextResponse.json(
    { error: 'This vendor has not configured a payment method for deposits. Please contact the business directly.' },
    { status: 400 }
  );
}

// GET /api/claims - Get customer's claims
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // active, expired, redeemed

  let query = supabase
    .from('claims')
    .select('*, deal:deals(*, vendor:vendors(business_name, logo_url, address, city, state, zip, phone, email, website, description, business_hours))')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (status === 'active') {
    query = query.eq('redeemed', false).gte('expires_at', new Date().toISOString());
  } else if (status === 'expired') {
    query = query.eq('redeemed', false).lt('expires_at', new Date().toISOString());
  } else if (status === 'redeemed') {
    query = query.eq('redeemed', true);
  }

  const { data: claims, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ claims });
}
