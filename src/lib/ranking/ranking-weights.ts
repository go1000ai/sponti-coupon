import type { SupabaseClient } from '@supabase/supabase-js';

export interface RankingWeights {
  tier: number;
  relevance: number;
  freshness: number;
  engagement: number;
  quality: number;
  distance: number;
  urgency: number;
  dealType: number;
}

export interface RankingConfig {
  weights: RankingWeights;
  freshnessHalfLifeDays: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  tier: 30,
  relevance: 25,
  freshness: 10,
  engagement: 8,
  quality: 5,
  distance: 15,
  urgency: 5,
  dealType: 2,
};

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  weights: DEFAULT_RANKING_WEIGHTS,
  freshnessHalfLifeDays: 7,
};

/** Load ranking config from platform_settings, falling back to defaults */
export async function loadRankingConfig(supabase: SupabaseClient): Promise<RankingConfig> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'ranking_config')
      .maybeSingle();

    if (data?.value) {
      const stored = data.value as Partial<RankingConfig>;
      return {
        weights: { ...DEFAULT_RANKING_WEIGHTS, ...stored.weights },
        freshnessHalfLifeDays: stored.freshnessHalfLifeDays ?? DEFAULT_RANKING_CONFIG.freshnessHalfLifeDays,
      };
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_RANKING_CONFIG;
}
