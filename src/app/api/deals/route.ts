import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

// GET /api/deals - Browse deals with filters (public endpoint, uses anon client with RLS)
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '25';
  const dealType = searchParams.get('type');
  const city = searchParams.get('city');
  const searchText = searchParams.get('search');
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

  if (searchText) {
    query = query.or(`title.ilike.%${searchText}%,description.ilike.%${searchText}%`);
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

  // Featured on Homepage: Business & Enterprise vendors' deals sort first
  const FEATURED_TIERS = ['business', 'enterprise'];
  filteredDeals.sort((a, b) => {
    const aFeatured = FEATURED_TIERS.includes(a.vendor?.subscription_tier || '') ? 1 : 0;
    const bFeatured = FEATURED_TIERS.includes(b.vendor?.subscription_tier || '') ? 1 : 0;
    if (bFeatured !== aFeatured) return bFeatured - aFeatured; // featured first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // then newest
  });

  // Tag featured deals so the frontend can show a badge
  const taggedDeals = filteredDeals.map(deal => ({
    ...deal,
    is_featured: FEATURED_TIERS.includes(deal.vendor?.subscription_tier || ''),
  }));

  return NextResponse.json({ deals: taggedDeals, total: count });
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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString();

  const body = await request.json();

  // Check total deal limit
  if (tierConfig.deals_per_month !== -1) {
    const { count: totalCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .gte('created_at', monthStart);

    if ((totalCount || 0) >= tierConfig.deals_per_month) {
      return NextResponse.json({
        error: `You've reached your ${tierConfig.deals_per_month} total deal limit for this month. Upgrade your plan for more deals.`,
      }, { status: 403 });
    }
  }

  // Check per-type deal limits (Sponti vs Regular)
  const incomingType = body.deal_type;
  if (incomingType === 'sponti_coupon' && tierConfig.sponti_deals_per_month !== -1) {
    const { count: spontiCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .eq('deal_type', 'sponti_coupon')
      .gte('created_at', monthStart);

    if ((spontiCount || 0) >= tierConfig.sponti_deals_per_month) {
      return NextResponse.json({
        error: `You've reached your ${tierConfig.sponti_deals_per_month} Sponti deal limit for this month. Upgrade your plan for more Sponti deals.`,
      }, { status: 403 });
    }
  }

  if (incomingType === 'regular' && tierConfig.regular_deals_per_month !== -1) {
    const { count: regularCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .eq('deal_type', 'regular')
      .gte('created_at', monthStart);

    if ((regularCount || 0) >= tierConfig.regular_deals_per_month) {
      return NextResponse.json({
        error: `You've reached your ${tierConfig.regular_deals_per_month} Regular deal limit for this month. Upgrade your plan for more Regular deals.`,
      }, { status: 403 });
    }
  }
  const {
    deal_type, title, description, original_price, deal_price,
    deposit_amount, max_claims, starts_at, expires_at, timezone, image_url,
    location_ids, website_url, terms_and_conditions, video_urls, amenities,
    how_it_works, highlights, fine_print, image_urls,
  } = body;

  // Check if vendor is trying to schedule a future deal without the custom_scheduling feature
  if (new Date(starts_at) > new Date() && !tierConfig.custom_scheduling) {
    return NextResponse.json({
      error: 'Scheduling deals for the future requires a Pro plan or higher. Upgrade at /vendor/subscription.',
    }, { status: 403 });
  }

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

    // Check duration: minimum 4 hours, maximum 24 hours
    const expiryMs = new Date(expires_at).getTime() - new Date(starts_at).getTime();
    if (expiryMs < 4 * 60 * 60 * 1000) {
      return NextResponse.json({
        error: 'Sponti Coupons must last at least 4 hours to give customers enough time to redeem.',
      }, { status: 400 });
    }
    if (expiryMs > 24 * 60 * 60 * 1000) {
      return NextResponse.json({
        error: 'Sponti Coupons can only last up to 24 hours.',
      }, { status: 400 });
    }

    // Determine if the deal is scheduled for the future
    const dealStatus = new Date(starts_at) > new Date() ? 'draft' : 'active';

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
        status: dealStatus,
        image_url,
        image_urls: image_urls || [],
        benchmark_deal_id: regularDeal.id,
        location_ids: location_ids || null,
        website_url: website_url || null,
        terms_and_conditions: terms_and_conditions || null,
        video_urls: video_urls || [],
        amenities: amenities || [],
        how_it_works: how_it_works || null,
        highlights: highlights || [],
        fine_print: fine_print || null,
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

  // Determine if the deal is scheduled for the future
  const regularDealStatus = new Date(starts_at) > new Date() ? 'draft' : 'active';

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
      deposit_amount: deposit_amount && deposit_amount > 0 ? deposit_amount : null,
      max_claims,
      starts_at,
      expires_at,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: regularDealStatus,
      image_url,
      image_urls: image_urls || [],
      location_ids: location_ids || null,
      website_url: website_url || null,
      terms_and_conditions: terms_and_conditions || null,
      video_urls: video_urls || [],
      amenities: amenities || [],
      how_it_works: how_it_works || null,
      highlights: highlights || [],
      fine_print: fine_print || null,
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
