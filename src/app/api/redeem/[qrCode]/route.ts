import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST /api/redeem/[qrCode] - Vendor scans and redeems a QR code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  const { qrCode } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the user is a vendor
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can redeem QR codes' }, { status: 403 });
  }

  // Find the claim by QR code
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select('*, deal:deals(*), customer:customers(first_name, last_name, email)')
    .eq('qr_code', qrCode)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({
      error: 'Invalid QR code',
      code: 'INVALID',
    }, { status: 404 });
  }

  // Verify this QR belongs to the vendor's deal
  if (claim.deal?.vendor_id !== user.id) {
    return NextResponse.json({
      error: 'This QR code is not for your deal',
      code: 'WRONG_VENDOR',
    }, { status: 403 });
  }

  // Check if already redeemed
  if (claim.redeemed) {
    return NextResponse.json({
      error: 'This QR code has already been redeemed',
      code: 'ALREADY_REDEEMED',
      redeemed_at: claim.redeemed_at,
    }, { status: 400 });
  }

  // Check if expired
  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({
      error: 'This QR code has expired',
      code: 'EXPIRED',
      expired_at: claim.expires_at,
    }, { status: 400 });
  }

  // Check if deposit was confirmed (for sponti coupons)
  if (!claim.deposit_confirmed) {
    return NextResponse.json({
      error: 'Deposit has not been confirmed for this claim',
      code: 'NO_DEPOSIT',
    }, { status: 400 });
  }

  // Mark as redeemed
  const { error: updateError } = await supabase
    .from('claims')
    .update({
      redeemed: true,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', claim.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create redemption record
  await supabase.from('redemptions').insert({
    claim_id: claim.id,
    deal_id: claim.deal_id,
    vendor_id: user.id,
    customer_id: claim.customer_id,
    scanned_by: user.id,
  });

  return NextResponse.json({
    success: true,
    customer: {
      name: `${claim.customer?.first_name || ''} ${claim.customer?.last_name || ''}`.trim(),
      email: claim.customer?.email,
    },
    deal: {
      title: claim.deal?.title,
      deal_price: claim.deal?.deal_price,
      original_price: claim.deal?.original_price,
      discount_percentage: claim.deal?.discount_percentage,
    },
    redeemed_at: new Date().toISOString(),
  });
}

// GET /api/redeem/[qrCode] - Check QR code status (for customer view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  const { qrCode } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: claim } = await supabase
    .from('claims')
    .select('*, deal:deals(title, deal_price, original_price, discount_percentage, expires_at, vendor_id, vendor:vendors(business_name))')
    .eq('qr_code', qrCode)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Invalid QR code', code: 'INVALID' }, { status: 404 });
  }

  return NextResponse.json({
    status: claim.redeemed ? 'redeemed' : new Date(claim.expires_at) < new Date() ? 'expired' : 'valid',
    claim: {
      id: claim.id,
      redeemed: claim.redeemed,
      redeemed_at: claim.redeemed_at,
      expires_at: claim.expires_at,
      deal: claim.deal,
    },
  });
}
