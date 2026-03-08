import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { postDealToSocial } from '@/lib/social/post-manager';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

/**
 * POST /api/social/schedule
 * Create scheduled, draft, or immediate social posts for a deal.
 * Body: {
 *   deal_id: string,
 *   platforms: string[],           // e.g. ['facebook', 'instagram']
 *   captions: Record<string, string>, // per-platform captions (possibly edited)
 *   action: 'post_now' | 'schedule' | 'draft',
 *   scheduled_at?: string,         // ISO date (required when action='schedule')
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { deal_id, platforms, captions, action, scheduled_at, image_url: customImageUrl, video_url: customVideoUrl } = body;

  if (!deal_id || !platforms?.length || !captions || !action) {
    return NextResponse.json({ error: 'deal_id, platforms, captions, and action are required' }, { status: 400 });
  }

  if (action === 'schedule' && !scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required for scheduling' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Verify deal exists and user has access
  const { data: deal } = await serviceClient
    .from('deals')
    .select('id, title, image_url, vendor_id')
    .eq('id', deal_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && deal.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get vendor's active connections for the requested platforms
  const vendorId = deal.vendor_id;
  const { data: connections } = await serviceClient
    .from('social_connections')
    .select('id, platform, is_brand_account')
    .or(`vendor_id.eq.${vendorId},is_brand_account.eq.true`)
    .eq('is_active', true)
    .in('platform', platforms);

  if (!connections?.length) {
    return NextResponse.json({ error: 'No active connections for selected platforms' }, { status: 400 });
  }

  const imageUrl = customImageUrl || deal.image_url || '';
  const videoUrl = customVideoUrl || null;
  const claimUrl = `${APP_URL}/deals/${deal.id}`;
  const now = new Date().toISOString();

  // If post_now, trigger immediate posting via auto-post endpoint
  if (action === 'post_now') {
    // Create social_posts entries as pending, then trigger posting
    const rows = connections.map(conn => ({
      deal_id,
      connection_id: conn.id,
      platform: conn.platform,
      account_type: conn.is_brand_account ? 'brand' : 'vendor',
      caption: captions[conn.platform] || '',
      caption_edited: captions[conn.platform] || null,
      image_url: imageUrl,
      video_url: videoUrl,
      media_type: videoUrl ? (conn.platform === 'instagram' ? 'reel' : 'video') : 'image',
      claim_url: claimUrl,
      status: 'pending',
      scheduled_by: user.id,
      created_at: now,
    }));

    const { data: posts, error: insertError } = await serviceClient
      .from('social_posts')
      .insert(rows)
      .select('id');

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Post directly instead of fire-and-forget HTTP call (avoids silent failures)
    try {
      await postDealToSocial(deal_id, vendorId, {
        customCaptions: captions,
        postIds: posts?.map(p => p.id) || [],
      });
    } catch (postError) {
      console.error('[Social Schedule] Direct posting failed:', postError);
      // Posts are already created as pending — post-manager updates their status internally
      // Return success anyway since the records exist and show the error in the calendar
    }

    return NextResponse.json({ success: true, action: 'post_now', count: connections.length });
  }

  // For draft or schedule, create entries with appropriate status
  const status = action === 'schedule' ? 'scheduled' : 'draft';

  const rows = connections.map(conn => ({
    deal_id,
    connection_id: conn.id,
    platform: conn.platform,
    account_type: conn.is_brand_account ? 'brand' : 'vendor',
    caption: captions[conn.platform] || '',
    caption_edited: captions[conn.platform] || null,
    image_url: imageUrl,
    video_url: videoUrl,
    media_type: videoUrl ? (conn.platform === 'instagram' ? 'reel' : 'video') : 'image',
    claim_url: claimUrl,
    status,
    scheduled_at: action === 'schedule' ? scheduled_at : null,
    scheduled_by: user.id,
    created_at: now,
  }));

  const { error: insertError } = await serviceClient
    .from('social_posts')
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, action, count: connections.length });
}

/**
 * PATCH /api/social/schedule
 * Update a draft/scheduled post (edit caption, change schedule, cancel).
 * Body: { post_id: string, caption?: string, scheduled_at?: string, action?: 'cancel' | 'schedule' | 'draft' }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { post_id, caption, scheduled_at: newScheduledAt, action } = body;

  if (!post_id) {
    return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: post } = await serviceClient
    .from('social_posts')
    .select('id, status, deal_id, scheduled_by')
    .eq('id', post_id)
    .single();

  if (!post || !['draft', 'scheduled', 'pending', 'failed'].includes(post.status)) {
    return NextResponse.json({ error: 'Post not found or cannot be modified' }, { status: 404 });
  }

  // Verify ownership
  if (post.scheduled_by !== user.id) {
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (caption !== undefined) {
    updates.caption = caption;
    updates.caption_edited = caption;
  }

  if (action === 'cancel') {
    updates.status = 'cancelled';
  } else if (action === 'schedule' && newScheduledAt) {
    updates.status = 'scheduled';
    updates.scheduled_at = newScheduledAt;
  } else if (action === 'draft') {
    updates.status = 'draft';
    updates.scheduled_at = null;
  }

  const { error } = await serviceClient
    .from('social_posts')
    .update(updates)
    .eq('id', post_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
