export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'tiktok';

export interface SocialConnection {
  id: string;
  vendor_id: string | null;
  is_brand_account: boolean;
  platform: SocialPlatform;
  access_token: string; // encrypted in DB, decrypted in memory
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_user_id: string | null;
  platform_page_id: string | null;
  account_name: string | null;
  account_username: string | null;
  account_avatar_url: string | null;
  is_active: boolean;
  last_posted_at: string | null;
  last_error: string | null;
  connected_at: string;
  updated_at: string;
}

export interface SocialPostContent {
  caption: string;
  imageUrl: string;
  claimUrl: string;
  dealTitle: string;
  dealType: 'regular' | 'sponti_coupon';
  discountPercentage: number;
  vendorName: string;
}

export interface PlatformCaptions {
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
}

export interface DealForSocialPost {
  id: string;
  title: string;
  description: string | null;
  deal_type: 'regular' | 'sponti_coupon';
  original_price: number;
  deal_price: number;
  discount_percentage: number;
  image_url: string | null;
  vendor_id: string;
  vendor: {
    business_name: string;
    city: string | null;
    state: string | null;
    category: string | null;
    subscription_tier: string;
  };
}

export interface SocialPostResult {
  platform: SocialPlatform;
  connectionId: string;
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}
