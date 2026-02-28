export type DealType = 'regular' | 'sponti_coupon';
export type DealStatus = 'draft' | 'active' | 'expired' | 'paused';
export type NotificationType = 'new_deal' | 'deal_expiring' | 'redemption_confirmed' | 'digest';
export type NotificationChannel = 'push' | 'email';
export type SubscriptionTier = 'starter' | 'pro' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
export type UserRole = 'vendor' | 'customer' | 'admin';
export type PaymentProcessorType = 'stripe' | 'square' | 'paypal' | 'venmo' | 'zelle' | 'cashapp';
export type LoyaltyProgramType = 'punch_card' | 'points';
export type LoyaltyTransactionType = 'earn_punch' | 'earn_points' | 'redeem_punch_reward' | 'redeem_points_reward';
export type SpontiPointsReason = 'earn_redemption' | 'spend_credit' | 'bonus' | 'adjustment' | 'reversal' | 'expired';

export interface VendorSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  yelp?: string;
  google_business?: string;
}

export interface BusinessHoursDay {
  open: string;   // "09:00"
  close: string;  // "17:00"
  closed: boolean;
}

export interface BusinessHours {
  monday?: BusinessHoursDay;
  tuesday?: BusinessHoursDay;
  wednesday?: BusinessHoursDay;
  thursday?: BusinessHoursDay;
  friday?: BusinessHoursDay;
  saturday?: BusinessHoursDay;
  sunday?: BusinessHoursDay;
}

export type AutoResponseTone = 'professional' | 'friendly' | 'casual' | 'grateful' | 'empathetic';

export interface AutoResponseSettings {
  enabled: boolean;
  tone: AutoResponseTone;
  delay_hours: number;
  include_negative: boolean;
  custom_instructions?: string;
}

export interface VendorNotificationPreferences {
  email_new_claims: boolean;
  email_redemptions: boolean;
  email_reviews: boolean;
  email_digest: boolean;
  auto_response?: AutoResponseSettings;
}

export interface VendorBranding {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_logo_url?: string;
  custom_domain?: string;
  hide_sponticoupon_branding?: boolean;
}

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
  cover_url: string | null;
  description: string | null;
  website: string | null;
  social_links: VendorSocialLinks;
  business_hours: BusinessHours;
  notification_preferences: VendorNotificationPreferences;
  branding: VendorBranding;
  avg_rating: number;
  total_reviews: number;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus | null;
  stripe_payment_link: string | null;
  deposit_webhook_secret: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
  stripe_connect_charges_enabled: boolean;
  average_ticket_value: number | null;
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
  review_email_opt_out: boolean;
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
  location_ids: string[] | null;
  website_url: string | null;
  terms_and_conditions: string | null;
  video_urls: string[];
  amenities: string[];
  how_it_works: string | null;
  highlights: string[];
  fine_print: string | null;
  search_tags: string[];
  category_id: string | null;
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
  redemption_code: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  review_request_sent_at: string | null;
  payment_method_type: string | null;
  payment_tier: string | null;
  stripe_checkout_session_id: string | null;
  deposit_amount_paid: number | null;
  payment_reference: string | null;
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
  deposit_amount: number | null;
  payment_method_type: string | null;
  remaining_balance: number | null;
  amount_collected: number | null;
  collection_completed: boolean;
  collection_completed_at: string | null;
}

export interface VendorLocation {
  id: string;
  vendor_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  created_at: string;
}

export type TeamRole = 'admin' | 'manager' | 'staff';

export interface TeamMember {
  id: string;
  vendor_id: string;
  email: string;
  name: string;
  role: TeamRole;
  location_id: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: 'pending' | 'active' | 'revoked';
  user_id: string | null;
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

export type PaymentTier = 'integrated' | 'manual' | 'link';

export interface VendorPaymentMethod {
  id: string;
  vendor_id: string;
  processor_type: PaymentProcessorType;
  payment_link: string;
  display_name: string | null;
  is_primary: boolean;
  is_active: boolean;
  payment_tier: PaymentTier;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  vendor_id: string;
  customer_id: string;
  deal_id: string | null;
  claim_id: string | null;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  vendor_replied_at: string | null;
  is_verified: boolean;
  // AI auto-response fields
  auto_response_scheduled_at: string | null;
  auto_response_sent_at: string | null;
  auto_response_tone: string | null;
  is_auto_response: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: Customer;
  deal?: Deal;
}

export interface LoyaltyProgram {
  id: string;
  vendor_id: string;
  program_type: LoyaltyProgramType;
  name: string;
  description: string | null;
  is_active: boolean;
  punches_required: number | null;
  punch_reward: string | null;
  points_per_dollar: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  vendor?: Vendor;
  rewards?: LoyaltyReward[];
}

export interface LoyaltyReward {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltyCard {
  id: string;
  program_id: string;
  customer_id: string;
  vendor_id: string;
  current_punches: number;
  total_punches_earned: number;
  current_points: number;
  total_points_earned: number;
  total_points_redeemed: number;
  created_at: string;
  updated_at: string;
  // Joined
  program?: LoyaltyProgram;
  vendor?: Vendor;
}

export interface LoyaltyTransaction {
  id: string;
  card_id: string;
  customer_id: string;
  vendor_id: string;
  redemption_id: string | null;
  reward_id: string | null;
  transaction_type: LoyaltyTransactionType;
  points_amount: number;
  punches_amount: number;
  description: string | null;
  deal_title: string | null;
  created_at: string;
}

// SpontiPoints (platform loyalty)
export interface SpontiPointsLedgerEntry {
  id: string;
  user_id: string;
  vendor_id: string | null;
  deal_id: string | null;
  redemption_id: string | null;
  points: number;
  reason: SpontiPointsReason;
  expires_at: string | null;
  created_at: string;
  // Joined
  deal?: Deal;
  vendor?: Vendor;
}

export interface SpontiPointsRedemption {
  id: string;
  user_id: string;
  points_used: number;
  credit_amount: number;
  applied_to: string | null;
  created_at: string;
}

// Deal view tracking
export interface DealView {
  id: string;
  deal_id: string;
  viewer_id: string | null;
  ip_hash: string | null;
  created_at: string;
}

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 49,
    annualPrice: 39, // ~20% off ($470/yr)
    deals_per_month: 6, // total (sponti + regular)
    sponti_deals_per_month: 2,
    regular_deals_per_month: 4,
    basic_charts: false, // KPI cards only, no charts
    advanced_analytics: false,
    ai_insights: false,
    ai_deal_assistant: false,
    competitor_data: false,
    ai_deal_advisor: false,
    custom_scheduling: false,
    priority_support: false,
    multi_location: false,
    team_access: false,
    max_team_members: 0,
    api_access: false,
    custom_branding: false,
    loyalty_program: false,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    stripe_annual_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || '',
  },
  pro: {
    name: 'Pro',
    price: 99,
    annualPrice: 79, // ~20% off ($950/yr)
    deals_per_month: 18, // total (sponti + regular)
    sponti_deals_per_month: 6,
    regular_deals_per_month: 12,
    basic_charts: true, // 3 basic charts (claims, revenue, redemption)
    advanced_analytics: false, // NO 8+ charts / data tables
    ai_insights: false, // NO AI
    ai_deal_assistant: false, // NO AI
    competitor_data: false,
    ai_deal_advisor: false,
    custom_scheduling: true,
    priority_support: true,
    multi_location: false,
    team_access: false,
    max_team_members: 0,
    api_access: false,
    custom_branding: false,
    loyalty_program: true,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    stripe_annual_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
  business: {
    name: 'Business',
    price: 199,
    annualPrice: 159, // ~20% off ($1,910/yr)
    deals_per_month: 75, // total (sponti + regular)
    sponti_deals_per_month: 25,
    regular_deals_per_month: 50,
    basic_charts: true,
    advanced_analytics: true, // Full 8+ charts + data tables
    ai_insights: true, // AI Insights & scoring
    ai_deal_assistant: true, // AI writes titles & descriptions
    competitor_data: true, // Competitor benchmarking
    ai_deal_advisor: true, // AI pricing & timing recommendations
    custom_scheduling: true,
    priority_support: true,
    multi_location: true,
    team_access: true,
    max_team_members: 5,
    api_access: false,
    custom_branding: false,
    loyalty_program: true,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || '',
    stripe_annual_price_id: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID || '',
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    annualPrice: 399, // ~20% off ($4,790/yr)
    deals_per_month: -1, // unlimited
    sponti_deals_per_month: -1, // unlimited
    regular_deals_per_month: -1, // unlimited
    basic_charts: true,
    advanced_analytics: true,
    ai_insights: true,
    ai_deal_assistant: true,
    competitor_data: true,
    ai_deal_advisor: true,
    custom_scheduling: true,
    priority_support: true,
    multi_location: true,
    team_access: true,
    max_team_members: -1, // unlimited
    api_access: true,
    custom_branding: true,
    loyalty_program: true,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    stripe_annual_price_id: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || '',
  },
} as const;

// Tier ordering for comparison logic
export const TIER_ORDER: SubscriptionTier[] = ['starter', 'pro', 'business', 'enterprise'];

// Feature flag keys (excluding non-boolean fields)
export type TierFeature = Exclude<keyof typeof SUBSCRIPTION_TIERS['starter'], 'name' | 'price' | 'annualPrice' | 'deals_per_month' | 'sponti_deals_per_month' | 'regular_deals_per_month' | 'max_team_members' | 'stripe_price_id' | 'stripe_annual_price_id'>;

// Support Ticket System
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketCategory = 'billing' | 'technical' | 'account' | 'general';
export type SupportMessageSenderType = 'user' | 'admin' | 'ai';

export interface SupportAttachment {
  url: string;
  filename: string;
  size: number;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  user_role: 'vendor' | 'customer';
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  messages?: SupportMessage[];
  last_message?: SupportMessage;
}

export type MediaType = 'image' | 'video';
export type MediaSource = 'upload' | 'ai_generated' | 'url' | 'ai_video';

export interface VendorMedia {
  id: string;
  vendor_id: string;
  type: MediaType;
  url: string;
  storage_path: string | null;
  bucket: string;
  filename: string | null;
  title: string | null;
  ai_prompt: string | null;
  source: MediaSource;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: SupportMessageSenderType;
  sender_id: string | null;
  message: string;
  attachments: SupportAttachment[];
  created_at: string;
}
