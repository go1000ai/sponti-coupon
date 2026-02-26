import type { Deal, Vendor } from '@/lib/types/database';
import type { RankingConfig } from './ranking-weights';
import { DEFAULT_RANKING_CONFIG } from './ranking-weights';

// ── Signal Functions (each returns 0–1) ──────────────────────

/** Tier boost: Enterprise=1.0, Business=0.75, Pro=0.35, Starter=0.0 */
function scoreTier(tier: string | null | undefined): number {
  switch (tier) {
    case 'enterprise': return 1.0;
    case 'business':   return 0.75;
    case 'pro':        return 0.35;
    case 'starter':
    default:           return 0.0;
  }
}

/** Keyword relevance: weighted match density across deal fields. Neutral (1.0) when no search. */
function scoreRelevance(
  deal: Deal & { vendor?: Vendor },
  searchKeywords: string[],
): number {
  if (searchKeywords.length === 0) return 1.0;

  const fields = [
    { text: deal.title || '', weight: 3.0 },
    { text: deal.vendor?.business_name || '', weight: 2.5 },
    { text: deal.vendor?.category || '', weight: 2.0 },
    { text: (deal.search_tags || []).join(' '), weight: 2.0 },
    { text: deal.description || '', weight: 1.0 },
    { text: (deal.highlights || []).join(' '), weight: 1.0 },
    { text: (deal.amenities || []).join(' '), weight: 0.5 },
  ];

  let totalScore = 0;
  let maxPossible = 0;

  for (const kw of searchKeywords) {
    for (const field of fields) {
      maxPossible += field.weight;
      if (field.text.toLowerCase().includes(kw)) {
        totalScore += field.weight;
      }
    }
  }

  return maxPossible > 0 ? totalScore / maxPossible : 1.0;
}

/** Freshness: exponential decay. Brand new=1.0, at half-life=0.5 */
function scoreFreshness(createdAt: string, halfLifeDays: number): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 0) return 1.0;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/** Engagement: claims fill rate, or log scale for uncapped deals */
function scoreEngagement(claimsCount: number, maxClaims: number | null): number {
  if (maxClaims && maxClaims > 0) {
    return Math.min(claimsCount / maxClaims, 0.95);
  }
  if (claimsCount === 0) return 0;
  return Math.min(Math.log10(claimsCount + 1) / Math.log10(101), 1.0);
}

/** Deal quality: discount % normalized with sqrt compression */
function scoreQuality(discountPercentage: number | null | undefined): number {
  if (!discountPercentage || discountPercentage <= 0) return 0;
  return Math.sqrt(Math.min(discountPercentage / 90, 1.0));
}

/** Distance: linear decay from 1.0 (here) to 0.0 (at radius edge). Neutral when no location. */
function scoreDistance(distanceMiles: number | null | undefined, radiusMiles: number): number {
  if (distanceMiles == null || radiusMiles <= 0) return 1.0;
  if (distanceMiles <= 0) return 1.0;
  return Math.max(1.0 - distanceMiles / radiusMiles, 0);
}

/** Urgency: stepped boost for deals expiring soon */
function scoreUrgency(expiresAt: string): number {
  const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft <= 0) return 0;
  if (hoursLeft <= 2) return 1.0;
  if (hoursLeft <= 6) return 0.8;
  if (hoursLeft <= 24) return 0.5;
  if (hoursLeft <= 72) return 0.2;
  return 0;
}

/** Deal type: small nudge for Sponti Coupons (flash deals) */
function scoreDealType(dealType: string): number {
  return dealType === 'sponti_coupon' ? 1.0 : 0.0;
}

// ── Composite Ranking ────────────────────────────────────────

export interface RankedDeal extends Deal {
  distance?: number;
  is_featured: boolean;
  ranking_score: number;
}

type DealWithExtras = Deal & { distance?: number; vendor?: Vendor };

const FEATURED_TIERS = ['business', 'enterprise'];

export function rankDeals(
  deals: DealWithExtras[],
  options: {
    searchKeywords?: string[];
    radiusMiles?: number;
    config?: RankingConfig;
  },
): RankedDeal[] {
  const config = options.config || DEFAULT_RANKING_CONFIG;
  const { weights, freshnessHalfLifeDays } = config;
  const keywords = options.searchKeywords || [];
  const radius = options.radiusMiles || 25;

  const scored: RankedDeal[] = deals.map(deal => {
    const score =
      weights.tier       * scoreTier(deal.vendor?.subscription_tier) +
      weights.relevance  * scoreRelevance(deal, keywords) +
      weights.freshness  * scoreFreshness(deal.created_at, freshnessHalfLifeDays) +
      weights.engagement * scoreEngagement(deal.claims_count || 0, deal.max_claims) +
      weights.quality    * scoreQuality(deal.discount_percentage) +
      weights.distance   * scoreDistance(deal.distance, radius) +
      weights.urgency    * scoreUrgency(deal.expires_at) +
      weights.dealType   * scoreDealType(deal.deal_type);

    return {
      ...deal,
      is_featured: FEATURED_TIERS.includes(deal.vendor?.subscription_tier || ''),
      ranking_score: Math.round(score * 100) / 100,
    };
  });

  // Sort by score descending, then newest as tiebreaker
  scored.sort((a, b) => {
    if (b.ranking_score !== a.ranking_score) return b.ranking_score - a.ranking_score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return scored;
}
