'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Store,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import type { Subscription } from '@/lib/types/database';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';

interface TierRevenue {
  tier: string;
  count: number;
  price: number;
  total: number;
}

interface TopVendor {
  business_name: string;
  tier: string | null;
  claims_count: number;
  tier_revenue: number;
}

export default function AdminRevenuePage() {
  const { user } = useAuth();
  const [tierRevenue, setTierRevenue] = useState<TierRevenue[]>([]);
  const [totalMRR, setTotalMRR] = useState(0);
  const [depositRevenue, setDepositRevenue] = useState(0);
  const [lastMonthMRR, setLastMonthMRR] = useState(0);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchRevenue() {
      const tierPrices: Record<string, number> = {
        starter: SUBSCRIPTION_TIERS.starter.price,
        pro: SUBSCRIPTION_TIERS.pro.price,
        business: SUBSCRIPTION_TIERS.business.price,
        enterprise: SUBSCRIPTION_TIERS.enterprise.price,
      };

      // Current active subscriptions
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active');

      const subs = activeSubs || [];

      // Tier breakdown
      const tierCounts: Record<string, number> = {};
      let mrr = 0;
      subs.forEach((sub: Subscription) => {
        tierCounts[sub.tier] = (tierCounts[sub.tier] || 0) + 1;
        mrr += tierPrices[sub.tier] || 0;
      });

      const tierData: TierRevenue[] = ['starter', 'pro', 'business', 'enterprise'].map(tier => ({
        tier,
        count: tierCounts[tier] || 0,
        price: tierPrices[tier],
        total: (tierCounts[tier] || 0) * tierPrices[tier],
      }));

      setTierRevenue(tierData);
      setTotalMRR(mrr);

      // Deposit revenue - sum of deposit_amount from confirmed claims
      const { data: confirmedClaims } = await supabase
        .from('claims')
        .select('deal:deals(deposit_amount)')
        .eq('deposit_confirmed', true);

      let totalDeposits = 0;
      (confirmedClaims || []).forEach((claim: Record<string, unknown>) => {
        const dealRaw = claim.deal as { deposit_amount: number | null } | { deposit_amount: number | null }[] | null;
        const deal = Array.isArray(dealRaw) ? dealRaw[0] : dealRaw;
        if (deal?.deposit_amount) {
          totalDeposits += deal.deposit_amount;
        }
      });
      setDepositRevenue(totalDeposits);

      // Estimate last month's MRR (use current month count minus any new subs this month)
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const { data: newSubsThisMonth } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('status', 'active')
        .gte('created_at', thisMonthStart.toISOString());

      let newMRR = 0;
      (newSubsThisMonth || []).forEach((sub: { tier: string }) => {
        newMRR += tierPrices[sub.tier] || 0;
      });
      setLastMonthMRR(mrr - newMRR);

      // Top vendors by claims
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select('business_name, subscription_tier')
        .order('created_at', { ascending: false });

      if (vendorsData) {
        const vendorIds: string[] = [];
        const vendorMap: Record<string, { business_name: string; tier: string | null }> = {};

        // We need to get vendor IDs first
        const { data: vendorsFull } = await supabase
          .from('vendors')
          .select('id, business_name, subscription_tier');

        (vendorsFull || []).forEach((v: { id: string; business_name: string; subscription_tier: string | null }) => {
          vendorIds.push(v.id);
          vendorMap[v.id] = { business_name: v.business_name, tier: v.subscription_tier };
        });

        // Get deal claims count per vendor
        const { data: dealsWithClaims } = await supabase
          .from('deals')
          .select('vendor_id, claims_count')
          .in('vendor_id', vendorIds);

        const vendorClaims: Record<string, number> = {};
        (dealsWithClaims || []).forEach((d: { vendor_id: string; claims_count: number }) => {
          vendorClaims[d.vendor_id] = (vendorClaims[d.vendor_id] || 0) + d.claims_count;
        });

        const topVendorsList: TopVendor[] = Object.entries(vendorClaims)
          .map(([vendorId, claimsCount]) => ({
            business_name: vendorMap[vendorId]?.business_name || 'Unknown',
            tier: vendorMap[vendorId]?.tier || null,
            claims_count: claimsCount,
            tier_revenue: tierPrices[vendorMap[vendorId]?.tier || ''] || 0,
          }))
          .sort((a, b) => b.claims_count - a.claims_count)
          .slice(0, 10);

        setTopVendors(topVendorsList);
      }

      setLoading(false);
    }

    fetchRevenue();
  }, [user]);

  const mrrChange = totalMRR - lastMonthMRR;
  const mrrChangePercent = lastMonthMRR > 0 ? ((mrrChange / lastMonthMRR) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <DollarSign className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-secondary-500">Revenue Dashboard</h1>
          <p className="text-sm text-gray-500">Subscription and deposit revenue overview</p>
        </div>
      </div>

      {/* Top Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="w-6 h-6 text-green-500" />
            <div className={`flex items-center gap-1 text-sm font-medium ${mrrChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {mrrChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {mrrChangePercent > 0 ? '+' : ''}{mrrChangePercent.toFixed(1)}%
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary-500">{formatCurrency(totalMRR)}</p>
          <p className="text-sm text-gray-500 mt-1">Monthly Recurring Revenue</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <span>Last month: {formatCurrency(lastMonthMRR)}</span>
            <ArrowRight className="w-3 h-3" />
            <span className={mrrChange >= 0 ? 'text-green-500' : 'text-red-500'}>
              {mrrChange >= 0 ? '+' : ''}{formatCurrency(mrrChange)}
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{formatCurrency(depositRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Deposit Revenue</p>
          <p className="text-xs text-gray-400 mt-3">From confirmed deal claims</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{formatCurrency(totalMRR * 12)}</p>
          <p className="text-sm text-gray-500 mt-1">Projected Annual Revenue</p>
          <p className="text-xs text-gray-400 mt-3">Based on current MRR</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* MRR by Tier Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-secondary-500 mb-4">MRR by Tier</h2>
          <div className="space-y-4">
            {tierRevenue.map(({ tier, count, price, total }) => {
              const percentage = totalMRR > 0 ? (total / totalMRR) * 100 : 0;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-secondary-500 capitalize">{tier}</span>
                      <span className="text-xs text-gray-400">
                        {count} vendor{count !== 1 ? 's' : ''} x {formatCurrency(price)}/mo
                      </span>
                    </div>
                    <span className="text-sm font-bold text-secondary-500">{formatCurrency(total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        tier === 'starter' ? 'bg-blue-400' :
                        tier === 'pro' ? 'bg-primary-400' :
                        tier === 'business' ? 'bg-purple-400' :
                        'bg-amber-400'
                      }`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total MRR</span>
            <span className="text-lg font-bold text-secondary-500">{formatCurrency(totalMRR)}</span>
          </div>
        </div>

        {/* Subscription Overview */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-secondary-500 mb-4">Subscription Tier Pricing</h2>
          <div className="space-y-3">
            {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-secondary-500">{tier.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tier.deals_per_month === -1 ? 'Unlimited' : tier.deals_per_month} deals/mo
                    {tier.multi_location && ' | Multi-location'}
                    {tier.api_access && ' | API Access'}
                    {tier.custom_branding && ' | Custom Branding'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-secondary-500">{formatCurrency(tier.price)}</p>
                  <p className="text-xs text-gray-400">/month</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Vendors */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary-500" />
          Top Vendors by Claims
        </h2>
        {topVendors.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No vendor data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-3 font-semibold text-sm text-gray-500">#</th>
                  <th className="p-3 font-semibold text-sm text-gray-500">Business</th>
                  <th className="p-3 font-semibold text-sm text-gray-500">Tier</th>
                  <th className="p-3 font-semibold text-sm text-gray-500 text-center">Total Claims</th>
                  <th className="p-3 font-semibold text-sm text-gray-500 text-right">Tier Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topVendors.map((vendor, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm text-gray-400 font-medium">{idx + 1}</td>
                    <td className="p-3 font-medium text-secondary-500">{vendor.business_name}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium capitalize">
                        {vendor.tier || 'none'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-secondary-500 font-medium text-center">
                      {vendor.claims_count}
                    </td>
                    <td className="p-3 text-sm text-green-600 font-medium text-right">
                      {vendor.tier_revenue > 0 ? `${formatCurrency(vendor.tier_revenue)}/mo` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
