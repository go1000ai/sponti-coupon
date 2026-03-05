import type { SupabaseClient } from '@supabase/supabase-js';
import { postToFacebook } from '@/lib/social/facebook';
import { postToInstagram } from '@/lib/social/instagram';
import { ensureValidToken } from '@/lib/social/token-refresh';
import type { MarketingContentItem } from './types';

/**
 * Posts an approved/scheduled marketing content item to connected brand accounts.
 * Reuses existing social posting infrastructure.
 */
export async function postMarketingContent(
  supabase: SupabaseClient,
  item: MarketingContentItem
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const results: Record<string, { postId?: string; postUrl?: string }> = {};

  // Update status to posting
  await supabase
    .from('marketing_content_queue')
    .update({ status: 'posting', updated_at: new Date().toISOString() })
    .eq('id', item.id);

  // Get brand social connections for target platforms
  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .eq('is_brand_account', true)
    .eq('is_active', true)
    .in('platform', item.platforms);

  if (!connections?.length) {
    const err = 'No active brand social connections found';
    errors.push(err);
    await supabase
      .from('marketing_content_queue')
      .update({ status: 'failed', error_message: err, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    return { success: false, errors };
  }

  // Determine image URL
  const imageUrl = item.image_url || (item.deal_id
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com'}/api/social/generate-image?deal_id=${item.deal_id}`
    : null);

  for (const conn of connections) {
    try {
      const token = await ensureValidToken(supabase, conn);
      if (!token) {
        errors.push(`Token refresh failed for ${conn.platform} (${conn.account_name})`);
        continue;
      }

      // Get platform-specific caption
      let caption = conn.platform === 'instagram'
        ? item.caption_instagram
        : item.caption_facebook;

      if (!caption) continue;

      // Add #Ad for deal promotions and vendor spotlights (FTC § 255)
      if (['deal_promotion', 'vendor_spotlight', 'deal_roundup'].includes(item.content_type)) {
        if (conn.platform === 'instagram') {
          caption += ' #Ad';
        } else {
          caption += '\n\n#Ad';
        }
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';
      const claimUrl = item.deal_id ? `${appUrl}/deals/${item.deal_id}` : appUrl;
      const postImage = imageUrl || `${appUrl}/logo-og.png`;

      if (conn.platform === 'facebook' && conn.platform_page_id) {
        const result = await postToFacebook(token, conn.platform_page_id, caption, postImage, claimUrl, conn.id);
        if (result.success) {
          results.facebook_post_id = result.platformPostId;
          results.facebook_post_url = result.platformPostUrl;
        } else {
          errors.push(`Facebook: ${result.error || 'Post failed'}`);
        }
      } else if (conn.platform === 'instagram' && conn.platform_page_id) {
        const result = await postToInstagram(token, conn.platform_page_id, caption, postImage, conn.id);
        if (result.success) {
          results.instagram_post_id = result.platformPostId;
          results.instagram_post_url = result.platformPostUrl;
        } else {
          errors.push(`Instagram: ${result.error || 'Post failed'}`);
        }
      }

      // Update connection metadata
      await supabase
        .from('social_connections')
        .update({ last_posted_at: new Date().toISOString(), last_error: null })
        .eq('id', conn.id);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown posting error';
      errors.push(`${conn.platform}: ${msg}`);

      await supabase
        .from('social_connections')
        .update({ last_error: msg })
        .eq('id', conn.id);
    }
  }

  // Update the queue item with results
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    posted_at: errors.length === 0 ? new Date().toISOString() : null,
    status: errors.length === 0 ? 'posted' : (errors.length < connections.length ? 'posted' : 'failed'),
    error_message: errors.length > 0 ? errors.join('; ') : null,
  };

  if (results.facebook_post_id) updateData.facebook_post_id = results.facebook_post_id;
  if (results.facebook_post_url) updateData.facebook_post_url = results.facebook_post_url;
  if (results.instagram_post_id) updateData.instagram_post_id = results.instagram_post_id;
  if (results.instagram_post_url) updateData.instagram_post_url = results.instagram_post_url;

  await supabase.from('marketing_content_queue').update(updateData).eq('id', item.id);

  return { success: errors.length === 0, errors };
}
