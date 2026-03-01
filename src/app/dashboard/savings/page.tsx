'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Calendar,
  Trophy,
  Star,
  Award,
  Crown,
  Diamond,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { Claim, Deal } from '@/lib/types/database';

interface CategorySavings {
  category: string;
  amount: number;
  count: number;
  color: string;
}

interface Milestone {
  amount: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurants: '#E8632B',
  'beauty-spa': '#EC4899',
  'health-fitness': '#10B981',
  entertainment: '#8B5CF6',
  'food-drink': '#F59E0B',
  shopping: '#3B82F6',
  other: '#6B7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  restaurants: 'Restaurants',
  'beauty-spa': 'Beauty & Spa',
  'health-fitness': 'Health & Fitness',
  entertainment: 'Entertainment',
  'food-drink': 'Food & Drink',
  shopping: 'Shopping',
  other: 'Other',
};

function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(eased * target);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startTime.current = null;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return <>{formatCurrency(count)}</>;
}

export default function SavingsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/claims');
      const data = await response.json();
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchClaims();
  }, [user, fetchClaims]);

  // Total lifetime savings
  const totalSavings = useMemo(() => {
    return claims.reduce((sum, claim) => {
      if (claim.deal && claim.redeemed) {
        return sum + (claim.deal.original_price - claim.deal.deal_price);
      }
      return sum;
    }, 0);
  }, [claims]);

  // Monthly breakdown
  const { currentMonthSavings, previousMonthSavings } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let current = 0;
    let previous = 0;

    claims.forEach((claim) => {
      if (!claim.deal || !claim.redeemed) return;
      const savings = claim.deal.original_price - claim.deal.deal_price;
      const redeemDate = claim.redeemed_at
        ? new Date(claim.redeemed_at)
        : new Date(claim.created_at);

      if (redeemDate.getMonth() === currentMonth && redeemDate.getFullYear() === currentYear) {
        current += savings;
      } else if (redeemDate.getMonth() === prevMonth && redeemDate.getFullYear() === prevYear) {
        previous += savings;
      }
    });

    return { currentMonthSavings: current, previousMonthSavings: previous };
  }, [claims]);

  const monthlyChange = previousMonthSavings > 0
    ? ((currentMonthSavings - previousMonthSavings) / previousMonthSavings) * 100
    : currentMonthSavings > 0 ? 100 : 0;

  // Savings by category
  const categorySavings: CategorySavings[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    claims.forEach((claim) => {
      if (!claim.deal || !claim.redeemed) return;
      const vendor = claim.deal.vendor as Deal['vendor'];
      const category = vendor?.category || 'other';
      const savings = claim.deal.original_price - claim.deal.deal_price;
      const existing = map.get(category) || { amount: 0, count: 0 };
      map.set(category, { amount: existing.amount + savings, count: existing.count + 1 });
    });

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [claims]);

  const maxCategorySavings = Math.max(...categorySavings.map((c) => c.amount), 1);

  // Redemption history (redeemed deals sorted newest first)
  const redemptionHistory = useMemo(() => {
    return claims
      .filter((c) => c.redeemed && c.deal)
      .sort((a, b) => {
        const dateA = a.redeemed_at ? new Date(a.redeemed_at).getTime() : new Date(a.created_at).getTime();
        const dateB = b.redeemed_at ? new Date(b.redeemed_at).getTime() : new Date(b.created_at).getTime();
        return dateB - dateA;
      });
  }, [claims]);

  // Milestones
  const milestones: Milestone[] = [
    { amount: 25, label: '$25 Saved!', icon: <Star className="w-6 h-6" />, color: 'text-amber-500', bgColor: 'bg-amber-100' },
    { amount: 50, label: '$50 Saved!', icon: <Trophy className="w-6 h-6" />, color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
    { amount: 100, label: '$100 Saved!', icon: <Award className="w-6 h-6" />, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    { amount: 250, label: '$250 Saved!', icon: <Crown className="w-6 h-6" />, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    { amount: 500, label: '$500 Saved!', icon: <Diamond className="w-6 h-6" />, color: 'text-primary-500', bgColor: 'bg-primary-100' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Savings</h1>
        <p className="text-gray-500 mt-1">Track your savings and achievements</p>
      </div>

      {/* Hero stat */}
      <div className="card p-8 md:p-10 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200 text-center">
        <div className="bg-green-500 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <DollarSign className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-medium text-green-600 mb-2">Total Lifetime Savings</p>
        <p className="text-4xl md:text-5xl font-extrabold text-green-700">
          <AnimatedCounter target={totalSavings} />
        </p>
        <p className="text-sm text-green-500 mt-2">
          across {redemptionHistory.length} redeemed deal{redemptionHistory.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Monthly breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary-500 rounded-xl p-2.5">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentMonthSavings)}</p>
            </div>
          </div>
          {previousMonthSavings > 0 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {monthlyChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(Math.round(monthlyChange))}% vs last month
            </div>
          )}
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-secondary-500 rounded-xl p-2.5">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Last Month</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(previousMonthSavings)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            {new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Savings by category */}
      {categorySavings.length > 0 && (
        <div className="card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500 rounded-xl p-2.5">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Savings by Category</h2>
          </div>
          <div className="space-y-4">
            {categorySavings.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-900">
                    {CATEGORY_LABELS[cat.category] || cat.category}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{cat.count} deal{cat.count !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(cat.amount / maxCategorySavings) * 100}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-500 rounded-xl p-2.5">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Milestones</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {milestones.map((milestone) => {
            const unlocked = totalSavings >= milestone.amount;
            return (
              <div
                key={milestone.amount}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  unlocked
                    ? `${milestone.bgColor} border-transparent shadow-sm`
                    : 'bg-gray-50 border-gray-100 opacity-50 grayscale'
                }`}
              >
                <div className={unlocked ? milestone.color : 'text-gray-400'}>
                  {milestone.icon}
                </div>
                <span className={`text-xs font-bold text-center ${unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                  {milestone.label}
                </span>
                {unlocked && (
                  <span className="text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    Unlocked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Redemption history */}
      {redemptionHistory.length > 0 ? (
        <div className="card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500 rounded-xl p-2.5">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Redemption History</h2>
          </div>
          <div className="space-y-0 divide-y divide-gray-50">
            {redemptionHistory.map((claim) => {
              const deal = claim.deal!;
              const savings = deal.original_price - deal.deal_price;
              const vendorName = (deal.vendor as Deal['vendor'])?.business_name || 'Unknown';
              const redeemDate = claim.redeemed_at
                ? new Date(claim.redeemed_at)
                : new Date(claim.created_at);

              return (
                <div key={claim.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{deal.title}</p>
                    <p className="text-xs text-gray-400">
                      {vendorName} &middot;{' '}
                      {redeemDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-green-600 font-bold text-sm flex-shrink-0">
                    -{formatCurrency(savings)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-500">No savings yet</h3>
          <p className="text-gray-400 mt-1">
            Redeem your first deal to start tracking your savings!
          </p>
        </div>
      )}
    </div>
  );
}
