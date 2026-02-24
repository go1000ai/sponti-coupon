import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/claims/cancel — Customer forfeits/cancels an active claim
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

  // Get claim — only if it belongs to the current customer
  const { data: claim } = await supabase
    .from('claims')
    .select('id, deal_id, redeemed, expires_at, deposit_confirmed')
    .eq('id', claim_id)
    .eq('customer_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.redeemed) {
    return NextResponse.json({ error: 'Cannot cancel a redeemed coupon' }, { status: 400 });
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This coupon has already expired' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Delete the claim (frees up a slot for someone else)
  const { error: deleteError } = await serviceClient
    .from('claims')
    .delete()
    .eq('id', claim_id);

  if (deleteError) {
    console.error('Failed to cancel claim:', deleteError);
    return NextResponse.json({ error: 'Failed to cancel coupon' }, { status: 500 });
  }

  // Decrement claims_count on the deal (only if deposit was confirmed, since that's when we incremented)
  if (claim.deposit_confirmed) {
    await serviceClient.rpc('decrement_claims_count', { deal_id_param: claim.deal_id });
  }

  return NextResponse.json({
    success: true,
    message: 'Coupon cancelled successfully. Note: deposits are non-refundable.',
  });
}
