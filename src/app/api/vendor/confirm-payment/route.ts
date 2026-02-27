import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeId, getRedemptionUrl, generateRedemptionCode } from '@/lib/qr';

// POST /api/vendor/confirm-payment
// Vendor confirms they received a manual payment (Venmo/Zelle/Cash App)
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

  // Fetch claim with deal to verify vendor ownership
  const serviceClient = await createServiceRoleClient();

  const { data: claim } = await serviceClient
    .from('claims')
    .select('*, deal:deals(vendor_id, title, deposit_amount, deal_price)')
    .eq('id', claim_id)
    .single();

  if (!claim || claim.deal?.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Claim not found or unauthorized' }, { status: 404 });
  }

  if (claim.deposit_confirmed) {
    return NextResponse.json({ error: 'Payment already confirmed' }, { status: 400 });
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Claim has expired' }, { status: 400 });
  }

  // Generate codes and confirm
  const qrCode = generateQRCodeId();
  const qrCodeUrl = getRedemptionUrl(qrCode);
  const redemptionCode = generateRedemptionCode();

  const { error: updateError } = await serviceClient
    .from('claims')
    .update({
      deposit_confirmed: true,
      deposit_confirmed_at: new Date().toISOString(),
      qr_code: qrCode,
      qr_code_url: qrCodeUrl,
      redemption_code: redemptionCode,
      deposit_amount_paid: claim.deal?.deposit_amount || claim.deal?.deal_price || 0,
    })
    .eq('id', claim.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Increment claims count
  await serviceClient.rpc('increment_claims_count', { deal_id_param: claim.deal_id });

  return NextResponse.json({
    success: true,
    claim_id: claim.id,
    qr_code: qrCode,
    redemption_code: redemptionCode,
  });
}
