import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { hashPin, isValidPin } from '@/lib/redeem-members/pin';

const PUBLIC_COLS = 'id, name, active, last_used_at, created_at';

async function getVendor() {
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

// GET — list this vendor's redeem members
export async function GET() {
  const { supabase, user } = await getVendor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('redeem_members')
    .select(PUBLIC_COLS)
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [] });
}

// POST — create a redeem member { name, pin } (Business+ only)
export async function POST(request: NextRequest) {
  const { supabase, user, tierCfg } = await getVendor();
  if (!user || !tierCfg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!tierCfg.team_access) {
    return NextResponse.json({ error: 'Redeem members require a Business plan or higher.' }, { status: 403 });
  }

  const { name, pin } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 });
  }

  // Enforce the plan's seat limit (-1 = unlimited).
  const max = tierCfg.max_team_members;
  if (max !== -1) {
    const { count } = await supabase
      .from('redeem_members')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', user.id);
    if (count !== null && count >= max) {
      return NextResponse.json(
        { error: `Your ${tierCfg.name} plan allows up to ${max} redeem members.` },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from('redeem_members')
    .insert({ vendor_id: user.id, name: name.trim(), pin_hash: hashPin(pin) })
    .select(PUBLIC_COLS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

// PUT — update { id, name?, pin?, active? }
export async function PUT(request: NextRequest) {
  const { supabase, user } = await getVendor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, pin, active } = await request.json();
  if (!id) return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof active === 'boolean') updates.active = active;
  if (pin !== undefined) {
    if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 });
    updates.pin_hash = hashPin(pin);
  }

  const { data, error } = await supabase
    .from('redeem_members')
    .update(updates)
    .eq('id', id)
    .eq('vendor_id', user.id)
    .select(PUBLIC_COLS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

// DELETE — remove a redeem member (?id=)
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getVendor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });

  const { error } = await supabase
    .from('redeem_members')
    .delete()
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
