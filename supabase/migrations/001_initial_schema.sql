-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE deal_type AS ENUM ('regular', 'sponti_coupon');
CREATE TYPE deal_status AS ENUM ('draft', 'active', 'expired', 'paused');
CREATE TYPE notification_type AS ENUM ('new_deal', 'deal_expiring', 'redemption_confirmed', 'digest');
CREATE TYPE notification_channel AS ENUM ('push', 'email');
CREATE TYPE subscription_tier AS ENUM ('starter', 'pro', 'business', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE user_role AS ENUM ('vendor', 'customer', 'admin');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🏷️',
  slug TEXT NOT NULL UNIQUE
);

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  category TEXT,
  logo_url TEXT,
  stripe_customer_id TEXT,
  subscription_tier subscription_tier,
  subscription_status subscription_status,
  stripe_payment_link TEXT,
  deposit_webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  push_token TEXT,
  email_digest_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  deal_type deal_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  original_price NUMERIC(10, 2) NOT NULL,
  deal_price NUMERIC(10, 2) NOT NULL,
  discount_percentage NUMERIC(5, 2) NOT NULL,
  deposit_amount NUMERIC(10, 2),
  max_claims INTEGER,
  claims_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status deal_status NOT NULL DEFAULT 'draft',
  benchmark_deal_id UUID REFERENCES deals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_prices CHECK (deal_price < original_price),
  CONSTRAINT valid_discount CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  CONSTRAINT valid_dates CHECK (expires_at > starts_at),
  CONSTRAINT sponti_requires_deposit CHECK (
    (deal_type = 'regular') OR
    (deal_type = 'sponti_coupon' AND deposit_amount IS NOT NULL AND deposit_amount > 0)
  )
);

-- Claims
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  deposit_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_confirmed_at TIMESTAMPTZ,
  qr_code TEXT UNIQUE,
  qr_code_url TEXT,
  redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Redemptions
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  scanned_by UUID NOT NULL REFERENCES auth.users(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor locations (for multi-location Business/Enterprise)
CREATE TABLE vendor_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone TEXT
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel notification_channel NOT NULL
);

-- Featured deals (admin curated)
CREATE TABLE featured_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deals_vendor_id ON deals(vendor_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_deal_type ON deals(deal_type);
CREATE INDEX idx_deals_expires_at ON deals(expires_at);
CREATE INDEX idx_deals_location ON deals(vendor_id, status);
CREATE INDEX idx_claims_deal_id ON claims(deal_id);
CREATE INDEX idx_claims_customer_id ON claims(customer_id);
CREATE INDEX idx_claims_session_token ON claims(session_token);
CREATE INDEX idx_claims_qr_code ON claims(qr_code);
CREATE INDEX idx_vendors_location ON vendors(lat, lng);
CREATE INDEX idx_customers_location ON customers(lat, lng);
CREATE INDEX idx_subscriptions_vendor ON subscriptions(vendor_id);
CREATE INDEX idx_notifications_customer ON notifications(customer_id);
CREATE INDEX idx_vendor_locations_vendor ON vendor_locations(vendor_id);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories - public read
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- Vendors
CREATE POLICY "Public can view vendors" ON vendors
  FOR SELECT USING (true);
CREATE POLICY "Vendors can update own record" ON vendors
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Vendors can insert own record" ON vendors
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Customers
CREATE POLICY "Customers can view own record" ON customers
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Customers can update own record" ON customers
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Customers can insert own record" ON customers
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Vendors can view customer on redemption" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN deals d ON c.deal_id = d.id
      WHERE c.customer_id = customers.id AND d.vendor_id = auth.uid()
    )
  );

-- Deals
CREATE POLICY "Public can view active deals" ON deals
  FOR SELECT USING (status = 'active' OR vendor_id = auth.uid());
CREATE POLICY "Vendors can create own deals" ON deals
  FOR INSERT WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Vendors can update own deals" ON deals
  FOR UPDATE USING (vendor_id = auth.uid());

-- Claims
CREATE POLICY "Customers can view own claims" ON claims
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Vendors can view claims on their deals" ON claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deals WHERE deals.id = claims.deal_id AND deals.vendor_id = auth.uid())
  );
CREATE POLICY "Customers can create claims" ON claims
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Redemptions
CREATE POLICY "Vendors can view own redemptions" ON redemptions
  FOR SELECT USING (vendor_id = auth.uid());
CREATE POLICY "Customers can view own redemptions" ON redemptions
  FOR SELECT USING (customer_id = auth.uid());

-- Vendor locations
CREATE POLICY "Public can view vendor locations" ON vendor_locations
  FOR SELECT USING (true);
CREATE POLICY "Vendors can manage own locations" ON vendor_locations
  FOR ALL USING (vendor_id = auth.uid());

-- Subscriptions
CREATE POLICY "Vendors can view own subscriptions" ON subscriptions
  FOR SELECT USING (vendor_id = auth.uid());

-- Notifications
CREATE POLICY "Customers can view own notifications" ON notifications
  FOR SELECT USING (customer_id = auth.uid());

-- Featured deals - public read
CREATE POLICY "Anyone can view featured deals" ON featured_deals
  FOR SELECT USING (true);

-- Seed categories
INSERT INTO categories (name, icon, slug) VALUES
  ('Restaurants', '🍽️', 'restaurants'),
  ('Beauty & Spa', '💆', 'beauty-spa'),
  ('Health & Fitness', '💪', 'health-fitness'),
  ('Entertainment', '🎭', 'entertainment'),
  ('Shopping', '🛍️', 'shopping'),
  ('Travel', '✈️', 'travel'),
  ('Automotive', '🚗', 'automotive'),
  ('Home Services', '🏠', 'home-services'),
  ('Education', '📚', 'education'),
  ('Technology', '💻', 'technology'),
  ('Food & Drink', '☕', 'food-drink'),
  ('Nightlife', '🌙', 'nightlife'),
  ('Wellness', '🧘', 'wellness'),
  ('Pets', '🐾', 'pets'),
  ('Photography', '📷', 'photography');
