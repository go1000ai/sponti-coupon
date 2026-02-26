-- Vendor Knowledge Base: custom Q&A entries that Mia uses to answer customer questions
CREATE TABLE IF NOT EXISTS vendor_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vendor_kb_vendor ON vendor_knowledge_base(vendor_id);
