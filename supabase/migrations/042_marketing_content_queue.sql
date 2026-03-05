-- Migration 042: Marketing automation content queue
-- AI-generated marketing content for approval and scheduled posting

CREATE TABLE IF NOT EXISTS marketing_content_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Content type & targeting
  content_type TEXT NOT NULL CHECK (content_type IN (
    'deal_promotion', 'deal_roundup', 'brand_awareness',
    'engagement', 'local_tip', 'trending_topic',
    'vendor_spotlight', 'testimonial'
  )),
  platforms TEXT[] NOT NULL DEFAULT '{facebook,instagram}',

  -- Generated content (per-platform)
  caption_facebook TEXT,
  caption_instagram TEXT,
  hashtags TEXT[],
  image_prompt TEXT,
  image_url TEXT,

  -- Deal/vendor reference
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- AI strategy metadata
  ai_reasoning TEXT,
  ai_content_score REAL,
  target_audience TEXT,
  language TEXT DEFAULT 'en',

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  optimal_time_reason TEXT,

  -- Status & workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'scheduled', 'posting', 'posted', 'rejected', 'failed'
  )),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,

  -- Edit tracking
  original_caption_facebook TEXT,
  original_caption_instagram TEXT,
  was_edited BOOLEAN DEFAULT false,

  -- Post results
  facebook_post_id TEXT,
  facebook_post_url TEXT,
  instagram_post_id TEXT,
  instagram_post_url TEXT,
  error_message TEXT,

  -- Cron metadata
  generated_by_run TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  posted_at TIMESTAMPTZ
);

CREATE INDEX idx_mcq_status ON marketing_content_queue(status);
CREATE INDEX idx_mcq_scheduled ON marketing_content_queue(scheduled_for)
  WHERE status IN ('approved', 'scheduled');
CREATE INDEX idx_mcq_content_type ON marketing_content_queue(content_type);
CREATE INDEX idx_mcq_deal ON marketing_content_queue(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_mcq_created ON marketing_content_queue(created_at DESC);

ALTER TABLE marketing_content_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcq_admin_all ON marketing_content_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Agent run tracking
CREATE TABLE IF NOT EXISTS marketing_agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  run_type TEXT NOT NULL CHECK (run_type IN ('morning', 'afternoon', 'evening', 'manual')),

  deals_analyzed INTEGER DEFAULT 0,
  promotions_generated INTEGER DEFAULT 0,
  brand_content_generated INTEGER DEFAULT 0,
  auto_posted INTEGER DEFAULT 0,
  queued_for_approval INTEGER DEFAULT 0,
  errors TEXT[],

  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX idx_mar_run_id ON marketing_agent_runs(run_id);

ALTER TABLE marketing_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY mar_admin_select ON marketing_agent_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
