import { createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { generateCaptions } from './caption-generator';
import { ensureValidToken } from './token-refresh';
import { postToFacebook } from './facebook';
import { postToInstagram } from './instagram';
import { postToTwitter } from './twitter';
import { postToTikTok } from './tiktok';
import type { DealForSocialPost, PlatformCaptions, SocialConnection, SocialPostResult, SocialPlatform } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

/**
 * Main entry point: post a newly created deal to all connected social accounts.
 * Called by /api/social/auto-post after deal creation.
 */
export async function postDealToSocial(dealId: string, vendorId: string): Promise<void> {
  const supabase = await createServiceRoleClient();

  // 1. Fetch deal with vendor info
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select(`
      id, title, description, deal_type, original_price, deal_price,
      discount_percentage, image_url, vendor_id
    `)
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    console.error('[Social Post] Deal not found:', dealId, dealError);
    return;
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, city, state, category, subscription_tier')
    .eq('id', vendorId)
    .single();

  if (!vendor) {
    console.error('[Social Post] Vendor not found:', vendorId);
    return;
  }

  // 2. Check if vendor tier allows social posting
  const tier = vendor.subscription_tier as SubscriptionTier;
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig || !tierConfig.social_auto_post) {
    console.log(`[Social Post] Tier "${tier}" does not support social auto-posting`);
    return;
  }

  // 3. Fetch all active connections (vendor's + brand accounts)
  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .or(`vendor_id.eq.${vendorId},is_brand_account.eq.true`)
    .eq('is_active', true);

  if (!connections || connections.length === 0) {
    console.log('[Social Post] No active social connections for vendor:', vendorId);
    return;
  }

  // 4. Build deal object for caption generation
  const dealForPost: DealForSocialPost = {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    deal_type: deal.deal_type,
    original_price: deal.original_price,
    deal_price: deal.deal_price,
    discount_percentage: deal.discount_percentage,
    image_url: deal.image_url,
    vendor_id: deal.vendor_id,
    vendor: {
      business_name: vendor.business_name,
      city: vendor.city,
      state: vendor.state,
      category: vendor.category,
      subscription_tier: vendor.subscription_tier,
    },
  };

  // 5. Generate platform-specific captions
  const captions = await generateCaptions(dealForPost);
  const claimUrl = `${APP_URL}/deals/${deal.id}`;
  const imageUrl = deal.image_url || '';

  // 6. Post to each connection in parallel with error isolation
  const results = await Promise.allSettled(
    connections.map(async (conn: SocialConnection) => {
      // Ensure token is valid (refresh if needed)
      const validToken = await ensureValidToken(supabase, conn);
      if (!validToken) {
        return {
          platform: conn.platform as SocialPlatform,
          connectionId: conn.id,
          success: false,
          error: 'Token expired and refresh failed',
        } as SocialPostResult;
      }

      return postToConnection(conn, validToken, captions, imageUrl, claimUrl);
    })
  );

  // 7. Log all results to social_posts table
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];
    const settled = results[i];
    const result: SocialPostResult = settled.status === 'fulfilled'
      ? settled.value
      : {
          platform: conn.platform as SocialPlatform,
          connectionId: conn.id,
          success: false,
          error: settled.reason?.message || 'Unknown error',
        };

    const caption = captions[conn.platform as keyof typeof captions] || '';

    await supabase.from('social_posts').insert({
      deal_id: dealId,
      connection_id: conn.id,
      platform: conn.platform,
      account_type: conn.is_brand_account ? 'brand' : 'vendor',
      caption,
      image_url: imageUrl,
      claim_url: claimUrl,
      status: result.success ? 'posted' : 'failed',
      platform_post_id: result.platformPostId || null,
      platform_post_url: result.platformPostUrl || null,
      error_message: result.error || null,
      posted_at: result.success ? new Date().toISOString() : null,
    });

    // Update connection's last_posted_at or last_error
    if (result.success) {
      await supabase
        .from('social_connections')
        .update({ last_posted_at: new Date().toISOString(), last_error: null })
        .eq('id', conn.id);
    } else {
      await supabase
        .from('social_connections')
        .update({ last_error: result.error || 'Post failed' })
        .eq('id', conn.id);
    }
  }

  console.log(`[Social Post] Completed for deal ${dealId}: ${results.length} connections processed`);
}

/**
 * Post to a single social connection based on its platform.
 */
async function postToConnection(
  conn: SocialConnection,
  accessToken: string,
  captions: PlatformCaptions,
  imageUrl: string,
  claimUrl: string
): Promise<SocialPostResult> {
  const platform = conn.platform as keyof PlatformCaptions;
  const caption = captions[platform] || '';

  switch (conn.platform) {
    case 'facebook':
      return postToFacebook(
        accessToken,
        conn.platform_page_id || '',
        caption,
        imageUrl,
        claimUrl,
        conn.id
      );

    case 'instagram':
      return postToInstagram(
        accessToken,
        conn.platform_page_id || '',
        caption,
        imageUrl,
        conn.id
      );

    case 'twitter':
      return postToTwitter(
        accessToken,
        caption,
        imageUrl,
        claimUrl,
        conn.id
      );

    case 'tiktok':
      if (!imageUrl) {
        return {
          platform: 'tiktok',
          connectionId: conn.id,
          success: false,
          error: 'No image available for TikTok post',
        };
      }
      return postToTikTok(accessToken, caption, imageUrl, conn.id);

    default:
      return {
        platform: conn.platform as SocialPlatform,
        connectionId: conn.id,
        success: false,
        error: `Unsupported platform: ${conn.platform}`,
      };
  }
}
