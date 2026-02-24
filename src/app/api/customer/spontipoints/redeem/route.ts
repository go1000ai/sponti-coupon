import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/customer/spontipoints/redeem — Redeem SpontiPoints for account credit
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { points } = body;

  if (!points || typeof points !== 'number' || points < 500) {
    return NextResponse.json(
      { error: 'Minimum redemption is 500 SpontiPoints.' },
      { status: 400 }
    );
  }

  // Must be a multiple of 100
  if (points % 100 !== 0) {
    return NextResponse.json(
      { error: 'Points must be redeemed in multiples of 100.' },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceRoleClient();

  // Check balance
  const { data: balance } = await serviceClient
    .rpc('get_spontipoints_balance', { p_user_id: user.id });

  const currentBalance = balance || 0;

  if (currentBalance < points) {
    return NextResponse.json(
      { error: `Insufficient balance. You have ${currentBalance} points but tried to redeem ${points}.` },
      { status: 400 }
    );
  }

  const creditAmount = points / 100; // 100 pts = $1

  // Create redemption record (DB CHECK constraint ensures points_used >= 500)
  const { data: redemption, error: redeemError } = await serviceClient
    .from('spontipoints_redemptions')
    .insert({
      user_id: user.id,
      points_used: points,
      credit_amount: creditAmount,
    })
    .select()
    .single();

  if (redeemError) {
    console.error('[POST /api/customer/spontipoints/redeem] Error:', redeemError);
    return NextResponse.json({ error: 'Failed to redeem points.' }, { status: 500 });
  }

  // Create ledger entry for the spend
  await serviceClient
    .from('spontipoints_ledger')
    .insert({
      user_id: user.id,
      points: -points,
      reason: 'spend_credit',
    });

  // Get updated balance
  const { data: newBalance } = await serviceClient
    .rpc('get_spontipoints_balance', { p_user_id: user.id });

  return NextResponse.json({
    success: true,
    redemption_id: redemption.id,
    points_used: points,
    credit_amount: creditAmount,
    new_balance: newBalance || 0,
    message: `Successfully redeemed ${points} SpontiPoints for $${creditAmount.toFixed(2)} credit!`,
  });
}
