import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { postViaGHL } from '@/lib/social/ghl';
import type { MarketingContentItem } from '@/lib/marketing/types';

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
    'caption_facebook', 'caption_instagram', 'hashtags', 'image_url', 'video_url',
    'scheduled_for', 'status', 'admin_notes', 'platforms',
    'content_type', 'target_audience', 'recurring_schedule',
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

  // If rescheduling, push to GHL so it appears on their calendar
  if (updates.scheduled_for && updates.status === 'scheduled' && process.env.GHL_API_KEY && data) {
    try {
      const item = data as unknown as MarketingContentItem;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const caption = item.caption_facebook || item.caption_instagram || '';
      let fullCaption = caption;
      if (['deal_promotion', 'vendor_spotlight', 'deal_roundup'].includes(item.content_type)) {
        fullCaption += '\n\n#Ad';
      }
      const claimUrl = item.deal_id ? `${appUrl}/deals/${item.deal_id}` : appUrl;
      if (!fullCaption.includes('sponticoupon.com')) {
        fullCaption += `\n\n${claimUrl}`;
      }

      let imageUrl = item.image_url || null;
      if (imageUrl?.startsWith('/media/') && supabaseUrl) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/${imageUrl.replace('/media/', '')}`;
      } else if (imageUrl?.startsWith('/')) {
        imageUrl = `${appUrl}${imageUrl}`;
      }

      let videoUrl = item.video_url || null;
      if (videoUrl?.startsWith('/media/') && supabaseUrl) {
        videoUrl = `${supabaseUrl}/storage/v1/object/public/${videoUrl.replace('/media/', '')}`;
      } else if (videoUrl?.startsWith('/')) {
        videoUrl = `${appUrl}${videoUrl}`;
      }

      await postViaGHL(fullCaption, imageUrl, videoUrl, item.platforms || ['facebook', 'instagram'], id, updates.scheduled_for);
    } catch (err) {
      console.error('[PATCH] GHL schedule push failed:', (err as Error).message);
    }
  }

  return NextResponse.json({ item: data });
}

// DELETE /api/admin/marketing — Delete a queue item (only non-posted items)
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Only allow deleting items that haven't been posted
  const { data: item } = await supabase
    .from('marketing_content_queue')
    .select('status')
    .eq('id', id)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (item.status === 'posted' || item.status === 'posting') {
    return NextResponse.json(
      { error: 'Cannot delete a posted or currently posting item. Archive it instead.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('marketing_content_queue')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
