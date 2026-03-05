import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/marketing — Fetch marketing queue items with filtering
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const contentType = searchParams.get('content_type');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServiceRoleClient();

  let query = supabase
    .from('marketing_content_queue')
    .select('*, deals(title, image_url), vendors(business_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (contentType) query = query.eq('content_type', contentType);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data, total: count });
}

// PATCH /api/admin/marketing — Update a queue item
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
  }

  const allowedFields = [
    'caption_facebook', 'caption_instagram', 'hashtags', 'image_url',
    'scheduled_for', 'status', 'admin_notes', 'platforms',
  ];

  const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  // Track if captions were edited
  if (updates.caption_facebook || updates.caption_instagram) {
    safeUpdates.was_edited = true;
  }

  const supabase = await createServiceRoleClient();

  // If editing, preserve originals
  if (safeUpdates.was_edited) {
    const { data: existing } = await supabase
      .from('marketing_content_queue')
      .select('caption_facebook, caption_instagram, original_caption_facebook')
      .eq('id', id)
      .single();

    if (existing && !existing.original_caption_facebook) {
      safeUpdates.original_caption_facebook = existing.caption_facebook;
      safeUpdates.original_caption_instagram = existing.caption_instagram;
    }
  }

  const { data, error } = await supabase
    .from('marketing_content_queue')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
