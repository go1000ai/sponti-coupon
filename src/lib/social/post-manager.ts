import { createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { generateCaptions } from './caption-generator';
import { ensureValidToken } from './token-refresh';
import { postToFacebook } from './facebook';
import { postToInstagram } from './instagram';
import { postToTwitter } from './twitter';
import { postToTikTok } from './tiktok';
import { postViaGHL } from './ghl';
import type { DealForSocialPost, PlatformCaptions, SocialConnection, SocialPostResult, SocialPlatform } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

interface PostDealOptions {
  customCaptions?: Record<string, string>;
  postIds?: string[];
  brandOnly?: boolean;
  /** If provided, only post to connections whose platform is in this list. */
  platforms?: string[];
}

/**
 * Main entry point: post a newly created deal to all connected social accounts.
 * Called by /api/social/auto-post after deal creation or from schedule (post_now).
 */
export async function postDealToSocial(dealId: string, vendorId: string, options?: PostDealOptions): Promise<void> {
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

  // 2. Determine which connections are eligible
  // Brand accounts (@sponticoupon FB/IG) ALWAYS get the post — that's SpontiCoupon
  // promoting the deal on its own audience, regardless of vendor tier.
  // Vendor's own connections only post if their subscription tier includes social_auto_post.
  const tier = vendor.subscription_tier as SubscriptionTier;
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const vendorTierAllowsSocial = !!(tierConfig && tierConfig.social_auto_post);

  // 3. Fetch active connections — brand-only when forced, otherwise brand + vendor.
  const filter = options?.brandOnly
    ? 'is_brand_account.eq.true'
    : `vendor_id.eq.${vendorId},is_brand_account.eq.true`;
  const { data: allConnections } = await supabase
    .from('social_connections')
    .select('*')
    .or(filter)
    .eq('is_active', true);

  // Drop vendor-account connections when the tier doesn't allow them.
  // Also drop platforms not requested if the caller specified a subset.
  const allowedPlatforms = options?.platforms && options.platforms.length > 0
    ? new Set(options.platforms)
    : null;
  const connections = (allConnections || []).filter((c) => {
    if (!c.is_brand_account && !vendorTierAllowsSocial) return false;
    if (allowedPlatforms && !allowedPlatforms.has(c.platform)) return false;
    return true;
  });

  if (connections.length === 0) {
    console.log('[Social Post] No eligible social connections for vendor:', vendorId);
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

  // 5. Generate platform-specific captions (or use custom ones from schedule UI)
  let captions: PlatformCaptions;
  if (options?.customCaptions && Object.keys(options.customCaptions).length > 0) {
    captions = {
      facebook: options.customCaptions.facebook || '',
      instagram: options.customCaptions.instagram || '',
      twitter: options.customCaptions.twitter || '',
      tiktok: options.customCaptions.tiktok || '',
    };
  } else {
    captions = await generateCaptions(dealForPost, undefined, supabase, deal.id);
  }
  const claimUrl = `${APP_URL}/deals/${deal.id}`;

  // If we have existing pending post records (from schedule UI), fetch their media info
  let imageUrl = deal.image_url || '';
  let videoUrl: string | undefined;
  if (options?.postIds?.length) {
    const { data: pendingPosts } = await supabase
      .from('social_posts')
      .select('image_url, video_url')
      .in('id', options.postIds)
      .limit(1);
    if (pendingPosts?.[0]) {
      if (pendingPosts[0].image_url) imageUrl = pendingPosts[0].image_url;
      if (pendingPosts[0].video_url) videoUrl = pendingPosts[0].video_url;
    }
  }

  // Ensure media URLs are absolute — Facebook/Instagram need full public URLs
  if (imageUrl && imageUrl.startsWith('/')) imageUrl = `${APP_URL}${imageUrl}`;
  if (videoUrl && videoUrl.startsWith('/')) videoUrl = `${APP_URL}${videoUrl}`;

  // 6. Post to each connection in parallel with error isolation
  const results = await Promise.allSettled(
    connections.map(async (conn: SocialConnection) => {
      // Brand-account Instagram posts go through GHL using a Private
      // Integration Token (env var), so the per-connection access_token
      // doesn't matter and we shouldn't fail on a stale one.
      const skipTokenCheck = conn.is_brand_account && conn.platform === 'instagram';
      const validToken = skipTokenCheck ? '' : await ensureValidToken(supabase, conn);
      if (!skipTokenCheck && !validToken) {
        return {
          platform: conn.platform as SocialPlatform,
          connectionId: conn.id,
          success: false,
          error: 'Token expired and refresh failed',
        } as SocialPostResult;
      }

      // FTC 16 CFR § 255.5 (2023): brand account posts promoting vendor deals
      // are commercial endorsements and must be labeled #Ad / #Sponsored.
      // Vendor's own account posts are their own content — no disclosure required.
      const captionsForConn = conn.is_brand_account
        ? applyAdDisclosure(captions)
        : captions;

      return postToConnection(conn, validToken || '', captionsForConn, imageUrl, claimUrl, videoUrl);
    })
  );

  // 7. Log results — update existing pending records if available, otherwise insert new ones
  // Build a map of connection_id → pending post_id from options.postIds
  const pendingPostMap = new Map<string, string>();
  if (options?.postIds?.length) {
    const { data: pendingRows } = await supabase
      .from('social_posts')
      .select('id, connection_id')
      .in('id', options.postIds);
    pendingRows?.forEach(r => pendingPostMap.set(r.connection_id, r.id));
  }

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
    const existingPostId = pendingPostMap.get(conn.id);

    if (existingPostId) {
      // Update the existing pending record created by schedule endpoint
      await supabase.from('social_posts').update({
        status: result.success ? 'posted' : 'failed',
        platform_post_id: result.platformPostId || null,
        platform_post_url: result.platformPostUrl || null,
        error_message: result.error || null,
        posted_at: result.success ? new Date().toISOString() : null,
      }).eq('id', existingPostId);
    } else {
      // No pending record — insert a new one (auto-post from deal creation)
      await supabase.from('social_posts').insert({
        deal_id: dealId,
        connection_id: conn.id,
        platform: conn.platform,
        account_type: conn.is_brand_account ? 'brand' : 'vendor',
        caption,
        image_url: imageUrl,
        video_url: videoUrl || null,
        claim_url: claimUrl,
        status: result.success ? 'posted' : 'failed',
        platform_post_id: result.platformPostId || null,
        platform_post_url: result.platformPostUrl || null,
        error_message: result.error || null,
        posted_at: result.success ? new Date().toISOString() : null,
      });
    }

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
  claimUrl: string,
  videoUrl?: string
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
        conn.id,
        videoUrl
      );

    case 'instagram': {
      // Brand-account Instagram posts route through GHL because Meta does not
      // grant Standard Access for instagram_content_publish — direct Meta
      // calls return error (#10) until App Review is approved. GHL has its
      // own approved Meta app and a Private Integration Token that lets us
      // post to our own connected Instagram via their Social Planner.
      if (conn.is_brand_account) {
        const ghlResults = await postViaGHL(
          caption,
          imageUrl || null,
          videoUrl || null,
          ['instagram'],
          conn.id
        );
        const r = ghlResults[0] || {
          platform: 'instagram' as SocialPlatform,
          connectionId: conn.id,
          success: false,
          error: 'GHL returned no result',
        };
        // Force platform to 'instagram' since GHL falls back to 'facebook' on errors
        return { ...r, platform: 'instagram' as SocialPlatform };
      }
      // Vendor-account path stays on direct Meta API (will work for vendors
      // once their own Meta app/scopes are sorted, separate problem).
      return postToInstagram(
        accessToken,
        conn.platform_page_id || '',
        caption,
        imageUrl,
        conn.id,
        videoUrl
      );
    }

    case 'twitter':
      return postToTwitter(
        accessToken,
        caption,
        imageUrl,
        claimUrl,
        conn.id
      );

    case 'tiktok':
      if (!imageUrl && !videoUrl) {
        return {
          platform: 'tiktok',
          connectionId: conn.id,
          success: false,
          error: 'No media available for TikTok post',
        };
      }
      return postToTikTok(accessToken, caption, imageUrl || videoUrl || '', conn.id);

    default:
      return {
        platform: conn.platform as SocialPlatform,
        connectionId: conn.id,
        success: false,
        error: `Unsupported platform: ${conn.platform}`,
      };
  }
}

/**
 * Add FTC-required #Ad disclosure to captions posted from SpontiCoupon's
 * brand accounts (16 CFR § 255.5, 2023 revision).
 * Vendor's own account posts are their own content — no disclosure needed.
 */
function applyAdDisclosure(captions: PlatformCaptions): PlatformCaptions {
  const twitterWithAd = captions.twitter.includes('#Ad')
    ? captions.twitter
    : captions.twitter.length + 4 <= 280
      ? `${captions.twitter} #Ad`
      : `${captions.twitter.substring(0, 276)} #Ad`;

  return {
    facebook: `${captions.facebook}\n\n#Ad`,
    instagram: `${captions.instagram} #Ad`,
    twitter: twitterWithAd,
    tiktok: `${captions.tiktok} #Ad`,
  };
}
