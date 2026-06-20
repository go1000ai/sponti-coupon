import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeId, getRedemptionUrl, generateUniqueRedemptionCode } from '@/lib/qr';

// POST /api/claims/report-deposit
// Customer reports they paid the deposit through the vendor's EXTERNAL merchant link
// (Square/PayPal/Stripe link). We don't withhold the code: we issue the QR + redemption
// code immediately so the customer is never blocked. The deposit is NOT yet verified —
// the vendor confirms it landed in their own merchant account from the notification we
// send or at redemption (deposit_verified_at stays null until then).
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
  }

  const { session_token } = await request.json();
  if (!session_token) {
    return NextResponse.json({ error: 'session_token is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // The claim must belong to this customer, be an unconfirmed external-link deposit, alive.
  const { data: claim } = await serviceClient
    .from('claims')
    .select('*, deal:deals(id, title, deposit_amount, deal_price)')
    .eq('session_token', session_token)
    .eq('customer_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  // Idempotent: if they already reported (e.g. double-tap / refresh), return the issued code.
  if (claim.deposit_confirmed && claim.redemption_code) {
    return NextResponse.json({
      success: true,
      qr_code: claim.qr_code,
      redemption_code: claim.redemption_code,
      payment_reference: claim.payment_reference,
      already_reported: true,
    });
  }

  if (claim.payment_tier !== 'link') {
    return NextResponse.json({ error: 'This claim is not an external-link deposit' }, { status: 400 });
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Claim has expired' }, { status: 400 });
  }

  // Issue the QR + 6-digit code now — the customer reported paying, so they get the code.
  const qrCode = generateQRCodeId();
  const qrCodeUrl = getRedemptionUrl(qrCode);
  const redemptionCode = await generateUniqueRedemptionCode(serviceClient);
  const now = new Date().toISOString();

  const { error: updateError } = await serviceClient
    .from('claims')
    .update({
      deposit_confirmed: true,       // "code issued / claim active" — NOT "money verified"
      deposit_confirmed_at: now,
      deposit_reported_at: now,      // customer says they paid
      // deposit_verified_at stays null until the vendor confirms it on their merchant account
      qr_code: qrCode,
      qr_code_url: qrCodeUrl,
      redemption_code: redemptionCode,
      deposit_amount_paid: claim.deal?.deposit_amount || 0,
    })
    .eq('id', claim.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await serviceClient.rpc('increment_claims_count', { deal_id_param: claim.deal_id });

  // Notify the vendor that a deposit was reported and needs verifying (best-effort).
  try {
    const { notifyVendorDepositReported } = await import('@/lib/email/deposit-notification');
    await notifyVendorDepositReported(serviceClient, claim.id);
  } catch (err) {
    console.error('[report-deposit] vendor notification failed:', err);
  }

  return NextResponse.json({
    success: true,
    qr_code: qrCode,
    redemption_code: redemptionCode,
    payment_reference: claim.payment_reference,
  });
}
