-- ============================================================
-- 060: Appointment Booking System
-- Adds tables for vendor availability, blocked dates,
-- appointments, and Google Calendar integration.
-- ============================================================

-- 1. Appointment status enum
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Vendor appointment settings on vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS appointment_settings JSONB DEFAULT '{"slot_duration_minutes": 30, "buffer_minutes": 10, "max_concurrent": 1, "advance_booking_days": 14, "min_cancel_hours": 24, "enabled": false}'::jsonb;

-- 3. Deal-level availability override (optional, narrows vendor defaults)
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS appointment_availability_override JSONB DEFAULT NULL;

-- 4. Vendor availability (per day-of-week time windows)
CREATE TABLE IF NOT EXISTS vendor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, day_of_week),
  CHECK (end_time > start_time)
);

-- 5. Vendor blocked dates (holidays, vacations, etc.)
CREATE TABLE IF NOT EXISTS vendor_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, blocked_date)
);

-- 6. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  cancelled_by TEXT, -- 'vendor' or 'customer'
  cancellation_reason TEXT,
  rescheduled_from UUID REFERENCES appointments(id) ON DELETE SET NULL,
  google_calendar_event_id TEXT,
  vendor_notes TEXT,
  customer_notes TEXT,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_1h_sent_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- 7. Google Calendar OAuth tokens for vendors
CREATE TABLE IF NOT EXISTS vendor_google_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE UNIQUE,
  google_email TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Add appointment_id to claims for linking
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_vendor_date ON appointments(vendor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_claim ON appointments(claim_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminders ON appointments(status, reminder_24h_sent_at, reminder_1h_sent_at)
  WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_appointments_pending_cleanup ON appointments(status, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vendor_availability_vendor ON vendor_availability(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_blocked_dates_vendor ON vendor_blocked_dates(vendor_id, blocked_date);
CREATE INDEX IF NOT EXISTS idx_claims_appointment ON claims(appointment_id) WHERE appointment_id IS NOT NULL;

-- ============================================================
-- Row Level Security
-- ============================================================

-- vendor_availability: public read (needed for slot generation), vendor write
ALTER TABLE vendor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendor availability"
  ON vendor_availability FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage own availability"
  ON vendor_availability FOR ALL
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- vendor_blocked_dates: public read, vendor write
ALTER TABLE vendor_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendor blocked dates"
  ON vendor_blocked_dates FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage own blocked dates"
  ON vendor_blocked_dates FOR ALL
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- appointments: customers see own, vendors see own
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own appointments"
  ON appointments FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Vendors can view their appointments"
  ON appointments FOR SELECT
  USING (vendor_id = auth.uid());

CREATE POLICY "Customers can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own appointments"
  ON appointments FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "Vendors can update their appointments"
  ON appointments FOR UPDATE
  USING (vendor_id = auth.uid());

-- vendor_google_calendar: vendor only
ALTER TABLE vendor_google_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage own google calendar"
  ON vendor_google_calendar FOR ALL
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- ============================================================
-- Updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_vendor_availability_updated_at
    BEFORE UPDATE ON vendor_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_vendor_google_calendar_updated_at
    BEFORE UPDATE ON vendor_google_calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
