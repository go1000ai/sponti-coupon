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

  // Verify ownership and get claims count
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('vendor_id, claims_count')
    .eq('id', id)
    .single();

  if (!existingDeal || existingDeal.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to modify this deal' }, { status: 403 });
  }

  const body = await request.json();
  const { status, expires_at, title, description, original_price, deal_price, discount_percentage, deposit_amount, max_claims, image_url } = body;

  // If trying to edit content fields (not just status), check if deal has any claims
  const isContentEdit = title !== undefined || description !== undefined || original_price !== undefined ||
    deal_price !== undefined || discount_percentage !== undefined || deposit_amount !== undefined ||
    max_claims !== undefined || image_url !== undefined;

  if (isContentEdit && existingDeal.claims_count > 0) {
    return NextResponse.json(
      { error: 'This deal has active claims and can no longer be edited. You can pause/expire it and create a new one.' },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (expires_at) updates.expires_at = expires_at;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (original_price !== undefined) updates.original_price = original_price;
  if (deal_price !== undefined) updates.deal_price = deal_price;
  if (discount_percentage !== undefined) updates.discount_percentage = discount_percentage;
  if (deposit_amount !== undefined) updates.deposit_amount = deposit_amount;
  if (max_claims !== undefined) updates.max_claims = max_claims;
  if (image_url !== undefined) updates.image_url = image_url;

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
