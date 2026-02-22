import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/deals/[id] - Get a single deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*, vendor:vendors(*)')
    .eq('id', id)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  return NextResponse.json({ deal });
}

// PATCH /api/deals/[id] - Update deal (vendor only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('vendor_id')
    .eq('id', id)
    .single();

  if (!existingDeal || existingDeal.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to modify this deal' }, { status: 403 });
  }

  const body = await request.json();
  const { status, expires_at } = body;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (expires_at) updates.expires_at = expires_at;

  const { data: deal, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal });
}
