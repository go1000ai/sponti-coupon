import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/prospects — List all prospect leads
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from('prospect_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospects: data || [] });
}

// PATCH /api/admin/prospects — Update prospect status/notes
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const body = await request.json();
  const { id, status, notes } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createServiceRoleClient();
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const { error } = await supabase
    .from('prospect_leads')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/prospects — Delete a prospect
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from('prospect_leads')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
