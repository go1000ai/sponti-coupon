'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import {
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  TrendingUp,
  Compass,
  QrCode,
  ArrowRight,
  Clock,
  Tag,
  Gift,
  BarChart3,
} from 'lucide-react';
import type { Claim, Deal } from '@/lib/types/database';

// Lazy-load Recharts to avoid SSR issues
const SavingsChart = dynamic(() => import('@/components/dashboard/SavingsChart'), { ssr: false });
const CategoryChart = dynamic(() => import('@/components/dashboard/CategoryChart'), { ssr: false });
const ActivityChart = dynamic(() => import('@/components/dashboard/ActivityChart'), { ssr: false });

interface AnalyticsData {
  savings_over_time: { month: string; label: string; saved: number }[];
  category_breakdown: { name: string; value: number; saved: number; color: string }[];
  redemption_activity: { month: string; label: string; claimed: number; redeemed: number; expired: number }[];
  totals: { total_saved: number; total_claimed: number; total_redeemed: number; total_expired: number };
}

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgGradient: string;
  iconBg: string;
  textColor: string;
  labelColor: string;
}

export default function ConsumerDashboardPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsRes, analyticsRes] = await Promise.all([
        fetch('/api/claims'),
        fetch('/api/customer/analytics'),
      ]);
      const claimsData = await claimsRes.json();
      const analyticsData = await analyticsRes.json();
      setClaims(claimsData.claims || []);
      setAnalytics(analyticsData);
    } catch {
      setClaims([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const getStatus = (claim: Claim) => {
    if (claim.redeemed) return 'redeemed';
    if (new Date(claim.expires_at) < new Date()) return 'expired';
    if (!claim.deposit_confirmed) return 'pending_deposit';
    return 'active';
  };

  // Stats calculations
  const totalSavings = claims.reduce((sum, claim) => {
    if (claim.deal && claim.redeemed) {
      return sum + (claim.deal.original_price - claim.deal.deal_price);
    }
    return sum;
  }, 0);

  const activeClaims = claims.filter((c) => {
    const status = getStatus(c);
    return status === 'active' || status === 'pending_deposit';
  });

  const redeemedCount = claims.filter((c) => c.redeemed).length;

  const pendingSavings = claims.reduce((sum, claim) => {
    const status = getStatus(claim);
    if (claim.deal && (status === 'active' || status === 'pending_deposit')) {
      return sum + (claim.deal.original_price - claim.deal.deal_price);
    }
    return sum;
  }, 0);

  // Recent activity (last 10)
  const recentActivity = [...claims]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const statCards: StatCard[] = [
    {
      label: 'Total Saved',
      value: formatCurrency(totalSavings),
      icon: <DollarSign className="w-5 h-5 text-white" />,
      bgGradient: 'from-green-50 to-emerald-50 border-green-100',
      iconBg: 'bg-green-500',
      textColor: 'text-green-700',
      labelColor: 'text-green-600',
    },
    {
      label: 'Active Deals',
      value: activeClaims.length,
      icon: <ShoppingBag className="w-5 h-5 text-white" />,
      bgGradient: 'from-primary-50 to-orange-50 border-primary-100',
      iconBg: 'bg-primary-500',
      textColor: 'text-primary-700',
      labelColor: 'text-primary-600',
    },
    {
      label: 'Deals Redeemed',
      value: redeemedCount,
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      bgGradient: 'from-blue-50 to-indigo-50 border-blue-100',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-700',
      labelColor: 'text-blue-600',
    },
    {
      label: 'Pending Savings',
      value: formatCurrency(pendingSavings),
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      bgGradient: 'from-purple-50 to-violet-50 border-purple-100',
      iconBg: 'bg-purple-500',
      textColor: 'text-purple-700',
      labelColor: 'text-purple-600',
    },
  ];

  const firstName = user?.user_metadata?.first_name || 'there';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary-500">
          Welcome back, {firstName}!
        </h1>
        <p className="text-gray-500 mt-1">Here is an overview of your deals and savings.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`card p-5 bg-gradient-to-br ${stat.bgGradient}`}
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.iconBg} rounded-xl p-2.5 flex-shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${stat.labelColor}`}>{stat.label}</p>
                <p className={`text-xl md:text-2xl font-bold ${stat.textColor} truncate`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/deals"
          className="card p-5 flex items-center gap-4 hover:shadow-lg transition-shadow group"
        >
          <div className="bg-primary-500 rounded-xl p-3 group-hover:scale-105 transition-transform">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-500">Browse Deals</h3>
            <p className="text-sm text-gray-500">Discover new deals near you</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </Link>

        <Link
          href="/dashboard/my-deals"
          className="card p-5 flex items-center gap-4 hover:shadow-lg transition-shadow group"
        >
          <div className="bg-secondary-500 rounded-xl p-3 group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-500">View My QR Codes</h3>
            <p className="text-sm text-gray-500">See your active deals and codes</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </Link>
      </div>

      {/* ── Analytics Charts ── */}
      {analytics && claims.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-secondary-500">My Savings</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Savings Over Time */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-secondary-500 mb-1">Savings Over Time</h3>
              <p className="text-xs text-gray-400 mb-4">How much you&apos;ve saved each month</p>
              <SavingsChart data={analytics.savings_over_time} />
            </div>

            {/* Category Breakdown */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-secondary-500 mb-1">Deals by Category</h3>
              <p className="text-xs text-gray-400 mb-4">Where you shop the most</p>
              <CategoryChart data={analytics.category_breakdown} />
            </div>
          </div>

          {/* Redemption Activity — full width */}
          <div className="card p-5 mt-4">
            <h3 className="text-sm font-semibold text-secondary-500 mb-1">Coupon Activity</h3>
            <p className="text-xs text-gray-400 mb-4">Claimed vs. redeemed vs. expired</p>
            <ActivityChart data={analytics.redemption_activity} />
          </div>
        </div>
      )}

      {/* Active deals */}
      {activeClaims.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary-500">Active Deals</h2>
            <Link
              href="/dashboard/my-deals"
              className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeClaims.slice(0, 5).map((claim) => {
              const deal = claim.deal;
              if (!deal) return null;
              return (
                <div key={claim.id} className="card p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-primary-50 rounded-lg p-2.5 flex-shrink-0">
                        {deal.deal_type === 'sponti_coupon' ? (
                          <SpontiIcon className="w-6 h-6 text-primary-500" />
                        ) : (
                          <Tag className="w-6 h-6 text-primary-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-secondary-500 truncate">
                          {deal.title}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {(deal.vendor as Deal['vendor'])?.business_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                      <span className="text-primary-500 font-bold text-lg">
                        {formatPercentage(deal.discount_percentage)} off
                      </span>
                      <div className="hidden sm:block">
                        <CountdownTimer expiresAt={claim.expires_at} size="sm" />
                      </div>
                      <Link
                        href="/dashboard/my-deals"
                        className="bg-secondary-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary-600 transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <QrCode className="w-4 h-4" /> QR Code
                      </Link>
                    </div>

                    {/* Mobile countdown */}
                    <div className="sm:hidden">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>Expires in:</span>
                      </div>
                      <CountdownTimer expiresAt={claim.expires_at} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-secondary-500 mb-4">Recent Activity</h2>
          <div className="card divide-y divide-gray-50">
            {recentActivity.map((claim) => {
              const deal = claim.deal;
              if (!deal) return null;
              const status = getStatus(claim);
              const isRedeemed = status === 'redeemed';
              const timestamp = isRedeemed && claim.redeemed_at
                ? new Date(claim.redeemed_at)
                : new Date(claim.created_at);

              return (
                <div key={claim.id} className="flex items-start gap-3 p-4">
                  <div
                    className={`rounded-full p-2 flex-shrink-0 mt-0.5 ${
                      isRedeemed
                        ? 'bg-green-50 text-green-500'
                        : status === 'expired'
                        ? 'bg-red-50 text-red-400'
                        : 'bg-primary-50 text-primary-500'
                    }`}
                  >
                    {isRedeemed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === 'expired' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <Gift className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-500">
                      {isRedeemed ? (
                        <>
                          You redeemed{' '}
                          <span className="font-semibold">{deal.title}</span>
                        </>
                      ) : status === 'expired' ? (
                        <>
                          <span className="font-semibold">{deal.title}</span> expired
                        </>
                      ) : (
                        <>
                          You claimed{' '}
                          <span className="font-semibold">{deal.title}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {timestamp.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {' '}
                      {(deal.vendor as Deal['vendor'])?.business_name && (
                        <>at {(deal.vendor as Deal['vendor'])?.business_name}</>
                      )}
                    </p>
                  </div>
                  {isRedeemed && deal && (
                    <span className="text-green-600 text-sm font-semibold flex-shrink-0">
                      -{formatCurrency(deal.original_price - deal.deal_price)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {claims.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <div className="bg-primary-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <SpontiIcon className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-500">No deals yet</h3>
          <p className="text-gray-400 mt-1 mb-6">
            Start saving by claiming your first deal!
          </p>
          <Link href="/deals" className="btn-primary inline-flex items-center gap-2">
            <Compass className="w-4 h-4" /> Browse Deals
          </Link>
        </div>
      )}
    </div>
  );
}
