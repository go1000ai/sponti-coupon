import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/vendor/cancel-redemption
// Vendor cancels a redemption when customer refuses to pay the remaining balance.
// Reverses: claim status, loyalty awards, SpontiPoints, and deletes the redemption record.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { redemption_id } = await request.json();

  if (!redemption_id) {
    return NextResponse.json({ error: 'Missing redemption_id' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Verify ownership using the service-role read (consistent with the rest of this handler).
  const { data: redemption } = await serviceClient
    .from('redemptions')
    .select('id, vendor_id, claim_id, customer_id, collection_completed')
    .eq('id', redemption_id)
    .single();

  if (!redemption) {
    return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
  }

  if (redemption.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Not your redemption' }, { status: 403 });
  }

  if (redemption.collection_completed) {
    return NextResponse.json({ error: 'Payment already collected — cannot cancel' }, { status: 400 });
  }

  // ATOMIC: delete the redemption row with a `collection_completed = false` guard. If the
  // Stripe Connect webhook fires between the check above and this delete, the row will already
  // have `collection_completed = true` and the delete returns 0 rows — we bail before reversing
  // anything. Prevents the race "customer paid, redemption record gone, claim restored".
  const { data: deletedRows, error: deleteError } = await serviceClient
    .from('redemptions')
    .delete()
    .eq('id', redemption_id)
    .eq('collection_completed', false)
    .select('id');

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  if (!deletedRows || deletedRows.length === 0) {
    return NextResponse.json({
      error: 'Payment was just collected — cannot cancel',
      code: 'COLLECTED_DURING_CANCEL',
    }, { status: 409 });
  }

  // 1. Reverse claim — mark as unredeemed
  await serviceClient
    .from('claims')
    .update({ redeemed: false, redeemed_at: null })
    .eq('id', redemption.claim_id);

  // 2. Reverse loyalty transactions linked to this redemption
  const { data: loyaltyTxns } = await serviceClient
    .from('loyalty_transactions')
    .select('id, card_id, transaction_type, punches_amount, points_amount')
    .eq('redemption_id', redemption_id);

  if (loyaltyTxns && loyaltyTxns.length > 0) {
    for (const txn of loyaltyTxns) {
      if (txn.transaction_type === 'earn_punch' && txn.punches_amount) {
        // Decrement punch count
        const { data: card } = await serviceClient
          .from('loyalty_cards')
          .select('current_punches, total_punches_earned')
          .eq('id', txn.card_id)
          .single();

        if (card) {
          await serviceClient
            .from('loyalty_cards')
            .update({
              current_punches: Math.max(0, card.current_punches - txn.punches_amount),
              total_punches_earned: Math.max(0, card.total_punches_earned - txn.punches_amount),
            })
            .eq('id', txn.card_id);
        }
      } else if (txn.transaction_type === 'earn_points' && txn.points_amount) {
        // Decrement point count
        const { data: card } = await serviceClient
          .from('loyalty_cards')
          .select('current_points, total_points_earned')
          .eq('id', txn.card_id)
          .single();

        if (card) {
          await serviceClient
            .from('loyalty_cards')
            .update({
              current_points: Math.max(0, card.current_points - txn.points_amount),
              total_points_earned: Math.max(0, card.total_points_earned - txn.points_amount),
            })
            .eq('id', txn.card_id);
        }
      }
    }

    // Delete the loyalty transactions
    await serviceClient
      .from('loyalty_transactions')
      .delete()
      .eq('redemption_id', redemption_id);
  }

  // 3. Reverse SpontiPoints
  await serviceClient
    .from('spontipoints_ledger')
    .delete()
    .eq('redemption_id', redemption_id);

  // 4. Delete the redemption record
  await serviceClient
    .from('redemptions')
    .delete()
    .eq('id', redemption_id);

  return NextResponse.json({ success: true });
}
