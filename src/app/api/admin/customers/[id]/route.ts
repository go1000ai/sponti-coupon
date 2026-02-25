import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// PUT /api/admin/customers/[id] — Update customer fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();
  const body = await request.json();

  // Only allow specific fields to be updated
  const allowedFields = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'city',
    'state',
    'zip',
    'email_digest_opt_in',
    'review_email_opt_out',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Verify customer exists
  const { data: existing } = await serviceClient
    .from('customers')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // If email is being updated, check for uniqueness
  if (updates.email) {
    const { data: emailCheck } = await serviceClient
      .from('customers')
      .select('id')
      .eq('email', updates.email as string)
      .neq('id', id)
      .single();

    if (emailCheck) {
      return NextResponse.json({ error: 'Email already in use by another customer' }, { status: 409 });
    }
  }

  const { data: customer, error } = await serviceClient
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer });
}

// DELETE /api/admin/customers/[id] — Delete a customer (cascades to claims, reviews, loyalty cards)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Verify customer exists
  const { data: existing } = await serviceClient
    .from('customers')
    .select('id, email')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Delete related data in order (child records first)
  // 1. Loyalty transactions (references loyalty_cards.id via card_id)
  const { data: loyaltyCards } = await serviceClient
    .from('loyalty_cards')
    .select('id')
    .eq('customer_id', id);

  if (loyaltyCards && loyaltyCards.length > 0) {
    const cardIds = loyaltyCards.map((c) => c.id);
    await serviceClient
      .from('loyalty_transactions')
      .delete()
      .in('card_id', cardIds);
  }

  // 2. Loyalty cards
  await serviceClient
    .from('loyalty_cards')
    .delete()
    .eq('customer_id', id);

  // 3. SpontiPoints ledger entries
  await serviceClient
    .from('sponti_points_ledger')
    .delete()
    .eq('user_id', id);

  // 4. SpontiPoints redemptions
  await serviceClient
    .from('sponti_points_redemptions')
    .delete()
    .eq('user_id', id);

  // 5. Reviews
  await serviceClient
    .from('reviews')
    .delete()
    .eq('customer_id', id);

  // 6. Notifications
  await serviceClient
    .from('notifications')
    .delete()
    .eq('customer_id', id);

  // 7. Redemptions (references claims)
  await serviceClient
    .from('redemptions')
    .delete()
    .eq('customer_id', id);

  // 8. Claims
  await serviceClient
    .from('claims')
    .delete()
    .eq('customer_id', id);

  // 9. Finally, delete the customer
  const { error } = await serviceClient
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
