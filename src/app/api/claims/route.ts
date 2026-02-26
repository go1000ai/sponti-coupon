import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { generateRedemptionCode } from '@/lib/qr';

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

  // Get the deal with vendor info
  const { data: deal } = await supabase
    .from('deals')
    .select('*, vendor:vendors(id, stripe_payment_link)')
    .eq('id', deal_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
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

  // No deposit required — create claim with QR + redemption code immediately
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
        qr_code_url: `${process.env.NEXT_PUBLIC_APP_URL}/redeem/${qrCode}`,
        redemption_code: redemptionCode,
        expires_at: deal.expires_at,
      })
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    // Increment claims count
    await supabase.rpc('increment_claims_count', { deal_id_param: deal_id });

    return NextResponse.json({
      claim,
      qr_code: qrCode,
      redirect_url: null,
    });
  }

  // Deposit required — create pending claim, redirect to vendor payment
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      deal_id,
      customer_id: user.id,
      session_token: sessionToken,
      deposit_confirmed: false,
      expires_at: deal.expires_at,
    })
    .select()
    .single();

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // Look up vendor's primary active payment method from the new table
  let vendorPaymentLink: string | null = null;

  if (deal.vendor?.id) {
    const { data: primaryMethod } = await supabase
      .from('vendor_payment_methods')
      .select('payment_link')
      .eq('vendor_id', deal.vendor.id)
      .eq('is_primary', true)
      .eq('is_active', true)
      .maybeSingle();

    vendorPaymentLink = primaryMethod?.payment_link || null;
  }

  // Fallback to legacy stripe_payment_link if no new payment method found
  if (!vendorPaymentLink) {
    vendorPaymentLink = deal.vendor?.stripe_payment_link || null;
  }

  // Only allow HTTPS payment links to prevent phishing
  const isValidPaymentLink = vendorPaymentLink
    && vendorPaymentLink.startsWith('https://');

  const redirectUrl = isValidPaymentLink
    ? `${vendorPaymentLink}?client_reference_id=${sessionToken}`
    : null;

  return NextResponse.json({
    claim,
    session_token: sessionToken,
    redirect_url: redirectUrl,
    deposit_amount: deal.deposit_amount,
  });
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
