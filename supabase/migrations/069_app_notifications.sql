-- ============================================================
-- 069: In-app notification feed
-- A general-purpose, per-user notification feed for BOTH vendors
-- and customers (any auth user). Drives the dashboard bell/feed.
-- Distinct from the legacy `notifications` table (a customer-only
-- push/email send log).
-- ============================================================

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- e.g. 'appointment_requested', 'appointment_confirmed', 'appointment_cancelled'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                       -- in-app path to open (e.g. '/dashboard/appointments')
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newest-first per user, and a fast unread lookup.
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_unread
  ON app_notifications(user_id) WHERE read_at IS NULL;

-- ============================================================
-- Row Level Security
-- Users can read and update (mark read) only their own notifications.
-- Inserts are performed server-side with the service role (bypasses RLS).
-- ============================================================
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON app_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON app_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
