import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ensureValidToken } from '@/lib/social/token-refresh';
import { postToFacebook } from '@/lib/social/facebook';
import { postToInstagram } from '@/lib/social/instagram';
import { postToTwitter } from '@/lib/social/twitter';
import { postToTikTok } from '@/lib/social/tiktok';
import type { SocialConnection, SocialPostResult } from '@/lib/social/types';

export const runtime = 'nodejs';

const MAX_RETRIES = 3;

/**
 * POST /api/social/retry-post
 * Retry a failed social media post. Only the vendor who owns the deal (or an admin) can retry.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { post_id } = await request.json();

  if (!post_id) {
    return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch the failed post
  const { data: post, error: postError } = await serviceClient
    .from('social_posts')
    .select('*')
    .eq('id', post_id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed posts can be retried' }, { status: 400 });
  }

  if ((post.retry_count || 0) >= MAX_RETRIES) {
    return NextResponse.json({ error: 'Maximum retry attempts reached' }, { status: 429 });
  }

  // Verify ownership: vendor owns the deal OR user is admin
  const { data: deal } = await serviceClient
    .from('deals')
    .select('vendor_id')
    .eq('id', post.deal_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  const isOwner = deal.vendor_id === user.id;
  let isAdmin = false;

  if (!isOwner) {
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch the connection
  const { data: connection } = await serviceClient
    .from('social_connections')
    .select('*')
    .eq('id', post.connection_id)
    .single();

  if (!connection || !connection.is_active) {
    return NextResponse.json({ error: 'Social connection is no longer active' }, { status: 400 });
  }

  // Refresh token if needed
  const validToken = await ensureValidToken(serviceClient, connection as SocialConnection);
  if (!validToken) {
    // Increment retry_count even on token failure
    await serviceClient
      .from('social_posts')
      .update({
        retry_count: (post.retry_count || 0) + 1,
        error_message: 'Token expired and refresh failed',
      })
      .eq('id', post_id);

    return NextResponse.json({
      success: false,
      result: { status: 'failed', error: 'Token expired and refresh failed' },
    });
  }

  // Re-post using the stored caption/image/claim_url
  let result: SocialPostResult;
  try {
    switch (post.platform) {
      case 'facebook':
        result = await postToFacebook(
          validToken,
          connection.platform_page_id || '',
          post.caption || '',
          post.image_url || '',
          post.claim_url || '',
          connection.id
        );
        break;
      case 'instagram':
        result = await postToInstagram(
          validToken,
          connection.platform_page_id || '',
          post.caption || '',
          post.image_url || '',
          connection.id
        );
        break;
      case 'twitter':
        result = await postToTwitter(
          validToken,
          post.caption || '',
          post.image_url || '',
          post.claim_url || '',
          connection.id
        );
        break;
      case 'tiktok':
        if (!post.image_url) {
          result = {
            platform: 'tiktok',
            connectionId: connection.id,
            success: false,
            error: 'No image available for TikTok post',
          };
        } else {
          result = await postToTikTok(validToken, post.caption || '', post.image_url, connection.id);
        }
        break;
      default:
        result = {
          platform: post.platform,
          connectionId: connection.id,
          success: false,
          error: `Unsupported platform: ${post.platform}`,
        };
    }
  } catch (err) {
    result = {
      platform: post.platform,
      connectionId: connection.id,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during retry',
    };
  }

  // Update the social_posts record
  await serviceClient
    .from('social_posts')
    .update({
      status: result.success ? 'posted' : 'failed',
      platform_post_id: result.platformPostId || post.platform_post_id,
      platform_post_url: result.platformPostUrl || post.platform_post_url,
      error_message: result.error || null,
      retry_count: (post.retry_count || 0) + 1,
      posted_at: result.success ? new Date().toISOString() : post.posted_at,
    })
    .eq('id', post_id);

  // Update connection status
  if (result.success) {
    await serviceClient
      .from('social_connections')
      .update({ last_posted_at: new Date().toISOString(), last_error: null })
      .eq('id', connection.id);
  } else {
    await serviceClient
      .from('social_connections')
      .update({ last_error: result.error || 'Retry failed' })
      .eq('id', connection.id);
  }

  return NextResponse.json({
    success: result.success,
    result: {
      status: result.success ? 'posted' : 'failed',
      error: result.error,
      platform_post_url: result.platformPostUrl,
    },
  });
}
