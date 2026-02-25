import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeDataUrl } from '@/lib/qr';

// GET /api/admin/claims/qr-code?claim_id=xxx — Generate QR code image for any claim (admin)
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const claimId = request.nextUrl.searchParams.get('claim_id');
  if (!claimId) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: claim, error } = await serviceClient
    .from('claims')
    .select('qr_code, redemption_code')
    .eq('id', claimId)
    .single();

  if (error || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (!claim.qr_code) {
    return NextResponse.json({
      error: 'No QR code available for this claim. Use generate_codes action first.',
      redemption_code: claim.redemption_code,
    }, { status: 400 });
  }

  const dataUrl = await generateQRCodeDataUrl(claim.qr_code);

  return NextResponse.json({
    qr_data_url: dataUrl,
    qr_code: claim.qr_code,
    redemption_code: claim.redemption_code,
  });
}
