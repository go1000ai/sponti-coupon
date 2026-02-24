'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { SUBSCRIPTION_TIERS, TIER_ORDER } from '@/lib/types/database';
import type { SubscriptionTier, SubscriptionStatus, TierFeature } from '@/lib/types/database';

interface VendorTierState {
  tier: SubscriptionTier | null;
  status: SubscriptionStatus | null;
  loading: boolean;
}

export function useVendorTier() {
  const { user, role, loading: authLoading } = useAuth();
  const [state, setState] = useState<VendorTierState>({
    tier: null,
    status: null,
    loading: true,
  });
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (authLoading) return;

    if (!user || role !== 'vendor') {
      setState({ tier: null, status: null, loading: false });
      return;
    }

    let cancelled = false;

    const fetchTier = async () => {
      try {
        const { data } = await supabaseRef.current
          .from('vendors')
          .select('subscription_tier, subscription_status')
          .eq('id', user.id)
          .single();

        if (!cancelled) {
          setState({
            tier: (data?.subscription_tier as SubscriptionTier) || 'starter',
            status: (data?.subscription_status as SubscriptionStatus) || null,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ tier: 'starter', status: null, loading: false });
        }
      }
    };

    fetchTier();

    return () => {
      cancelled = true;
    };
  }, [user, role, authLoading]);

  /** Can the vendor access a specific feature? */
  const canAccess = (feature: TierFeature): boolean => {
    if (!state.tier) return false;
    const tierConfig = SUBSCRIPTION_TIERS[state.tier];
    return !!tierConfig[feature];
  };

  /** What is the minimum tier required for a feature? */
  const requiredTierFor = (feature: TierFeature): SubscriptionTier => {
    for (const t of TIER_ORDER) {
      if (SUBSCRIPTION_TIERS[t][feature]) return t;
    }
    return 'enterprise';
  };

  /** Deals allowed per month for current tier (-1 = unlimited) */
  const dealsPerMonth = state.tier
    ? SUBSCRIPTION_TIERS[state.tier].deals_per_month
    : 6;

  /** Sponti deals per month (-1 = unlimited) */
  const spontiDealsPerMonth = state.tier
    ? SUBSCRIPTION_TIERS[state.tier].sponti_deals_per_month
    : 2;

  /** Regular deals per month (-1 = unlimited) */
  const regularDealsPerMonth = state.tier
    ? SUBSCRIPTION_TIERS[state.tier].regular_deals_per_month
    : 4;

  return {
    ...state,
    canAccess,
    requiredTierFor,
    dealsPerMonth,
    spontiDealsPerMonth,
    regularDealsPerMonth,
    tierConfig: state.tier ? SUBSCRIPTION_TIERS[state.tier] : null,
  };
}
