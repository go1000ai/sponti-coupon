import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/marketing/[id]/reject — Reject a draft item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('marketing_content_queue')
    .update({
      status: 'rejected',
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
      admin_notes: body.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['draft', 'approved', 'scheduled'])
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Item not found' },
      { status: 400 }
    );
  }

  return NextResponse.json({ item: data });
}
