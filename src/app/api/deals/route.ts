import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { rankDeals } from '@/lib/ranking/deal-ranker';
import { loadRankingConfig } from '@/lib/ranking/ranking-weights';

export const runtime = 'edge';

// GET /api/deals - Browse deals with filters (public endpoint, uses anon client with RLS)
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '25';
  const dealType = searchParams.get('type');
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const searchText = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('deals')
    .select('*, vendor:vendors(*)')
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

  const { data: deals, error } = await query;

  // Filter by vendor category (post-query since vendor is a joined table)
  let categoryFilteredDeals = deals || [];
  if (category) {
    categoryFilteredDeals = categoryFilteredDeals.filter(
      deal => deal.vendor?.category?.toLowerCase() === category.toLowerCase()
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fuzzy match helper — checks if a keyword appears in text, allowing typos
  function fuzzyMatch(keyword: string, text: string): boolean {
    // Exact substring match first (fast path)
    if (text.includes(keyword)) return true;

    // Split text into words and check each for close match
    const words = text.split(/\s+/);
    const maxTypos = keyword.length <= 3 ? 0 : keyword.length <= 5 ? 1 : 2;

    for (const word of words) {
      // Skip words that are way too different in length
      if (Math.abs(word.length - keyword.length) > maxTypos) continue;

      // Levenshtein distance
      const len1 = keyword.length;
      const len2 = word.length;
      const dp: number[][] = Array.from({ length: len1 + 1 }, (_, i) =>
        Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
      );
      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          dp[i][j] = keyword[i - 1] === word[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
      if (dp[len1][len2] <= maxTypos) return true;
    }

    // Also check if keyword is a prefix match (e.g. "auto" matches "automotive")
    for (const word of words) {
      if (word.startsWith(keyword) || keyword.startsWith(word)) return true;
    }

    return false;
  }

  // Keyword search: match across deal title, description, tags, vendor info (with fuzzy/typo tolerance)
  let keywordFilteredDeals = categoryFilteredDeals;
  if (searchText) {
    const keywords = searchText.toLowerCase().split(/\s+/).filter(Boolean);
    keywordFilteredDeals = keywordFilteredDeals.filter(deal => {
      const searchableText = [
        deal.title || '',
        deal.description || '',
        deal.vendor?.category || '',
        deal.vendor?.business_name || '',
        deal.vendor?.description || '',
        ...(deal.search_tags || []),
        ...(deal.amenities || []),
        ...(deal.highlights || []),
      ].join(' ').toLowerCase();
      // Every keyword must match somewhere (exact or fuzzy)
      return keywords.every(kw => fuzzyMatch(kw, searchableText));
    });
  }

  // Filter by distance if lat/lng provided
  let filteredDeals = keywordFilteredDeals;
  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusMiles = parseFloat(radius);

    filteredDeals = filteredDeals
      .filter(deal => {
        // Exclude deals without vendor coordinates when location filtering is active
        if (!deal.vendor?.lat || !deal.vendor?.lng) return false;
        const distance = getDistance(userLat, userLng, deal.vendor.lat, deal.vendor.lng);
        return distance <= radiusMiles;
      })
      .map(deal => ({
        ...deal,
        distance: getDistance(userLat, userLng, deal.vendor.lat, deal.vendor.lng),
      }));
  }

  // Rank deals using weighted scoring algorithm (tier, relevance, distance, freshness, etc.)
  const rankingConfig = await loadRankingConfig(supabase);
  const searchKeywords = searchText ? searchText.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const rankedDeals = rankDeals(filteredDeals, {
    searchKeywords,
    radiusMiles: parseFloat(radius),
    config: rankingConfig,
  });

  return NextResponse.json({ deals: rankedDeals, total: rankedDeals.length });
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

  // Check subscription status and location
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier, subscription_status, lat, lng')
    .eq('id', user.id)
    .single();

  if (!vendor?.subscription_tier || vendor.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required to create deals' }, { status: 403 });
  }

  if (!vendor.lat || !vendor.lng) {
    return NextResponse.json({
      error: 'Please add your business address in Settings before creating deals. Your address is needed so customers can find your deals nearby.',
    }, { status: 400 });
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
        error: `You've reached your ${tierConfig.regular_deals_per_month} Steady deal limit for this month. Upgrade your plan for more Steady deals.`,
      }, { status: 403 });
    }
  }
  const {
    deal_type, title, description, original_price, deal_price,
    deposit_amount, max_claims, starts_at, expires_at, timezone, image_url,
    location_ids, website_url, terms_and_conditions, video_urls, amenities,
    how_it_works, highlights, fine_print, image_urls, search_tags,
  } = body;

  // Draft mode — save the deal immediately with minimal validation
  if (body.status === 'draft') {
    const discount_percentage = original_price && deal_price
      ? ((original_price - deal_price) / original_price) * 100
      : 0;
    const now = new Date().toISOString();
    const { data: draft, error: draftErr } = await supabase
      .from('deals')
      .insert({
        vendor_id: user.id,
        deal_type: deal_type || 'regular',
        title: title || 'Untitled Draft',
        description: description || null,
        original_price: original_price || 0,
        deal_price: deal_price || 0,
        discount_percentage,
        deposit_amount: deposit_amount || null,
        max_claims: max_claims || 50,
        starts_at: starts_at || now,
        expires_at: expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'draft',
        image_url: image_url || null,
        image_urls: image_urls || [],
        location_ids: location_ids || null,
        website_url: website_url || null,
        terms_and_conditions: terms_and_conditions || null,
        video_urls: video_urls || [],
        amenities: amenities || [],
        how_it_works: how_it_works || null,
        highlights: highlights || [],
        fine_print: fine_print || null,
        search_tags: search_tags || [],
      })
      .select()
      .single();

    if (draftErr) {
      return NextResponse.json({ error: draftErr.message }, { status: 500 });
    }
    return NextResponse.json({ deal: draft });
  }

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
        error: 'You must have an active Steady Deal before posting a Sponti Coupon.',
      }, { status: 400 });
    }

    const regularDiscount = ((regularDeal.original_price - regularDeal.deal_price) / regularDeal.original_price) * 100;
    const requiredDiscount = regularDiscount + 10;

    if (discount_percentage - regularDiscount < 10) {
      return NextResponse.json({
        error: `Your Sponti Coupon must offer at least 10% more savings than your Steady Deal (${Math.round(regularDiscount)}% off). Increase your discount to at least ${Math.round(requiredDiscount)}% to publish.`,
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
        search_tags: search_tags || [],
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
      error: 'Steady deals can last up to 30 days.',
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
      search_tags: search_tags || [],
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
