export type DealType = 'regular' | 'sponti_coupon';
export type DealStatus = 'draft' | 'active' | 'expired' | 'paused';
export type NotificationType = 'new_deal' | 'deal_expiring' | 'redemption_confirmed' | 'digest';
export type NotificationChannel = 'push' | 'email';
export type SubscriptionTier = 'starter' | 'pro' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type UserRole = 'vendor' | 'customer' | 'admin';

export interface Vendor {
  id: string;
  business_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  logo_url: string | null;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus | null;
  stripe_payment_link: string | null;
  deposit_webhook_secret: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  push_token: string | null;
  email_digest_opt_in: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export interface Deal {
  id: string;
  vendor_id: string;
  deal_type: DealType;
  title: string;
  description: string | null;
  original_price: number;
  deal_price: number;
  discount_percentage: number;
  deposit_amount: number | null;
  max_claims: number | null;
  claims_count: number;
  starts_at: string;
  expires_at: string;
  timezone: string;
  status: DealStatus;
  image_url: string | null;
  image_urls: string[];
  benchmark_deal_id: string | null;
  created_at: string;
  // Joined fields
  vendor?: Vendor;
  category?: Category;
}

export interface Claim {
  id: string;
  deal_id: string;
  customer_id: string;
  session_token: string;
  deposit_confirmed: boolean;
  deposit_confirmed_at: string | null;
  qr_code: string | null;
  qr_code_url: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined fields
  deal?: Deal;
  customer?: Customer;
}

export interface Redemption {
  id: string;
  claim_id: string;
  deal_id: string;
  vendor_id: string;
  customer_id: string;
  scanned_by: string;
  scanned_at: string;
}

export interface VendorLocation {
  id: string;
  vendor_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
}

export interface Subscription {
  id: string;
  vendor_id: string;
  stripe_subscription_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface Notification {
  id: string;
  customer_id: string;
  type: NotificationType;
  deal_id: string | null;
  sent_at: string;
  channel: NotificationChannel;
}

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 49,
    deals_per_month: 4,
    multi_location: false,
    api_access: false,
    custom_branding: false,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
  },
  pro: {
    name: 'Pro',
    price: 99,
    deals_per_month: 12,
    multi_location: false,
    api_access: false,
    custom_branding: false,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
  },
  business: {
    name: 'Business',
    price: 199,
    deals_per_month: -1, // unlimited
    multi_location: true,
    api_access: false,
    custom_branding: false,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || '',
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    deals_per_month: -1, // unlimited
    multi_location: true,
    api_access: true,
    custom_branding: true,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
  },
} as const;
