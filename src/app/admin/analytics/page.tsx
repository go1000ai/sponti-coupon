'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  Store,
  Trophy,
  Globe,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from 'recharts';

interface DealViewPoint {
  date: string;
  views: number;
}

interface SignupPoint {
  date: string;
  count: number;
}

interface TopDeal {
  title: string;
  vendor_name: string;
  claims_count: number;
  conversion_rate: number;
}

interface PageViewPoint {
  date: string;
  views: number;
  unique_visitors: number;
}

interface TopPage {
  path: string;
  views: number;
  unique_visitors: number;
}

interface TopReferrer {
  source: string;
  views: number;
}

interface AnalyticsData {
  deal_views_over_time: DealViewPoint[];
  claims_vs_redemptions: { total_claims: number; total_redemptions: number };
  customer_signups: SignupPoint[];
  vendor_signups: SignupPoint[];
  top_deals: TopDeal[];
  page_views_over_time: PageViewPoint[];
  top_pages: TopPage[];
  top_referrers: TopReferrer[];
}

const RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPath(path: string) {
  if (path === '/') return 'Homepage';
  return path.replace(/^\//, '').replace(/\//g, ' / ');
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
    } catch {
      console.error('Error fetching analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchAnalytics();
  }, [user, fetchAnalytics]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const claimsRedemptionsData = [
    { name: 'Claims', value: data.claims_vs_redemptions.total_claims },
    { name: 'Redemptions', value: data.claims_vs_redemptions.total_redemptions },
  ];

  const totalPageViews = (data.page_views_over_time || []).reduce((sum, d) => sum + d.views, 0);
  const totalUniqueVisitors = (data.page_views_over_time || []).reduce((sum, d) => sum + d.unique_visitors, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("admin.analytics.title")}</h1>
            <p className="text-sm text-gray-500">{t("admin.analytics.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                range === r.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-secondary-500" />
            <span className="text-xs text-gray-500">Page Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalPageViews.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-gray-500">Unique Visitors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalUniqueVisitors.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Deal Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.deal_views_over_time.reduce((sum, d) => sum + d.views, 0).toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Claims</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.claims_vs_redemptions.total_claims.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">New Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.customer_signups.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">New Vendors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.vendor_signups.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Website Traffic Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Traffic Over Time Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-bold text-gray-900">Website Traffic</h2>
          </div>
          {(data.page_views_over_time || []).length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              No traffic data yet — tracking starts now
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.page_views_over_time}>
                <defs>
                  <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#29ABE2" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#29ABE2" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatDateLabel(label as string)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Page Views"
                  stroke="#29ABE2"
                  strokeWidth={2}
                  fill="url(#trafficGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="unique_visitors"
                  name="Unique Visitors"
                  stroke="#E8632B"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary-500" />
              <span className="text-sm text-gray-500">Page Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500" />
              <span className="text-sm text-gray-500">Unique Visitors</span>
            </div>
          </div>
        </div>

        {/* Top Referrers */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-gray-900">Top Traffic Sources</h2>
          </div>
          {(data.top_referrers || []).length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              No referrer data yet
            </div>
          ) : (
            <div className="space-y-3">
              {data.top_referrers.map((ref, index) => {
                const maxViews = data.top_referrers[0]?.views || 1;
                const pct = Math.round((ref.views / maxViews) * 100);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                        {ref.source}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{ref.views.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 p-6 border-b border-gray-100">
          <Globe className="w-5 h-5 text-secondary-500" />
          <h2 className="text-lg font-bold text-gray-900">Top Pages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">#</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Page</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Views</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Unique Visitors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data.top_pages || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No page data yet
                  </td>
                </tr>
              ) : (
                data.top_pages.map((page, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-400 font-medium">{index + 1}</td>
                    <td className="p-4">
                      <span className="font-medium text-gray-900">{formatPath(page.path)}</span>
                      <span className="text-xs text-gray-400 ml-2">{page.path}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-900 font-medium text-center">
                      {page.views.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-gray-900 font-medium text-center">
                      {page.unique_visitors.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Deal Views Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Deal Views</h2>
          </div>
          {data.deal_views_over_time.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              No view data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.deal_views_over_time}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatDateLabel(label as string)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#viewsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Claims vs Redemptions */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-gray-900">Claims vs Redemptions</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={claimsRedemptionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {claimsRedemptionsData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#29ABE2'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-500">
                Claims ({data.claims_vs_redemptions.total_claims.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary-500" />
              <span className="text-sm text-gray-500">
                Redemptions ({data.claims_vs_redemptions.total_redemptions.toLocaleString()})
              </span>
            </div>
          </div>
        </div>

        {/* Customer Signups Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Customer Signups</h2>
          </div>
          {data.customer_signups.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              No signup data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.customer_signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatDateLabel(label as string)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#29ABE2"
                  strokeWidth={2}
                  dot={{ fill: '#29ABE2', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Vendor Signups Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Vendor Signups</h2>
          </div>
          {data.vendor_signups.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              No signup data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.vendor_signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatDateLabel(label as string)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Deals Table */}
      <div className="card">
        <div className="flex items-center gap-2 p-6 border-b border-gray-100">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900">Top 10 Deals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">#</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.top_deals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No deal data for this period
                  </td>
                </tr>
              ) : (
                data.top_deals.map((deal, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-900">{deal.title}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {deal.vendor_name}
                    </td>
                    <td className="p-4 text-sm text-gray-900 font-medium text-center">
                      {deal.claims_count.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          deal.conversion_rate >= 50
                            ? 'bg-green-50 text-green-700'
                            : deal.conversion_rate >= 25
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {deal.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
