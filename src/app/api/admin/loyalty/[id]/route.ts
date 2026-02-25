import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// PUT /api/admin/loyalty/[id] — Update a loyalty program
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Build update object from allowed fields
  const allowedFields = ['name', 'description', 'type', 'program_type', 'punch_target', 'punches_required', 'punch_reward', 'points_per_dollar', 'is_active'];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  // Convert numeric fields
  const numericFields = ['punch_target', 'points_per_dollar'];
  for (const field of numericFields) {
    if (field in updateData) {
      const val = updateData[field];
      updateData[field] = val != null && val !== '' ? Number(val) : null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: program, error } = await serviceClient
    .from('loyalty_programs')
    .update(updateData)
    .eq('id', id)
    .select('*, vendor:vendors(business_name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  return NextResponse.json({ program });
}

// DELETE /api/admin/loyalty/[id] — Delete a loyalty program (cascading)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Step 1: Get all card IDs for this program (needed to cascade-delete transactions)
  const { data: cards } = await serviceClient
    .from('loyalty_cards')
    .select('id')
    .eq('program_id', id);

  const cardIds = (cards || []).map((c: { id: string }) => c.id);

  // Step 2: Delete loyalty_transactions for those cards
  if (cardIds.length > 0) {
    const { error: txError } = await serviceClient
      .from('loyalty_transactions')
      .delete()
      .in('card_id', cardIds);

    if (txError) {
      return NextResponse.json(
        { error: `Failed to delete transactions: ${txError.message}` },
        { status: 500 }
      );
    }
  }

  // Step 3: Delete loyalty_cards for this program
  const { error: cardsError } = await serviceClient
    .from('loyalty_cards')
    .delete()
    .eq('program_id', id);

  if (cardsError) {
    return NextResponse.json(
      { error: `Failed to delete cards: ${cardsError.message}` },
      { status: 500 }
    );
  }

  // Step 4: Delete loyalty_rewards for this program
  const { error: rewardsError } = await serviceClient
    .from('loyalty_rewards')
    .delete()
    .eq('program_id', id);

  if (rewardsError) {
    return NextResponse.json(
      { error: `Failed to delete rewards: ${rewardsError.message}` },
      { status: 500 }
    );
  }

  // Step 5: Delete the program itself
  const { error: programError } = await serviceClient
    .from('loyalty_programs')
    .delete()
    .eq('id', id);

  if (programError) {
    return NextResponse.json(
      { error: `Failed to delete program: ${programError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
