import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/claims/transfer — Transfer a coupon to another customer by email
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claim_id, recipient_email } = await request.json();

  if (!claim_id || !recipient_email) {
    return NextResponse.json({ error: 'claim_id and recipient_email are required' }, { status: 400 });
  }

  const normalizedEmail = recipient_email.trim().toLowerCase();

  // Can't transfer to yourself
  if (normalizedEmail === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot transfer a coupon to yourself' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Get the claim — only if it belongs to the current customer
  const { data: claim } = await serviceClient
    .from('claims')
    .select('id, deal_id, customer_id, redeemed, expires_at, deposit_confirmed')
    .eq('id', claim_id)
    .eq('customer_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.redeemed) {
    return NextResponse.json({ error: 'Cannot transfer a redeemed coupon' }, { status: 400 });
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Cannot transfer an expired coupon' }, { status: 400 });
  }

  if (!claim.deposit_confirmed) {
    return NextResponse.json({ error: 'Cannot transfer a coupon with pending deposit' }, { status: 400 });
  }

  // Find the recipient customer by email
  const { data: recipient } = await serviceClient
    .from('customers')
    .select('id, email')
    .eq('email', normalizedEmail)
    .single();

  if (!recipient) {
    return NextResponse.json({
      error: 'No account found with that email address. The recipient must have a SpontiCoupon account.',
    }, { status: 404 });
  }

  // Check if recipient already has an active claim on this deal
  const { data: existingClaim } = await serviceClient
    .from('claims')
    .select('id')
    .eq('deal_id', claim.deal_id)
    .eq('customer_id', recipient.id)
    .eq('redeemed', false)
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (existingClaim) {
    return NextResponse.json({
      error: 'The recipient already has an active coupon for this deal',
    }, { status: 400 });
  }

  // Transfer: update the claim's customer_id
  const { error: transferError } = await serviceClient
    .from('claims')
    .update({ customer_id: recipient.id })
    .eq('id', claim_id);

  if (transferError) {
    console.error('Failed to transfer claim:', transferError);
    return NextResponse.json({ error: 'Failed to transfer coupon' }, { status: 500 });
  }

  // Record the transfer in the audit log
  await serviceClient
    .from('claim_transfers')
    .insert({
      claim_id,
      from_customer_id: user.id,
      to_customer_id: recipient.id,
    });

  return NextResponse.json({
    success: true,
    message: `Coupon transferred to ${normalizedEmail} successfully.`,
    recipient_email: normalizedEmail,
  });
}
