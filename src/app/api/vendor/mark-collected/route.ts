import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  // Verify this redemption belongs to the vendor
  const { data: redemption } = await supabase
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

  const { error: updateError } = await supabase
    .from('redemptions')
    .update({
      collection_completed: true,
      collection_completed_at: new Date().toISOString(),
      amount_collected: amount_collected || null,
    })
    .eq('id', redemption_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
