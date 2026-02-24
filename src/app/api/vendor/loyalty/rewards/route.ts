import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

async function getVendorProgram(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
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

  const serviceClient = await createServiceRoleClient();
  const { data: program } = await serviceClient
    .from('loyalty_programs')
    .select('id, program_type')
    .eq('vendor_id', user.id)
    .single();

  if (!program) {
    return { error: 'No loyalty program found. Create one first.', status: 404 };
  }

  if (program.program_type !== 'points') {
    return { error: 'Reward tiers are only available for points-based programs.', status: 400 };
  }

  return { user, program, serviceClient };
}

// GET /api/vendor/loyalty/rewards — List rewards for vendor's program
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: program } = await serviceClient
    .from('loyalty_programs')
    .select('id')
    .eq('vendor_id', user.id)
    .single();

  if (!program) {
    return NextResponse.json({ rewards: [] });
  }

  const { data: rewards, error } = await serviceClient
    .from('loyalty_rewards')
    .select('*')
    .eq('program_id', program.id)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rewards: rewards || [] });
}

// POST /api/vendor/loyalty/rewards — Add a reward tier
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const check = await getVendorProgram(supabase);
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const { name, description, points_cost, sort_order } = body;

  if (!name || !points_cost || points_cost < 1) {
    return NextResponse.json({ error: 'Name and points_cost (>0) are required.' }, { status: 400 });
  }

  const { data: reward, error } = await check.serviceClient
    .from('loyalty_rewards')
    .insert({
      program_id: check.program.id,
      name,
      description: description || null,
      points_cost,
      sort_order: sort_order || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reward });
}

// PUT /api/vendor/loyalty/rewards — Update a reward
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const check = await getVendorProgram(supabase);
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const { id, name, description, points_cost, sort_order, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: 'Reward ID is required.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (points_cost !== undefined) updates.points_cost = points_cost;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data: reward, error } = await check.serviceClient
    .from('loyalty_rewards')
    .update(updates)
    .eq('id', id)
    .eq('program_id', check.program.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reward });
}

// DELETE /api/vendor/loyalty/rewards — Delete a reward
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Reward ID is required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Verify reward belongs to vendor's program
  const { data: program } = await serviceClient
    .from('loyalty_programs')
    .select('id')
    .eq('vendor_id', user.id)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'No loyalty program found.' }, { status: 404 });
  }

  const { error } = await serviceClient
    .from('loyalty_rewards')
    .delete()
    .eq('id', id)
    .eq('program_id', program.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
