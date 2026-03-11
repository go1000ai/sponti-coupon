export type MarketingContentType =
  | 'deal_promotion'
  | 'deal_roundup'
  | 'brand_awareness'
  | 'engagement'
  | 'local_tip'
  | 'trending_topic'
  | 'vendor_spotlight'
  | 'testimonial';

export type MarketingContentStatus =
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'posting'
  | 'posted'
  | 'rejected'
  | 'failed'
  | 'archived';

export type MarketingRunType = 'morning' | 'afternoon' | 'evening' | 'manual';

export interface MarketingContentItem {
  id: string;
  content_type: MarketingContentType;
  platforms: string[];
  caption_facebook: string | null;
  caption_instagram: string | null;
  hashtags: string[];
  image_prompt: string | null;
  image_url: string | null;
  video_url: string | null;
  deal_id: string | null;
  vendor_id: string | null;
  ai_reasoning: string | null;
  ai_content_score: number | null;
  target_audience: string | null;
  language: string;
  scheduled_for: string | null;
  optimal_time_reason: string | null;
  status: MarketingContentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  original_caption_facebook: string | null;
  original_caption_instagram: string | null;
  was_edited: boolean;
  facebook_post_id: string | null;
  facebook_post_url: string | null;
  instagram_post_id: string | null;
  instagram_post_url: string | null;
  error_message: string | null;
  generated_by_run: string | null;
  created_at: string;
  updated_at: string;
  posted_at: string | null;
}

export interface DealPromotionTarget {
  dealId: string;
  reason: 'expiring_soon' | 'top_performer' | 'new_deal' | 'underperforming';
  dealTitle: string;
  vendorName: string;
}

export interface ContentStrategyPlan {
  runType: MarketingRunType;
  dealPromotions: DealPromotionTarget[];
  brandContentTypes: MarketingContentType[];
  language: 'en' | 'es' | 'bilingual';
}

export interface GeneratedContent {
  facebook: string;
  instagram: string;
  hashtags: string[];
  imagePrompt: string;
  reasoning: string;
  targetAudience: string;
  contentScore: number;
}

export interface AgentRunResult {
  runId: string;
  runType: MarketingRunType;
  dealsAnalyzed: number;
  promotionsGenerated: number;
  brandContentGenerated: number;
  autoPosted: number;
  queuedForApproval: number;
  errors: string[];
  durationMs: number;
}
