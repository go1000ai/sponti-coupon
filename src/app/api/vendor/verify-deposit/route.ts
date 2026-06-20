import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { resolveVendorContext } from '@/lib/workers/context';

// POST /api/vendor/verify-deposit
// Vendor (or permitted staff) confirms an EXTERNAL-merchant deposit actually landed in
// their own account (they matched the reference code + amount in their Square/PayPal/etc.
// dashboard). This does NOT issue the redemption code — the customer already has it. It only
// stamps deposit_verified_at so the deposit shows as verified on the redemption screen and
// clears from the "deposits to verify" queue.
export async function POST(request: NextRequest) {
  // Same authorization surface as redemption: the owner, or a worker with redeem permission.
  const ctx = await resolveVendorContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Only vendors or staff can verify deposits' }, { status: 403 });
  }
  if (ctx.isWorker && !ctx.permissions.redeem) {
    return NextResponse.json({ error: 'You do not have permission to verify deposits' }, { status: 403 });
  }

  const { claim_id } = await request.json();
  if (!claim_id) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: claim } = await serviceClient
    .from('claims')
    .select('id, deposit_verified_at, deal:deals(vendor_id)')
    .eq('id', claim_id)
    .single();

  const deal = Array.isArray(claim?.deal) ? claim.deal[0] : claim?.deal;
  if (!claim || deal?.vendor_id !== ctx.vendorId) {
    return NextResponse.json({ error: 'Claim not found or unauthorized' }, { status: 404 });
  }

  if (claim.deposit_verified_at) {
    return NextResponse.json({ success: true, already_verified: true });
  }

  const { error: updateError } = await serviceClient
    .from('claims')
    .update({ deposit_verified_at: new Date().toISOString() })
    .eq('id', claim.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
