import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

// GET /api/vendor/team — List all team members for the current vendor
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: members, error } = await supabase
    .from('team_members')
    .select('*, location:vendor_locations(name)')
    .eq('vendor_id', user.id)
    .order('invited_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: members || [] });
}

// POST /api/vendor/team — Invite a team member (Business+ only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check tier access
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].team_access) {
    return NextResponse.json(
      { error: 'Team member access requires a Business plan or higher.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, name, role, location_id } = body;

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'Email, name, and role are required.' }, { status: 400 });
  }

  if (!['admin', 'manager', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be admin, manager, or staff.' }, { status: 400 });
  }

  // Check for duplicate invite
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('vendor_id', user.id)
    .eq('email', email.toLowerCase())
    .neq('status', 'revoked')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'This email has already been invited.' }, { status: 409 });
  }

  const { data: member, error } = await supabase
    .from('team_members')
    .insert({
      vendor_id: user.id,
      email: email.toLowerCase(),
      name,
      role,
      location_id: location_id || null,
      status: 'pending',
      invited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member });
}

// PUT /api/vendor/team — Update a team member's role or status
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, role, location_id, status } = body;

  if (!id) {
    return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (location_id !== undefined) updateData.location_id = location_id || null;
  if (status) updateData.status = status;

  const { data: member, error } = await supabase
    .from('team_members')
    .update(updateData)
    .eq('id', id)
    .eq('vendor_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member });
}

// DELETE /api/vendor/team — Remove a team member
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('team_members')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
