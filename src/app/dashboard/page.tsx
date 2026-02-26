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
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { GuidedTour } from '@/components/ui/GuidedTour';
import { CUSTOMER_DASHBOARD_STEPS } from '@/lib/constants/tour-steps';
import type { Claim, Deal, LoyaltyCard } from '@/lib/types/database';

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
  value: number;
  formatted: string;
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
  const [loyaltyCards, setLoyaltyCards] = useState<(LoyaltyCard & { available_rewards?: { name: string; points_cost: number }[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsRes, analyticsRes, loyaltyRes] = await Promise.all([
        fetch('/api/claims'),
        fetch('/api/customer/analytics'),
        fetch('/api/customer/loyalty'),
      ]);
      const claimsData = await claimsRes.json();
      const analyticsData = await analyticsRes.json();
      const loyaltyData = await loyaltyRes.json();
      setClaims(claimsData.claims || []);
      setAnalytics(analyticsData);
      setLoyaltyCards(loyaltyData.cards || []);
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

  const totalSavings = claims.reduce((sum, claim) => {
    if (claim.deal && claim.redeemed) return sum + (claim.deal.original_price - claim.deal.deal_price);
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

  const recentActivity = [...claims]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const statCards: StatCard[] = [
    {
      label: 'Total Saved',
      value: Math.round(totalSavings * 100),
      formatted: formatCurrency(totalSavings),
      icon: <DollarSign className="w-5 h-5 text-white" />,
      bgGradient: 'from-green-50 to-emerald-50 border-green-100',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      textColor: 'text-green-700',
      labelColor: 'text-green-600',
    },
    {
      label: 'Active Deals',
      value: activeClaims.length,
      formatted: String(activeClaims.length),
      icon: <ShoppingBag className="w-5 h-5 text-white" />,
      bgGradient: 'from-primary-50 to-orange-50 border-primary-100',
      iconBg: 'bg-gradient-to-br from-primary-500 to-orange-500',
      textColor: 'text-primary-700',
      labelColor: 'text-primary-600',
    },
    {
      label: 'Deals Redeemed',
      value: redeemedCount,
      formatted: String(redeemedCount),
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      bgGradient: 'from-blue-50 to-indigo-50 border-blue-100',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      textColor: 'text-blue-700',
      labelColor: 'text-blue-600',
    },
    {
      label: 'Pending Savings',
      value: Math.round(pendingSavings * 100),
      formatted: formatCurrency(pendingSavings),
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      bgGradient: 'from-purple-50 to-violet-50 border-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
      textColor: 'text-purple-700',
      labelColor: 'text-purple-600',
    },
  ];

  const firstName = user?.user_metadata?.first_name || 'there';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-300 absolute inset-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-secondary-500">
            Welcome back, <span className="gradient-text">{firstName}</span>!
          </h1>
          <Sparkles className="w-6 h-6 text-primary-400 animate-pulse-slow" />
        </div>
        <p className="text-gray-500 mt-1">Here is an overview of your deals and savings.</p>
      </div>

      {/* Stats cards — staggered */}
      <div data-tour="customer-stats" className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className={`card p-4 sm:p-5 bg-gradient-to-br ${stat.bgGradient} tilt-card animate-fade-up`}
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.iconBg} rounded-xl p-2.5 flex-shrink-0 shadow-lg`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${stat.labelColor}`}>{stat.label}</p>
                <p className={`text-xl md:text-2xl font-bold ${stat.textColor} truncate`}>
                  {stat.formatted}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div data-tour="customer-actions" className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '500ms' }}>
        <Link href="/deals" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-all group tilt-card">
          <div className="bg-gradient-to-br from-primary-500 to-orange-400 rounded-xl p-3 group-hover:scale-110 transition-transform shadow-lg shadow-primary-200">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-500">Browse Deals</h3>
            <p className="text-sm text-gray-500">Discover new deals near you</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link href="/dashboard/my-deals" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-all group tilt-card">
          <div className="bg-gradient-to-br from-secondary-500 to-secondary-400 rounded-xl p-3 group-hover:scale-110 transition-transform shadow-lg shadow-secondary-200">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-500">View My QR Codes</h3>
            <p className="text-sm text-gray-500">See your active deals and codes</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Loyalty Rewards Progress */}
      {loyaltyCards.length > 0 && (
        <div data-tour="customer-loyalty" className="animate-fade-up" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-primary-500 to-amber-400 rounded-lg p-1.5">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-secondary-500">Loyalty Rewards</h2>
            </div>
            <Link href="/dashboard/loyalty" className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 group">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loyaltyCards.slice(0, 3).map((card) => {
              const program = card.program;
              if (!program) return null;
              const isPunch = program.program_type === 'punch_card';
              const vendorName = card.vendor?.business_name || 'Business';
              const vendorLogo = card.vendor?.logo_url;

              if (isPunch) {
                const required = program.punches_required || 10;
                const current = card.current_punches;
                const progress = Math.min((current / required) * 100, 100);
                const isReady = current >= required;

                return (
                  <Link key={card.id} href="/dashboard/loyalty" className={`card p-5 hover:shadow-lg transition-all group tilt-card ${isReady ? 'gradient-border' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                      {vendorLogo ? (
                        <Image src={vendorLogo} alt={vendorName} width={36} height={36} className="rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center">
                          <Gift className="w-4 h-4 text-primary-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-secondary-500 truncate">{vendorName}</p>
                        <p className="text-xs text-gray-400 truncate">{program.name}</p>
                      </div>
                      {isReady && (
                        <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-bounce-subtle shadow-sm">REWARD!</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Array.from({ length: required }, (_, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${i < current ? 'bg-gradient-to-br from-primary-500 to-orange-400 text-white shadow-sm' : 'bg-gray-100 text-gray-300 border border-gray-200 scale-90'}`}>
                          {i < current ? '✓' : i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                      <div className={`h-2 rounded-full progress-fill ${isReady ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-primary-500 to-orange-400'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {isReady ? `Reward ready: ${program.punch_reward}` : `${current}/${required} stamps — ${required - current} to go!`}
                    </p>
                  </Link>
                );
              }

              const nextReward = card.available_rewards?.[0];
              const pointsProgress = nextReward ? Math.min((card.current_points / nextReward.points_cost) * 100, 100) : 0;

              return (
                <Link key={card.id} href="/dashboard/loyalty" className="card p-5 hover:shadow-lg transition-all group tilt-card">
                  <div className="flex items-center gap-3 mb-3">
                    {vendorLogo ? (
                      <Image src={vendorLogo} alt={vendorName} width={36} height={36} className="rounded-lg object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-secondary-500 truncate">{vendorName}</p>
                      <p className="text-xs text-gray-400 truncate">{program.name}</p>
                    </div>
                  </div>
                  <div className="text-center mb-2">
                    <p className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-violet-500 bg-clip-text text-transparent">{card.current_points}</p>
                    <p className="text-xs text-gray-400">points</p>
                  </div>
                  {nextReward && (
                    <>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 progress-fill" style={{ width: `${pointsProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {card.current_points >= nextReward.points_cost ? `Redeem: ${nextReward.name}` : `${nextReward.points_cost - card.current_points} pts to ${nextReward.name}`}
                      </p>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {analytics && claims.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gradient-to-br from-primary-500 to-orange-400 rounded-lg p-1.5">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-secondary-500">My Savings</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5 tilt-card">
              <h3 className="text-sm font-semibold text-secondary-500 mb-1">Savings Over Time</h3>
              <p className="text-xs text-gray-400 mb-4">How much you&apos;ve saved each month</p>
              <SavingsChart data={analytics.savings_over_time} />
            </div>
            <div className="card p-5 tilt-card">
              <h3 className="text-sm font-semibold text-secondary-500 mb-1">Deals by Category</h3>
              <p className="text-xs text-gray-400 mb-4">Where you shop the most</p>
              <CategoryChart data={analytics.category_breakdown} />
            </div>
          </div>
          <div className="card p-5 mt-4 tilt-card">
            <h3 className="text-sm font-semibold text-secondary-500 mb-1">Coupon Activity</h3>
            <p className="text-xs text-gray-400 mb-4">Claimed vs. redeemed vs. expired</p>
            <ActivityChart data={analytics.redemption_activity} />
          </div>
        </div>
      )}

      {/* Active deals */}
      {activeClaims.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary-500">Active Deals</h2>
            <Link href="/dashboard/my-deals" className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 group">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeClaims.slice(0, 5).map((claim) => {
              const deal = claim.deal;
              if (!deal) return null;
              return (
                <div key={claim.id} className="card p-4 md:p-5 hover:shadow-lg transition-all tilt-card">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`rounded-lg p-2.5 flex-shrink-0 ${deal.deal_type === 'sponti_coupon' ? 'bg-gradient-to-br from-primary-50 to-orange-50' : 'bg-gray-50'}`}>
                        {deal.deal_type === 'sponti_coupon' ? <SpontiIcon className="w-6 h-6 text-primary-500" /> : <Tag className="w-6 h-6 text-primary-500" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-secondary-500 truncate">{deal.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{(deal.vendor as Deal['vendor'])?.business_name}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:gap-6">
                        <span className="text-primary-500 font-bold text-lg">{formatPercentage(deal.discount_percentage)} off</span>
                        <div className="hidden sm:block"><CountdownTimer expiresAt={claim.expires_at} size="sm" /></div>
                      </div>
                      <div className="sm:hidden">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Clock className="w-3 h-3" /><span>Expires in:</span></div>
                        <CountdownTimer expiresAt={claim.expires_at} size="sm" />
                      </div>
                      <Link href="/dashboard/my-deals" className="bg-gradient-to-r from-secondary-500 to-secondary-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:from-secondary-600 hover:to-secondary-700 transition-all flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto">
                        <QrCode className="w-4 h-4" /> QR Code
                      </Link>
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
        <div className="animate-fade-up" style={{ animationDelay: '900ms' }}>
          <h2 className="text-lg font-bold text-secondary-500 mb-4">Recent Activity</h2>
          <div className="card divide-y divide-gray-50">
            {recentActivity.map((claim) => {
              const deal = claim.deal;
              if (!deal) return null;
              const status = getStatus(claim);
              const isRedeemed = status === 'redeemed';
              const timestamp = isRedeemed && claim.redeemed_at ? new Date(claim.redeemed_at) : new Date(claim.created_at);

              return (
                <div key={claim.id} className="flex items-start gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className={`rounded-full p-2 flex-shrink-0 mt-0.5 ${isRedeemed ? 'bg-gradient-to-br from-green-50 to-emerald-50 text-green-500' : status === 'expired' ? 'bg-red-50 text-red-400' : 'bg-gradient-to-br from-primary-50 to-orange-50 text-primary-500'}`}>
                    {isRedeemed ? <CheckCircle2 className="w-4 h-4" /> : status === 'expired' ? <Clock className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-500">
                      {isRedeemed ? <>You redeemed <span className="font-semibold">{deal.title}</span></> : status === 'expired' ? <><span className="font-semibold">{deal.title}</span> expired</> : <>You claimed <span className="font-semibold">{deal.title}</span></>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {' '}{(deal.vendor as Deal['vendor'])?.business_name && <>at {(deal.vendor as Deal['vendor'])?.business_name}</>}
                    </p>
                  </div>
                  {isRedeemed && deal && <span className="text-green-600 text-sm font-semibold flex-shrink-0">-{formatCurrency(deal.original_price - deal.deal_price)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {claims.length === 0 && !loading && (
        <div className="card p-12 text-center animate-fade-up">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-orange-100 rounded-full animate-pulse-soft" />
            <div className="absolute inset-2 bg-gradient-to-br from-primary-50 to-white rounded-full flex items-center justify-center">
              <SpontiIcon className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-secondary-500">No deals yet</h3>
          <p className="text-gray-400 mt-1 mb-6">Start saving by claiming your first deal!</p>
          <Link href="/deals" className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transition-all">
            <Compass className="w-4 h-4" /> Browse Deals
          </Link>
        </div>
      )}

      {/* Guided Tour */}
      <GuidedTour tourKey="customer_dashboard" steps={CUSTOMER_DASHBOARD_STEPS} />
    </div>
  );
}
