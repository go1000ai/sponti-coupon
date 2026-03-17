import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { postViaGHL } from '@/lib/social/ghl';
import type { MarketingContentItem } from '@/lib/marketing/types';

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

  // If scheduled, push to GHL immediately so it appears on their calendar
  if (scheduled_for && process.env.GHL_API_KEY) {
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

      // Resolve image URL
      let imageUrl = item.image_url || null;
      if (imageUrl?.startsWith('/media/') && supabaseUrl) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/${imageUrl.replace('/media/', '')}`;
      } else if (imageUrl?.startsWith('/')) {
        imageUrl = `${appUrl}${imageUrl}`;
      }

      // Resolve video URL
      let videoUrl = item.video_url || null;
      if (videoUrl?.startsWith('/media/') && supabaseUrl) {
        videoUrl = `${supabaseUrl}/storage/v1/object/public/${videoUrl.replace('/media/', '')}`;
      } else if (videoUrl?.startsWith('/')) {
        videoUrl = `${appUrl}${videoUrl}`;
      }

      await postViaGHL(fullCaption, imageUrl, videoUrl, item.platforms || ['facebook', 'instagram'], id, scheduled_for);
    } catch (err) {
      console.error('[Approve] GHL schedule push failed:', (err as Error).message);
      // Don't fail the approve — the cron job will still pick it up
    }
  }

  return NextResponse.json({ item: data });
}
