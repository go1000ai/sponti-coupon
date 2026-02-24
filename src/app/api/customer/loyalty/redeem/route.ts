import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/customer/loyalty/redeem — Redeem a loyalty reward
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { card_id, reward_id } = body;

  if (!card_id) {
    return NextResponse.json({ error: 'card_id is required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Get the loyalty card and verify ownership
  const { data: card } = await serviceClient
    .from('loyalty_cards')
    .select('*, program:loyalty_programs(*)')
    .eq('id', card_id)
    .eq('customer_id', user.id)
    .single();

  if (!card) {
    return NextResponse.json({ error: 'Loyalty card not found.' }, { status: 404 });
  }

  const program = card.program;
  if (!program || !program.is_active) {
    return NextResponse.json({ error: 'This loyalty program is no longer active.' }, { status: 400 });
  }

  if (program.program_type === 'punch_card') {
    // Punch card redemption — check if enough punches
    if (card.current_punches < program.punches_required) {
      return NextResponse.json({
        error: `You need ${program.punches_required - card.current_punches} more stamps to earn your reward.`,
      }, { status: 400 });
    }

    // Deduct punches and create transaction
    const newPunches = card.current_punches - program.punches_required;

    await serviceClient
      .from('loyalty_cards')
      .update({ current_punches: newPunches })
      .eq('id', card.id);

    await serviceClient.from('loyalty_transactions').insert({
      card_id: card.id,
      customer_id: user.id,
      vendor_id: card.vendor_id,
      transaction_type: 'redeem_punch_reward',
      punches_amount: -program.punches_required,
      description: `Redeemed reward: ${program.punch_reward}`,
    });

    return NextResponse.json({
      success: true,
      reward_name: program.punch_reward,
      remaining_punches: newPunches,
    });
  }

  if (program.program_type === 'points') {
    // Points redemption — requires reward_id
    if (!reward_id) {
      return NextResponse.json({ error: 'reward_id is required for points programs.' }, { status: 400 });
    }

    const { data: reward } = await serviceClient
      .from('loyalty_rewards')
      .select('*')
      .eq('id', reward_id)
      .eq('program_id', program.id)
      .eq('is_active', true)
      .single();

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found or inactive.' }, { status: 404 });
    }

    if (card.current_points < reward.points_cost) {
      return NextResponse.json({
        error: `You need ${reward.points_cost - card.current_points} more points to redeem this reward.`,
      }, { status: 400 });
    }

    // Deduct points
    const newPoints = card.current_points - reward.points_cost;

    await serviceClient
      .from('loyalty_cards')
      .update({
        current_points: newPoints,
        total_points_redeemed: card.total_points_redeemed + reward.points_cost,
      })
      .eq('id', card.id);

    await serviceClient.from('loyalty_transactions').insert({
      card_id: card.id,
      customer_id: user.id,
      vendor_id: card.vendor_id,
      reward_id: reward.id,
      transaction_type: 'redeem_points_reward',
      points_amount: -reward.points_cost,
      description: `Redeemed reward: ${reward.name}`,
    });

    return NextResponse.json({
      success: true,
      reward_name: reward.name,
      remaining_points: newPoints,
    });
  }

  return NextResponse.json({ error: 'Unknown program type.' }, { status: 400 });
}
