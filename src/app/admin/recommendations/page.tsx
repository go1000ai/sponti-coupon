'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Heart,
  Search,
  RefreshCw,
  TrendingUp,
  Tag,
  Percent,
  BarChart3,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface Recommendation {
  id: string;
  title: string;
  deal_type: string;
  discount_percentage: number | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  claims_count: number;
  redemption_count: number;
  vendor_name: string;
  vendor_logo: string | null;
  category_name: string;
  conversion_rate: number;
}

// ── Skeleton Loader ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      <div className="h-7 bg-gray-200 rounded w-16 mt-1" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-6 mx-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-40" /><div className="h-3 bg-gray-100 rounded w-24 mt-1" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      <td className="p-4"><div className="h-5 bg-gray-100 rounded-full w-14 mx-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-12 mx-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-10 mx-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-10 mx-auto" /></td>
      <td className="p-4"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
    </tr>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-slide-up-fade">
      {message}
      <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-lg leading-none">&times;</button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function AdminRecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/recommendations');
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch {
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchRecommendations();
  }, [user, fetchRecommendations]);

  // ── Filtered list ──

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return recommendations;
    const q = searchQuery.toLowerCase();
    return recommendations.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.vendor_name.toLowerCase().includes(q) ||
        r.category_name.toLowerCase().includes(q)
    );
  }, [recommendations, searchQuery]);

  // ── Stats ──

  const stats = useMemo(() => {
    const total = recommendations.length;
    const avgConversion =
      total > 0
        ? Math.round(recommendations.reduce((sum, r) => sum + r.conversion_rate, 0) / total)
        : 0;

    // Top category by count
    const catCounts: Record<string, number> = {};
    for (const r of recommendations) {
      catCounts[r.category_name] = (catCounts[r.category_name] || 0) + 1;
    }
    const topCategory =
      Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';

    return { total, avgConversion, topCategory };
  }, [recommendations]);

  // ── Loading state ──

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="h-8 bg-gray-100 rounded w-full max-w-sm animate-pulse" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {Array.from({ length: 9 }).map((_, i) => (
                  <th key={i} className="p-4">
                    <div className="h-3 bg-gray-100 rounded w-12 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Recommendations</h1>
            <p className="text-sm text-gray-500">Deals currently being recommended to customers, ranked by engagement</p>
          </div>
        </div>
        <button
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Active Deals Recommended</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">{stats.total}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Avg Conversion Rate</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">{stats.avgConversion}%</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Top Category</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500 truncate">{stats.topCategory}</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by deal, vendor, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500 text-center w-14">#</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Category</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Discount</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Redemptions</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    {searchQuery ? (
                      <>
                        <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400">No deals match &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-sm text-gray-300 mt-1">Try a different search term.</p>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400">No active deals being recommended.</p>
                        <p className="text-sm text-gray-300 mt-1">Active deals will appear here once created.</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((rec, index) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-gray-50 transition-colors ${index < 10 ? 'animate-slide-up-fade opacity-0' : ''}`}
                    style={index < 10 ? { animationDelay: `${index * 40}ms`, animationFillMode: 'forwards' } : undefined}
                  >
                    {/* Rank */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-primary-50 text-primary-600 rounded-full text-sm font-bold">
                        {index + 1}
                      </span>
                    </td>

                    {/* Deal Title */}
                    <td className="p-4">
                      <p className="font-medium text-secondary-500 truncate max-w-[220px]">{rec.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {new Date(rec.created_at).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Vendor */}
                    <td className="p-4 text-sm text-gray-600">{rec.vendor_name}</td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="text-sm text-gray-500">{rec.category_name}</span>
                    </td>

                    {/* Deal Type Badge */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          rec.deal_type === 'sponti_coupon'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {rec.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}
                      </span>
                    </td>

                    {/* Discount */}
                    <td className="p-4 text-center text-sm font-medium text-secondary-500">
                      {rec.discount_percentage != null ? `${rec.discount_percentage}%` : '--'}
                    </td>

                    {/* Claims */}
                    <td className="p-4 text-center text-sm font-medium text-secondary-500">
                      {rec.claims_count.toLocaleString()}
                    </td>

                    {/* Redemptions */}
                    <td className="p-4 text-center text-sm font-medium text-secondary-500">
                      {rec.redemption_count.toLocaleString()}
                    </td>

                    {/* Conversion Rate */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          rec.conversion_rate >= 50
                            ? 'bg-green-50 text-green-700'
                            : rec.conversion_rate >= 25
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {rec.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {recommendations.length} recommended deal{recommendations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && <Toast message={error} onClose={() => setError(null)} />}
    </div>
  );
}
