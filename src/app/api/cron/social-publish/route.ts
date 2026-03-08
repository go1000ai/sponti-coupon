import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ensureValidToken } from '@/lib/social/token-refresh';
import { postToFacebook } from '@/lib/social/facebook';
import { postToInstagram } from '@/lib/social/instagram';
import { postToTwitter } from '@/lib/social/twitter';
import { postToTikTok } from '@/lib/social/tiktok';
import type { SocialPostResult, SocialPlatform } from '@/lib/social/types';

/**
 * GET /api/cron/social-publish
 * Cron job: finds scheduled posts whose scheduled_at <= now and publishes them.
 * Called by Vercel Cron or external scheduler every 1-5 minutes.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const now = new Date().toISOString();

  // Find scheduled posts ready to publish
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, deal_id, connection_id, platform, caption, image_url, video_url, claim_url, account_type')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(50);

  if (error || !posts?.length) {
    return NextResponse.json({ published: 0, message: error?.message || 'No posts to publish' });
  }

  let published = 0;
  let failed = 0;

  for (const post of posts) {
    // Mark as posting
    await supabase
      .from('social_posts')
      .update({ status: 'posting' })
      .eq('id', post.id);

    try {
      // Fetch the connection
      const { data: conn } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', post.connection_id)
        .eq('is_active', true)
        .single();

      if (!conn) {
        await supabase
          .from('social_posts')
          .update({ status: 'failed', error_message: 'Connection not found or inactive' })
          .eq('id', post.id);
        failed++;
        continue;
      }

      // Ensure valid token
      const validToken = await ensureValidToken(supabase, conn);
      if (!validToken) {
        await supabase
          .from('social_posts')
          .update({ status: 'failed', error_message: 'Token expired and refresh failed' })
          .eq('id', post.id);
        failed++;
        continue;
      }

      // Post to the platform
      let result: SocialPostResult;
      const caption = post.caption || '';
      const imageUrl = post.image_url || '';
      const videoUrl = post.video_url || undefined;
      const claimUrl = post.claim_url || '';

      switch (post.platform) {
        case 'facebook':
          result = await postToFacebook(validToken, conn.platform_page_id || '', caption, imageUrl, claimUrl, conn.id, videoUrl);
          break;
        case 'instagram':
          result = await postToInstagram(validToken, conn.platform_page_id || '', caption, imageUrl, conn.id, videoUrl);
          break;
        case 'twitter':
          result = await postToTwitter(validToken, caption, imageUrl, claimUrl, conn.id);
          break;
        case 'tiktok':
          result = await postToTikTok(validToken, caption, imageUrl, conn.id);
          break;
        default:
          result = { platform: post.platform as SocialPlatform, connectionId: conn.id, success: false, error: 'Unsupported platform' };
      }

      // Update the post record
      await supabase
        .from('social_posts')
        .update({
          status: result.success ? 'posted' : 'failed',
          platform_post_id: result.platformPostId || null,
          platform_post_url: result.platformPostUrl || null,
          error_message: result.error || null,
          posted_at: result.success ? new Date().toISOString() : null,
        })
        .eq('id', post.id);

      // Update connection
      if (result.success) {
        await supabase
          .from('social_connections')
          .update({ last_posted_at: new Date().toISOString(), last_error: null })
          .eq('id', conn.id);
        published++;
      } else {
        await supabase
          .from('social_connections')
          .update({ last_error: result.error || 'Post failed' })
          .eq('id', conn.id);
        failed++;
      }
    } catch (err) {
      await supabase
        .from('social_posts')
        .update({ status: 'failed', error_message: (err as Error).message || 'Unknown error' })
        .eq('id', post.id);
      failed++;
    }
  }

  return NextResponse.json({ published, failed, total: posts.length });
}
