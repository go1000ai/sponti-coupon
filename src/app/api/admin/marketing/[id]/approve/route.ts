import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/marketing/[id]/approve — Approve a draft item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { scheduled_for } = body;

  const supabase = await createServiceRoleClient();

  const update: Record<string, unknown> = {
    status: scheduled_for ? 'scheduled' : 'approved',
    reviewed_by: admin.userId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (scheduled_for) update.scheduled_for = scheduled_for;

  const { data, error } = await supabase
    .from('marketing_content_queue')
    .update(update)
    .eq('id', id)
    .in('status', ['draft'])
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Item not found or not in draft status' },
      { status: 400 }
    );
  }

  return NextResponse.json({ item: data });
}
