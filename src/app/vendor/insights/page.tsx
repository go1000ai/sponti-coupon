'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPercentage } from '@/lib/utils';
import {
  TrendingUp, Target, Users, ArrowRight,
  AlertTriangle, CheckCircle, Info, Zap, Crown,
  BarChart3, ShieldCheck, Lightbulb,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt, GatedSection } from '@/components/vendor/UpgradePrompt';

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface InsightsData {
  vendor: { category: string; city: string };
  myStats: {
    totalDeals: number;
    activeDeals: number;
    avgDiscount: number;
    avgClaims: number;
    spontiCount: number;
    regularCount: number;
    spontiAvgClaims: number;
    regularAvgClaims: number;
    bestDeal: { title: string; claims_count: number; discount_percentage: number; deal_type: string } | null;
    worstActiveDeal: { title: string; claims_count: number; discount_percentage: number } | null;
  };
  competitors: {
    count: number;
    avgDiscount: number;
    avgClaims: number;
    topDeal: { title: string; claims_count: number; discount_percentage: number; vendor: { business_name: string } } | null;
    priceRange: { min: number; max: number };
    discountRange: { min: number; max: number };
  } | null;
  localCompetitorCount: number;
  recommendations: Recommendation[];
}

export default function VendorInsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { canAccess, loading: tierLoading } = useVendorTier();

  useEffect(() => {
    fetch('/api/vendor/insights')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto" />
          <p className="text-gray-500 mt-4">Analyzing your deal performance...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Unable to load insights</h2>
        <p className="text-gray-500 mt-2">Please try again later.</p>
      </div>
    );
  }

  // Full-page gate for Starter tier
  if (!tierLoading && !canAccess('ai_insights')) {
    return (
      <UpgradePrompt
        mode="full-page"
        requiredTier="pro"
        featureName="Ava Insights"
        description="Unlock Ava's performance scoring, personalized recommendations, and competitor benchmarking to grow your business faster."
      />
    );
  }

  const { myStats, competitors, recommendations } = data;

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case 'low': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const priorityBg = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50/50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50/50';
      case 'low': return 'border-l-blue-500 bg-blue-50/50';
      default: return 'border-l-gray-300 bg-gray-50';
    }
  };

  // Compute a simple "score" for visual display
  const score = Math.min(100, Math.round(
    (myStats.activeDeals > 0 ? 20 : 0) +
    (myStats.avgClaims > 5 ? 20 : myStats.avgClaims > 0 ? 10 : 0) +
    (myStats.spontiCount > 0 ? 15 : 0) +
    (myStats.totalDeals >= 3 ? 15 : myStats.totalDeals >= 1 ? 8 : 0) +
    (competitors && myStats.avgDiscount >= competitors.avgDiscount ? 15 : 5) +
    (recommendations.filter(r => r.priority === 'high').length === 0 ? 15 : 0)
  ));

  const scoreLabel = score >= 75 ? 'Strong' : score >= 50 ? 'Good' : 'Needs Improvement';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ava&apos;s Insights</h1>
          <p className="text-gray-500 text-sm mt-1">Smart recommendations to optimize your deals and maximize results</p>
        </div>
      </div>

      {/* Score + Quick Stats */}
      <div className="grid lg:grid-cols-4 gap-4 mb-8">
        {/* Performance Score */}
        <div className="card p-6 text-center bg-gradient-to-br from-secondary-500 to-secondary-600 text-white">
          <p className="text-sm text-secondary-200 mb-2">Performance Score</p>
          <p className={`text-5xl font-bold ${score >= 75 ? 'text-green-300' : score >= 50 ? 'text-yellow-300' : 'text-red-300'}`}>
            {score}
          </p>
          <p className={`text-sm mt-1 ${score >= 75 ? 'text-green-300' : score >= 50 ? 'text-yellow-300' : 'text-red-300'}`}>
            {scoreLabel}
          </p>
          <div className="w-full bg-secondary-400 rounded-full h-2 mt-4">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${score >= 75 ? 'bg-green-400' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <div className="card p-5">
          <Target className="w-5 h-5 text-primary-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{myStats.avgDiscount}%</p>
          <p className="text-sm text-gray-500">Avg Discount</p>
          {competitors && (
            <p className="text-xs text-gray-400 mt-1">
              vs {competitors.avgDiscount}% competitor avg
            </p>
          )}
        </div>

        <div className="card p-5">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{myStats.avgClaims}</p>
          <p className="text-sm text-gray-500">Avg Claims/Deal</p>
          {competitors && (
            <p className="text-xs text-gray-400 mt-1">
              vs {competitors.avgClaims} competitor avg
            </p>
          )}
        </div>

        <div className="card p-5">
          <ShieldCheck className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.localCompetitorCount}</p>
          <p className="text-sm text-gray-500">Local Competitors</p>
          <p className="text-xs text-gray-400 mt-1">in {data.vendor.city || 'your area'}</p>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-bold text-gray-900">Recommendations</h2>
          <span className="bg-primary-50 text-primary-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {recommendations.length} tips
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">You&apos;re doing great!</h3>
            <p className="text-gray-500 mt-1">No critical recommendations right now. Keep monitoring your analytics.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return order[a.priority] - order[b.priority];
              })
              .map((rec, i) => (
                <div key={i} className={`card p-5 border-l-4 ${priorityBg(rec.priority)}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {priorityIcon(rec.priority)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{rec.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    {rec.action && (
                      <Link
                        href={rec.action}
                        className="flex-shrink-0 btn-primary text-sm px-4 py-2 flex items-center gap-1"
                      >
                        Take Action <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Competitor Analysis + Your Top Performer */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Competitor Benchmark */}
        <GatedSection loading={tierLoading} locked={!canAccess('competitor_data')} requiredTier="business" featureName="Competitor Benchmarking" description="See how you compare to competitors in your area. Upgrade to Business.">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-gray-900">Competitor Benchmark</h2>
          </div>

          {competitors ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Category: {data.vendor.category || 'General'}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Competitors</p>
                    <p className="text-xl font-bold text-gray-900">{competitors.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avg Discount</p>
                    <p className="text-xl font-bold text-gray-900">{competitors.avgDiscount}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avg Claims</p>
                    <p className="text-xl font-bold text-gray-900">{competitors.avgClaims}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Discount Range</p>
                    <p className="text-xl font-bold text-gray-900">
                      {competitors.discountRange.min}-{competitors.discountRange.max}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Your Position */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Your Avg Discount</span>
                    <span className="text-sm font-bold text-primary-500">{myStats.avgDiscount}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 relative">
                    <div
                      className="bg-primary-500 h-3 rounded-full"
                      style={{ width: `${Math.min(100, (myStats.avgDiscount / Math.max(competitors.discountRange.max, 1)) * 100)}%` }}
                    />
                    <div
                      className="absolute top-0 w-0.5 h-3 bg-secondary-500"
                      style={{ left: `${Math.min(100, (competitors.avgDiscount / Math.max(competitors.discountRange.max, 1)) * 100)}%` }}
                      title={`Competitor avg: ${competitors.avgDiscount}%`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {myStats.avgDiscount >= competitors.avgDiscount ? 'Above' : 'Below'} competitor average
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Your Avg Claims</span>
                    <span className="text-sm font-bold text-primary-500">{myStats.avgClaims}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 relative">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: `${Math.min(100, (myStats.avgClaims / Math.max(competitors.avgClaims * 2, 1)) * 100)}%` }}
                    />
                    <div
                      className="absolute top-0 w-0.5 h-3 bg-secondary-500"
                      style={{ left: `${Math.min(100, (competitors.avgClaims / Math.max(competitors.avgClaims * 2, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {myStats.avgClaims >= competitors.avgClaims ? 'Above' : 'Below'} competitor average
                  </p>
                </div>
              </div>

              {competitors.topDeal && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm font-semibold text-yellow-700">Top Competitor Deal</p>
                  </div>
                  <p className="text-sm text-gray-700">&ldquo;{competitors.topDeal.title}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercentage(competitors.topDeal.discount_percentage)} off &middot; {competitors.topDeal.claims_count} claims
                    {competitors.topDeal.vendor && ` &middot; ${(competitors.topDeal.vendor as { business_name: string }).business_name}`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No competitors found in your category</p>
              <p className="text-xs text-gray-400 mt-1">As more vendors join, you&apos;ll see benchmarks here</p>
            </div>
          )}
        </div>
        </GatedSection>

        {/* Your Performance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-gray-900">Your Performance</h2>
          </div>

          <div className="space-y-4">
            {/* Sponti vs Regular */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Deal Type Comparison</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="inline-flex bg-secondary-100 rounded-full p-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-gray-900" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{myStats.regularAvgClaims}</p>
                  <p className="text-xs text-gray-500">Regular Avg Claims</p>
                  <p className="text-xs text-gray-400">{myStats.regularCount} deals</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex bg-primary-100 rounded-full p-2 mb-2">
                    <SpontiIcon className="w-4 h-4 text-primary-500" />
                  </div>
                  <p className="text-lg font-bold text-primary-500">{myStats.spontiAvgClaims}</p>
                  <p className="text-xs text-gray-500">Sponti Avg Claims</p>
                  <p className="text-xs text-gray-400">{myStats.spontiCount} deals</p>
                </div>
              </div>
            </div>

            {/* Best Deal */}
            {myStats.bestDeal && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-semibold text-green-700">Your Best Deal</p>
                </div>
                <p className="text-sm text-gray-700">&ldquo;{myStats.bestDeal.title}&rdquo;</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatPercentage(myStats.bestDeal.discount_percentage)} off &middot; {myStats.bestDeal.claims_count} claims
                  &middot; {myStats.bestDeal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'}
                </p>
              </div>
            )}

            {/* Worst Active Deal */}
            {myStats.worstActiveDeal && myStats.activeDeals > 1 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-semibold text-orange-700">Needs Attention</p>
                </div>
                <p className="text-sm text-gray-700">&ldquo;{myStats.worstActiveDeal.title}&rdquo;</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatPercentage(myStats.worstActiveDeal.discount_percentage)} off &middot; Only {myStats.worstActiveDeal.claims_count} claims
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Consider boosting the discount or pausing and reworking this deal.
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/vendor/deals/new"
                className="bg-primary-500 text-white rounded-xl p-4 text-center hover:bg-primary-600 transition-colors"
              >
                <Zap className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">Create Deal</p>
              </Link>
              <Link
                href="/vendor/analytics"
                className="bg-secondary-500 text-white rounded-xl p-4 text-center hover:bg-secondary-600 transition-colors"
              >
                <BarChart3 className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">Full Analytics</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
