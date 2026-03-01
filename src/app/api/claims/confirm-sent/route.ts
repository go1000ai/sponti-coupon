import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeId, getRedemptionUrl, generateRedemptionCode } from '@/lib/qr';
import { sendPaymentNotification } from '@/lib/email/payment-notification';
import { PAYMENT_PROCESSORS } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/claims/confirm-sent
// Customer self-confirms they've sent a manual payment (Venmo/Zelle/Cash App)
// Immediately generates QR code + redemption code — vendor redeems in person
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { session_token } = await request.json();

  if (!session_token) {
    return NextResponse.json({ error: 'session_token is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch claim — must belong to this customer and be manual tier
  const { data: claim } = await serviceClient
    .from('claims')
    .select('*, deal:deals(id, title, deposit_amount, deal_price, vendor_id, vendor:vendors(id, business_name, email))')
    .eq('session_token', session_token)
    .eq('customer_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.deposit_confirmed) {
    // Already confirmed — return existing codes
    return NextResponse.json({
      success: true,
      already_confirmed: true,
      qr_code: claim.qr_code,
      redemption_code: claim.redemption_code,
    });
  }

  if (claim.payment_tier !== 'manual') {
    return NextResponse.json({ error: 'This endpoint is only for manual payments' }, { status: 400 });
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Claim has expired' }, { status: 400 });
  }

  // Generate codes and confirm
  const qrCode = generateQRCodeId();
  const qrCodeUrl = getRedemptionUrl(qrCode);
  const redemptionCode = generateRedemptionCode();
  const depositAmount = claim.deal?.deposit_amount || claim.deal?.deal_price || 0;

  const { error: updateError } = await serviceClient
    .from('claims')
    .update({
      deposit_confirmed: true,
      deposit_confirmed_at: new Date().toISOString(),
      qr_code: qrCode,
      qr_code_url: qrCodeUrl,
      redemption_code: redemptionCode,
      deposit_amount_paid: depositAmount,
    })
    .eq('id', claim.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Increment claims count
  await serviceClient.rpc('increment_claims_count', { deal_id_param: claim.deal_id });

  // Get customer info for the email
  const { data: customerProfile } = await serviceClient
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  const customerName = customerProfile
    ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || user.email || 'Customer'
    : user.email || 'Customer';

  // Email the vendor about the payment
  const vendor = claim.deal?.vendor;
  if (vendor?.email) {
    const processorName = claim.payment_method_type
      ? PAYMENT_PROCESSORS[claim.payment_method_type as PaymentProcessorType]?.name || claim.payment_method_type
      : 'Manual';

    sendPaymentNotification({
      vendorEmail: vendor.email,
      vendorName: vendor.business_name || 'Vendor',
      customerName,
      customerEmail: user.email || '',
      dealTitle: claim.deal?.title || 'Deal',
      amount: depositAmount,
      processor: processorName,
      paymentReference: claim.payment_reference || '',
      dashboardUrl: `${APP_URL}/vendor/payments`,
    }).catch(err => console.error('[ConfirmSent] Email error:', err));
  }

  return NextResponse.json({
    success: true,
    qr_code: qrCode,
    qr_code_url: qrCodeUrl,
    redemption_code: redemptionCode,
  });
}
