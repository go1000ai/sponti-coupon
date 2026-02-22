import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

// GET /api/deals - Browse deals with filters
export async function GET(request: NextRequest) {
  const supabase = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '25';
  const dealType = searchParams.get('type');
  const city = searchParams.get('city');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('deals')
    .select('*, vendor:vendors(*)', { count: 'exact' })
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dealType) {
    query = query.eq('deal_type', dealType);
  }

  if (city) {
    query = query.eq('vendor.city', city);
  }

  const { data: deals, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by distance if lat/lng provided
  let filteredDeals = deals || [];
  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusMiles = parseFloat(radius);

    filteredDeals = filteredDeals.filter(deal => {
      if (!deal.vendor?.lat || !deal.vendor?.lng) return true;
      const distance = getDistance(userLat, userLng, deal.vendor.lat, deal.vendor.lng);
      return distance <= radiusMiles;
    }).map(deal => ({
      ...deal,
      distance: deal.vendor?.lat && deal.vendor?.lng
        ? getDistance(userLat, userLng, deal.vendor.lat, deal.vendor.lng)
        : null,
    }));
  }

  return NextResponse.json({ deals: filteredDeals, total: count });
}

// POST /api/deals - Create a new deal (vendor only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify vendor role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can create deals' }, { status: 403 });
  }

  // Check subscription status
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single();

  if (!vendor?.subscription_tier || vendor.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required to create deals' }, { status: 403 });
  }

  // Check deal limits for the month
  const tierConfig = SUBSCRIPTION_TIERS[vendor.subscription_tier as SubscriptionTier];
  if (tierConfig.deals_per_month !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if ((count || 0) >= tierConfig.deals_per_month) {
      return NextResponse.json({
        error: `You've reached your ${tierConfig.deals_per_month} deal limit for this month. Upgrade your plan for more deals.`,
      }, { status: 403 });
    }
  }

  const body = await request.json();
  const {
    deal_type, title, description, original_price, deal_price,
    deposit_amount, max_claims, starts_at, expires_at, timezone, image_url,
  } = body;

  // Calculate discount
  const discount_percentage = ((original_price - deal_price) / original_price) * 100;

  // Validate Sponti Coupon rules
  if (deal_type === 'sponti_coupon') {
    // Must have active regular deal
    const { data: regularDeal } = await supabase
      .from('deals')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('deal_type', 'regular')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!regularDeal) {
      return NextResponse.json({
        error: 'You must have an active Regular Deal before posting a Sponti Coupon.',
      }, { status: 400 });
    }

    const regularDiscount = ((regularDeal.original_price - regularDeal.deal_price) / regularDeal.original_price) * 100;
    const requiredDiscount = regularDiscount + 10;

    if (discount_percentage - regularDiscount < 10) {
      return NextResponse.json({
        error: `Your Sponti Coupon must offer at least 10% more savings than your Regular Deal (${Math.round(regularDiscount)}% off). Increase your discount to at least ${Math.round(requiredDiscount)}% to publish.`,
      }, { status: 400 });
    }

    if (!deposit_amount || deposit_amount <= 0) {
      return NextResponse.json({
        error: 'Sponti Coupons require a deposit amount.',
      }, { status: 400 });
    }

    // Check expires within 24 hours
    const expiryMs = new Date(expires_at).getTime() - new Date(starts_at).getTime();
    if (expiryMs > 24 * 60 * 60 * 1000) {
      return NextResponse.json({
        error: 'Sponti Coupons can only last up to 24 hours.',
      }, { status: 400 });
    }

    // Create the deal with benchmark reference
    const { data: deal, error: createError } = await supabase
      .from('deals')
      .insert({
        vendor_id: user.id,
        deal_type,
        title,
        description,
        original_price,
        deal_price,
        discount_percentage,
        deposit_amount,
        max_claims,
        starts_at,
        expires_at,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'active',
        image_url,
        benchmark_deal_id: regularDeal.id,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ deal });
  }

  // Regular deal - can last 1-30 days
  const durationMs = new Date(expires_at).getTime() - new Date(starts_at).getTime();
  const durationDays = durationMs / (24 * 60 * 60 * 1000);
  if (durationDays > 30) {
    return NextResponse.json({
      error: 'Regular deals can last up to 30 days.',
    }, { status: 400 });
  }

  const { data: deal, error: createError } = await supabase
    .from('deals')
    .insert({
      vendor_id: user.id,
      deal_type,
      title,
      description,
      original_price,
      deal_price,
      discount_percentage,
      deposit_amount: null,
      max_claims,
      starts_at,
      expires_at,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'active',
      image_url,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ deal });
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
