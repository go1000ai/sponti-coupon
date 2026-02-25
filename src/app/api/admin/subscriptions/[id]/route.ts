import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// PUT /api/admin/subscriptions/[id] — Update subscription (tier, status, current_period_end)
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

  const allowedFields = ['tier', 'status', 'current_period_end'];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: subscription, error } = await serviceClient
    .from('subscriptions')
    .update(updateData)
    .eq('id', id)
    .select('*, vendor:vendors(business_name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const vendor = (subscription as Record<string, unknown>).vendor as { business_name: string } | null;

  return NextResponse.json({
    subscription: {
      ...subscription,
      vendor_name: vendor?.business_name || '--',
    },
  });
}

// DELETE /api/admin/subscriptions/[id] — Cancel/delete a subscription
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  const { error } = await serviceClient
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
