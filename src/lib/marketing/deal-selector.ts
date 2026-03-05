import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketingRunType, DealPromotionTarget } from './types';

/**
 * Selects the best deal to promote for a given run.
 * Avoids deals promoted in the last 48 hours.
 */
export async function selectDealForPromotion(
  supabase: SupabaseClient,
  runType: MarketingRunType
): Promise<DealPromotionTarget | null> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // Get recently promoted deal IDs to exclude
  const { data: recentPromotions } = await supabase
    .from('marketing_content_queue')
    .select('deal_id')
    .eq('content_type', 'deal_promotion')
    .gte('created_at', twoDaysAgo)
    .not('deal_id', 'is', null);

  const excludeIds = (recentPromotions || []).map(r => r.deal_id).filter(Boolean);

  // Also check social_posts for recently posted deals
  const { data: recentSocial } = await supabase
    .from('social_posts')
    .select('deal_id')
    .gte('created_at', twoDaysAgo)
    .not('deal_id', 'is', null);

  const socialExclude = (recentSocial || []).map(r => r.deal_id).filter(Boolean);
  const allExclude = Array.from(new Set([...excludeIds, ...socialExclude]));

  // Strategy based on run type
  let deal: DealPromotionTarget | null = null;

  if (runType === 'morning') {
    deal = await findExpiringDeal(supabase, allExclude);
    if (!deal) deal = await findTopPerformer(supabase, allExclude);
  } else if (runType === 'afternoon') {
    deal = await findNewDeal(supabase, allExclude);
    if (!deal) deal = await findUnderperforming(supabase, allExclude);
  } else {
    // Evening: entertainment/food deals or highest discount
    deal = await findTopPerformer(supabase, allExclude);
    if (!deal) deal = await findExpiringDeal(supabase, allExclude);
  }

  // Fallback: any active deal not recently promoted
  if (!deal) deal = await findAnyActiveDeal(supabase, allExclude);

  return deal;
}

async function findExpiringDeal(
  supabase: SupabaseClient,
  excludeIds: string[]
): Promise<DealPromotionTarget | null> {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('deals')
    .select('id, title, vendor_id, vendors!inner(business_name)')
    .eq('status', 'active')
    .lte('end_date', tomorrow)
    .gte('end_date', new Date().toISOString())
    .order('end_date', { ascending: true })
    .limit(1);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data } = await query;
  if (!data?.length) return null;

  const d = data[0] as Record<string, unknown>;
  const vendor = d.vendors as Record<string, unknown>;
  return {
    dealId: d.id as string,
    reason: 'expiring_soon',
    dealTitle: d.title as string,
    vendorName: (vendor?.business_name as string) || 'Local Business',
  };
}

async function findTopPerformer(
  supabase: SupabaseClient,
  excludeIds: string[]
): Promise<DealPromotionTarget | null> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get deals with most claims in the last week
  const { data: topClaims } = await supabase
    .from('claims')
    .select('deal_id')
    .gte('created_at', weekAgo);

  if (!topClaims?.length) return null;

  // Count claims per deal
  const claimCounts: Record<string, number> = {};
  for (const c of topClaims) {
    claimCounts[c.deal_id] = (claimCounts[c.deal_id] || 0) + 1;
  }

  // Sort by count, exclude recent promotions
  const sorted = Object.entries(claimCounts)
    .filter(([id]) => !excludeIds.includes(id))
    .sort(([, a], [, b]) => b - a);

  if (!sorted.length) return null;
  const dealId = sorted[0][0];

  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, vendor_id, vendors!inner(business_name)')
    .eq('id', dealId)
    .eq('status', 'active')
    .single();

  if (!deal) return null;

  const d = deal as Record<string, unknown>;
  const vendor = d.vendors as Record<string, unknown>;
  return {
    dealId: d.id as string,
    reason: 'top_performer',
    dealTitle: d.title as string,
    vendorName: (vendor?.business_name as string) || 'Local Business',
  };
}

async function findNewDeal(
  supabase: SupabaseClient,
  excludeIds: string[]
): Promise<DealPromotionTarget | null> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('deals')
    .select('id, title, vendor_id, vendors!inner(business_name)')
    .eq('status', 'active')
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data } = await query;
  if (!data?.length) return null;

  const d = data[0] as Record<string, unknown>;
  const vendor = d.vendors as Record<string, unknown>;
  return {
    dealId: d.id as string,
    reason: 'new_deal',
    dealTitle: d.title as string,
    vendorName: (vendor?.business_name as string) || 'Local Business',
  };
}

async function findUnderperforming(
  supabase: SupabaseClient,
  excludeIds: string[]
): Promise<DealPromotionTarget | null> {
  // Active deals with 0 claims
  let query = supabase
    .from('deals')
    .select('id, title, vendor_id, vendors!inner(business_name)')
    .eq('status', 'active')
    .eq('total_claims', 0)
    .order('created_at', { ascending: true })
    .limit(1);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data } = await query;
  if (!data?.length) return null;

  const d = data[0] as Record<string, unknown>;
  const vendor = d.vendors as Record<string, unknown>;
  return {
    dealId: d.id as string,
    reason: 'underperforming',
    dealTitle: d.title as string,
    vendorName: (vendor?.business_name as string) || 'Local Business',
  };
}

async function findAnyActiveDeal(
  supabase: SupabaseClient,
  excludeIds: string[]
): Promise<DealPromotionTarget | null> {
  let query = supabase
    .from('deals')
    .select('id, title, vendor_id, vendors!inner(business_name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data } = await query;
  if (!data?.length) return null;

  const d = data[0] as Record<string, unknown>;
  const vendor = d.vendors as Record<string, unknown>;
  return {
    dealId: d.id as string,
    reason: 'new_deal',
    dealTitle: d.title as string,
    vendorName: (vendor?.business_name as string) || 'Local Business',
  };
}
