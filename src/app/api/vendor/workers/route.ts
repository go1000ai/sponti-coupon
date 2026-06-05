import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS, type SubscriptionTier, type WorkerPermissions } from '@/lib/types/database';

const PUBLIC_COLS = 'id, user_id, name, email, permissions, status, created_at';

function sanitizePerms(input: Partial<WorkerPermissions> | undefined): WorkerPermissions {
  return {
    redeem: true, // always granted
    loyalty: !!input?.loyalty,
    deals: !!input?.deals,
    analytics: !!input?.analytics,
    appointments: !!input?.appointments,
  };
}

async function getOwner() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tierCfg: null };
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  return { supabase, user, tierCfg: SUBSCRIPTION_TIERS[tier] };
}

// GET — list this vendor's worker accounts
export async function GET() {
  const { supabase, user } = await getOwner();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('team_members')
    .select(PUBLIC_COLS)
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workers: data || [] });
}

// POST — create a worker account { name, email, password, permissions }
export async function POST(request: NextRequest) {
  const { user, tierCfg } = await getOwner();
  if (!user || !tierCfg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!tierCfg.team_access) {
    return NextResponse.json({ error: 'Worker accounts require a Business plan or higher.' }, { status: 403 });
  }

  const { name, email, password, permissions } = await request.json();
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  const cleanEmail = String(email).trim().toLowerCase();

  const service = await createServiceRoleClient();

  // Enforce the plan's seat limit (-1 = unlimited).
  const max = tierCfg.max_team_members;
  if (max !== -1) {
    const { count } = await service
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', user.id);
    if (count !== null && count >= max) {
      return NextResponse.json(
        { error: `Your ${tierCfg.name} plan allows up to ${max} worker accounts.` },
        { status: 403 }
      );
    }
  }

  // 1. Create the auth account (confirmed so they can log in immediately).
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: cleanEmail,
    password: String(password),
    email_confirm: true,
    user_metadata: { first_name: name.trim() },
  });
  if (createErr || !created?.user) {
    const msg = /registered|already/i.test(createErr?.message || '')
      ? 'That email is already in use.'
      : (createErr?.message || 'Could not create the worker account.');
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const newUserId = created.user.id;

  // 2. Profile (worker role) + 3. team membership. Roll back the auth user on failure.
  const { error: profileErr } = await service
    .from('user_profiles')
    .upsert({ id: newUserId, role: 'worker', first_name: name.trim() });
  if (profileErr) {
    await service.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Could not set up the worker profile.' }, { status: 500 });
  }

  const { data: member, error: memberErr } = await service
    .from('team_members')
    .insert({
      vendor_id: user.id,
      user_id: newUserId,
      name: name.trim(),
      email: cleanEmail,
      permissions: sanitizePerms(permissions),
    })
    .select(PUBLIC_COLS)
    .single();
  if (memberErr) {
    await service.auth.admin.deleteUser(newUserId); // cascades profile + team row
    const dup = /duplicate|unique/i.test(memberErr.message);
    return NextResponse.json({ error: dup ? 'A worker with that email already exists.' : memberErr.message }, { status: dup ? 409 : 500 });
  }

  return NextResponse.json({ worker: member });
}

// PUT — update { id, name?, permissions?, status?, password? }
export async function PUT(request: NextRequest) {
  const { user } = await getOwner();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, permissions, status, password } = await request.json();
  if (!id) return NextResponse.json({ error: 'Worker id is required.' }, { status: 400 });

  const service = await createServiceRoleClient();
  const { data: existing } = await service
    .from('team_members')
    .select('id, user_id, vendor_id')
    .eq('id', id)
    .eq('vendor_id', user.id)
    .single();
  if (!existing) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (permissions) updates.permissions = sanitizePerms(permissions);
  if (status === 'active' || status === 'disabled') updates.status = status;

  const { data: member, error } = await service
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .eq('vendor_id', user.id)
    .select(PUBLIC_COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional password reset.
  if (password && existing.user_id) {
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    await service.auth.admin.updateUserById(existing.user_id, { password: String(password) });
  }

  return NextResponse.json({ worker: member });
}

// DELETE — remove a worker (?id=) and their login
export async function DELETE(request: NextRequest) {
  const { user } = await getOwner();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Worker id is required.' }, { status: 400 });

  const service = await createServiceRoleClient();
  const { data: member } = await service
    .from('team_members')
    .select('id, user_id')
    .eq('id', id)
    .eq('vendor_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 });

  // Deleting the auth user cascades the profile + team_members row.
  if (member.user_id) {
    await service.auth.admin.deleteUser(member.user_id);
  } else {
    await service.from('team_members').delete().eq('id', id);
  }

  return NextResponse.json({ success: true });
}
