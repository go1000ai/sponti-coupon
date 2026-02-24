import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

async function getVendorWithTierCheck(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].loyalty_program) {
    return { error: 'Loyalty programs require a Pro plan or higher.', status: 403 };
  }

  return { user, tier };
}

// GET /api/vendor/loyalty — Get all vendor loyalty programs + rewards + stats
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Support single-program query via ?id=
  const programId = request.nextUrl.searchParams.get('id');

  if (programId) {
    // Single program detail
    const { data: program } = await serviceClient
      .from('loyalty_programs')
      .select('*')
      .eq('id', programId)
      .eq('vendor_id', user.id)
      .single();

    if (!program) {
      return NextResponse.json({ program: null, rewards: [], stats: null });
    }

    const { data: rewards } = await serviceClient
      .from('loyalty_rewards')
      .select('*')
      .eq('program_id', program.id)
      .order('sort_order', { ascending: true });

    // Stats for this program
    const { count: totalMembers } = await serviceClient
      .from('loyalty_cards')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', program.id);

    const { data: cardStats } = await serviceClient
      .from('loyalty_cards')
      .select('total_punches_earned, total_points_earned')
      .eq('program_id', program.id);

    const totalPunches = cardStats?.reduce((sum, c) => sum + (c.total_punches_earned || 0), 0) || 0;
    const totalPoints = cardStats?.reduce((sum, c) => sum + (c.total_points_earned || 0), 0) || 0;

    const { count: rewardsRedeemed } = await serviceClient
      .from('loyalty_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .in('transaction_type', ['redeem_punch_reward', 'redeem_points_reward']);

    return NextResponse.json({
      program,
      rewards: rewards || [],
      stats: {
        total_members: totalMembers || 0,
        total_punches: totalPunches,
        total_points: totalPoints,
        rewards_redeemed: rewardsRedeemed || 0,
      },
    });
  }

  // All programs for vendor
  const { data: programs } = await serviceClient
    .from('loyalty_programs')
    .select('*')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false });

  if (!programs || programs.length === 0) {
    return NextResponse.json({ programs: [], program: null, rewards: [], stats: null });
  }

  // For each program, get member count
  const programsWithStats = await Promise.all(
    programs.map(async (prog) => {
      const { count: memberCount } = await serviceClient
        .from('loyalty_cards')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', prog.id);

      return { ...prog, member_count: memberCount || 0 };
    })
  );

  // Also return first program's full detail for backwards compatibility
  const firstProgram = programs[0];
  const { data: rewards } = await serviceClient
    .from('loyalty_rewards')
    .select('*')
    .eq('program_id', firstProgram.id)
    .order('sort_order', { ascending: true });

  const { count: totalMembers } = await serviceClient
    .from('loyalty_cards')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', user.id);

  const { data: cardStats } = await serviceClient
    .from('loyalty_cards')
    .select('total_punches_earned, total_points_earned')
    .eq('vendor_id', user.id);

  const totalPunches = cardStats?.reduce((sum, c) => sum + (c.total_punches_earned || 0), 0) || 0;
  const totalPoints = cardStats?.reduce((sum, c) => sum + (c.total_points_earned || 0), 0) || 0;

  const { count: rewardsRedeemed } = await serviceClient
    .from('loyalty_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', user.id)
    .in('transaction_type', ['redeem_punch_reward', 'redeem_points_reward']);

  return NextResponse.json({
    programs: programsWithStats,
    // Backwards compat
    program: firstProgram,
    rewards: rewards || [],
    stats: {
      total_members: totalMembers || 0,
      total_punches: totalPunches,
      total_points: totalPoints,
      rewards_redeemed: rewardsRedeemed || 0,
    },
  });
}

// POST /api/vendor/loyalty — Create a loyalty program
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const check = await getVendorWithTierCheck(supabase);
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const { program_type, name, description, punches_required, punch_reward, points_per_dollar } = body;

  if (!program_type || !name) {
    return NextResponse.json({ error: 'Program type and name are required.' }, { status: 400 });
  }

  if (program_type === 'punch_card') {
    if (!punches_required || punches_required < 1 || !punch_reward) {
      return NextResponse.json({ error: 'Punch card requires punches_required (>0) and punch_reward.' }, { status: 400 });
    }
  } else if (program_type === 'points') {
    if (!points_per_dollar || points_per_dollar <= 0) {
      return NextResponse.json({ error: 'Points program requires points_per_dollar (>0).' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid program type. Use "punch_card" or "points".' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: program, error } = await serviceClient
    .from('loyalty_programs')
    .insert({
      vendor_id: check.user.id,
      program_type,
      name,
      description: description || null,
      punches_required: program_type === 'punch_card' ? punches_required : null,
      punch_reward: program_type === 'punch_card' ? punch_reward : null,
      points_per_dollar: program_type === 'points' ? points_per_dollar : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ program });
}

// PUT /api/vendor/loyalty — Update loyalty program (requires ?id= or updates first program)
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const check = await getVendorWithTierCheck(supabase);
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const programId = body.id || request.nextUrl.searchParams.get('id');
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.punches_required !== undefined) updates.punches_required = body.punches_required;
  if (body.punch_reward !== undefined) updates.punch_reward = body.punch_reward;
  if (body.points_per_dollar !== undefined) updates.points_per_dollar = body.points_per_dollar;

  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('loyalty_programs')
    .update(updates)
    .eq('vendor_id', check.user.id);

  if (programId) {
    query = query.eq('id', programId);
  }

  const { data: program, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ program });
}

// DELETE /api/vendor/loyalty — Delete a loyalty program (requires ?id= or deletes all)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const programId = request.nextUrl.searchParams.get('id');
  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('loyalty_programs')
    .delete()
    .eq('vendor_id', user.id);

  if (programId) {
    query = query.eq('id', programId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
