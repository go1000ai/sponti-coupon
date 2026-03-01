'use client';

import { useEffect, useState, useCallback } from 'react';
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
  UserMinus,
} from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DateRange = '30d' | '90d' | '12m' | 'all';

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

interface RevenueData {
  totalMRR: number;
  lastMonthMRR: number;
  depositRevenue: number;
  tierRevenue: TierRevenue[];
  topVendors: TopVendor[];
  mrrTrend: { month: string; mrr: number }[];
  churnCount: number;
}

export default function AdminRevenuePage() {
  const { user } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');

  const fetchData = useCallback(async (selectedRange: DateRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/revenue?range=${selectedRange}`);
      if (!res.ok) throw new Error('Failed to fetch revenue data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching revenue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData(range);
  }, [user, range, fetchData]);

  const handleRangeChange = (newRange: DateRange) => {
    setRange(newRange);
  };

  const totalMRR = data?.totalMRR || 0;
  const lastMonthMRR = data?.lastMonthMRR || 0;
  const mrrChange = totalMRR - lastMonthMRR;
  const mrrChangePercent = lastMonthMRR > 0 ? ((mrrChange / lastMonthMRR) * 100) : 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-sm text-gray-500">Subscription and deposit revenue overview</p>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {([
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '12m', label: '12 Months' },
            { key: 'all', label: 'All Time' },
          ] as { key: DateRange; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleRangeChange(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="w-6 h-6 text-green-500" />
            <div className={`flex items-center gap-1 text-sm font-medium ${mrrChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {mrrChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {mrrChangePercent > 0 ? '+' : ''}{mrrChangePercent.toFixed(1)}%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalMRR)}</p>
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
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(data?.depositRevenue || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Deposit Revenue</p>
          <p className="text-xs text-gray-400 mt-3">From confirmed deal claims</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalMRR * 12)}</p>
          <p className="text-sm text-gray-500 mt-1">Projected Annual Revenue</p>
          <p className="text-xs text-gray-400 mt-3">Based on current MRR</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <UserMinus className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.churnCount || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Churned Subscriptions</p>
          <p className="text-xs text-gray-400 mt-3">Canceled in selected period</p>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">MRR Trend</h2>
        {(data?.mrrTrend || []).length > 0 ? (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data?.mrrTrend || []}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(value >= 1000 ? 1 : 0)}${value >= 1000 ? 'k' : ''}`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: any) => [formatCurrency(Number(value)), 'MRR']) as any}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-12">No trend data available yet.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* MRR by Tier Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">MRR by Tier</h2>
          <div className="space-y-4">
            {(data?.tierRevenue || []).map(({ tier, count, price, total }) => {
              const percentage = totalMRR > 0 ? (total / totalMRR) * 100 : 0;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">{tier}</span>
                      <span className="text-xs text-gray-400">
                        {count} vendor{count !== 1 ? 's' : ''} x {formatCurrency(price)}/mo
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        tier === 'starter' ? 'bg-blue-400' :
                        tier === 'pro' ? 'bg-primary-400' :
                        tier === 'business' ? 'bg-blue-400' :
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
            <span className="text-lg font-bold text-gray-900">{formatCurrency(totalMRR)}</span>
          </div>
        </div>

        {/* Subscription Overview */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Subscription Tier Pricing</h2>
          <div className="space-y-3">
            {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{tier.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tier.deals_per_month === -1 ? 'Unlimited' : tier.deals_per_month} deals/mo
                    {tier.multi_location && ' | Multi-location'}
                    {tier.api_access && ' | API Access'}
                    {tier.custom_branding && ' | Custom Branding'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(tier.price)}</p>
                  <p className="text-xs text-gray-400">/month</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Vendors */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary-500" />
          Top Vendors by Claims
        </h2>
        {(data?.topVendors || []).length === 0 ? (
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
                {(data?.topVendors || []).map((vendor, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm text-gray-400 font-medium">{idx + 1}</td>
                    <td className="p-3 font-medium text-gray-900">{vendor.business_name}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium capitalize">
                        {vendor.tier || 'none'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-900 font-medium text-center">
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
