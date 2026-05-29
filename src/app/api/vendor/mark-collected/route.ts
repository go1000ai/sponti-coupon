import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/vendor/mark-collected
// Vendor marks that they collected the remaining balance from the customer
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { redemption_id, amount_collected } = await request.json();

  if (!redemption_id) {
    return NextResponse.json({ error: 'Missing redemption_id' }, { status: 400 });
  }

  // Use service role for both verification AND the update. The redemption row was created
  // by the redeem flow under service role, and RLS on `redemptions` restricts writes to the
  // owning customer — a vendor-context update would silently no-op.
  const serviceClient = await createServiceRoleClient();

  const { data: redemption } = await serviceClient
    .from('redemptions')
    .select('id, vendor_id, collection_completed')
    .eq('id', redemption_id)
    .single();

  if (!redemption) {
    return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
  }

  if (redemption.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Not your redemption' }, { status: 403 });
  }

  if (redemption.collection_completed) {
    return NextResponse.json({ error: 'Already marked as collected' }, { status: 400 });
  }

  // Conditional update + select to confirm a row actually changed. Guards against the
  // unlikely race where two clicks land at the same time.
  const { data: updated, error: updateError } = await serviceClient
    .from('redemptions')
    .update({
      collection_completed: true,
      collection_completed_at: new Date().toISOString(),
      amount_collected: amount_collected || null,
    })
    .eq('id', redemption_id)
    .eq('collection_completed', false)
    .select('id')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || 'Failed to mark as collected' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
