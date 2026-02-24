import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateQRCodeDataUrl } from '@/lib/qr';

// GET /api/claims/qr-code?claim_id=xxx — Generate QR code image for a claim
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claimId = request.nextUrl.searchParams.get('claim_id');
  if (!claimId) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  // Get claim — only if it belongs to the current customer
  const { data: claim } = await supabase
    .from('claims')
    .select('qr_code, customer_id')
    .eq('id', claimId)
    .eq('customer_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (!claim.qr_code) {
    return NextResponse.json({ error: 'No QR code available (deposit may not be confirmed yet)' }, { status: 400 });
  }

  const dataUrl = await generateQRCodeDataUrl(claim.qr_code);

  return NextResponse.json({ qr_data_url: dataUrl });
}
