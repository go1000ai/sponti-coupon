'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import {
  Plus, Tag, Users, QrCode, TrendingUp,
  ArrowRight, Clock, Sparkles, DollarSign, BarChart3,
  Zap, ArrowUpRight, CheckCircle2, XCircle, Loader2,
  Hash, Star,
} from 'lucide-react';
import { ROIDashboard } from '@/components/vendor/ROIDashboard';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { GuidedTour } from '@/components/ui/GuidedTour';
import { VENDOR_DASHBOARD_STEPS } from '@/lib/constants/tour-steps';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';
import type { Deal, Vendor, SubscriptionTier } from '@/lib/types/database';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';

interface Analytics {
  total_deals: number;
  active_deals: number;
  total_claims: number;
  total_redemptions: number;
  conversion_rate: number;
}

interface RedeemResult {
  success: boolean;
  error?: string;
  customer?: { name: string; email: string };
  deal?: { title: string; deal_type: string; deal_price: number; original_price: number; discount_percentage: number; deposit_amount: number | null };
  remaining_balance?: number;
}

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-300 absolute inset-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    }>
      <VendorDashboard />
    </Suspense>
  );
}

function VendorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentClaims, setRecentClaims] = useState<{ date: string; claims: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthlyDeals, setMonthlyDeals] = useState<{ total: number; sponti: number; regular: number }>({ total: 0, sponti: 0, regular: 0 });
  const [revenue, setRevenue] = useState<{ total_revenue: number; commission_savings: number; total_transactions: number } | null>(null);

  const [redeemDigits, setRedeemDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!user) return;
    const checkoutParam = searchParams.get('checkout');
    if (!checkoutParam) return;
    const params = new URLSearchParams(checkoutParam);
    const tier = params.get('tier');
    const interval = params.get('interval') || 'month';
    const promo = params.get('promo') || '';
    if (tier) {
      fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, vendorId: user.id, interval, ...(promo ? { promo } : {}) }),
      })
        .then(res => res.json())
        .then(data => { if (data.url) window.location.href = data.url; })
        .catch(() => {});
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const supabase = createClient();

    async function fetchData() {
      try {
        const [vendorRes, dealsRes] = await Promise.all([
          supabase.from('vendors').select('*').eq('id', user!.id).single(),
          supabase.from('deals').select('*').eq('vendor_id', user!.id).order('created_at', { ascending: false }).limit(10),
        ]);
        setVendor(vendorRes.data);
        const allDeals = dealsRes.data || [];
        setDeals(allDeals);

        // Count deals created this month for usage tracking
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthStart = startOfMonth.toISOString();

        const [totalRes, spontiRes, regularRes] = await Promise.all([
          supabase.from('deals').select('id', { count: 'exact', head: true }).eq('vendor_id', user!.id).gte('created_at', monthStart),
          supabase.from('deals').select('id', { count: 'exact', head: true }).eq('vendor_id', user!.id).eq('deal_type', 'sponti_coupon').gte('created_at', monthStart),
          supabase.from('deals').select('id', { count: 'exact', head: true }).eq('vendor_id', user!.id).eq('deal_type', 'regular').gte('created_at', monthStart),
        ]);
        setMonthlyDeals({
          total: totalRes.count || 0,
          sponti: spontiRes.count || 0,
          regular: regularRes.count || 0,
        });

        try {
          const analyticsRes = await supabase.rpc('get_vendor_analytics', { vendor_id_param: user!.id });
          if (analyticsRes.data && !analyticsRes.error) {
            setAnalytics(analyticsRes.data);
          } else { computeAnalytics(allDeals); }
        } catch { computeAnalytics(allDeals); }

        const chartData = allDeals.slice(0, 7).reverse().map(d => ({
          date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          claims: d.claims_count,
        }));
        setRecentClaims(chartData);

        // Fetch revenue analytics
        try {
          const revRes = await fetch('/api/vendor/revenue?period=month');
          if (revRes.ok) setRevenue(await revRes.json());
        } catch { /* Revenue is non-critical */ }
      } catch (err) {
        console.error('[VendorDashboard] Error:', err);
      } finally { setLoading(false); }
    }

    function computeAnalytics(allDeals: Deal[]) {
      const active = allDeals.filter(d => d.status === 'active');
      const totalClaims = allDeals.reduce((sum, d) => sum + (d.claims_count || 0), 0);
      const totalRedemptions = allDeals.reduce((sum, d) => sum + ((d as Deal & { redemptions_count?: number }).redemptions_count || 0), 0);
      setAnalytics({
        total_deals: allDeals.length,
        active_deals: active.length,
        total_claims: totalClaims,
        total_redemptions: totalRedemptions,
        conversion_rate: totalClaims > 0 ? Math.round((totalRedemptions / totalClaims) * 100) : 0,
      });
    }

    fetchData();
  }, [user, authLoading]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...redeemDigits];
    newDigits[index] = value.slice(-1);
    setRedeemDigits(newDigits);
    if (value && index < 5) digitRefs.current[index + 1]?.focus();
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) setTimeout(() => handleRedeem(fullCode), 200);
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !redeemDigits[index] && index > 0) digitRefs.current[index - 1]?.focus();
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...redeemDigits];
    for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
    setRedeemDigits(newDigits);
    if (pasted.length === 6) setTimeout(() => handleRedeem(pasted), 200);
  };

  const handleRedeem = async (code: string) => {
    if (code.length !== 6) return;
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const res = await fetch(`/api/redeem/${code}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setRedeemResult({ success: true, ...data });
      else setRedeemResult({ success: false, error: data.error || 'Redemption failed' });
    } catch { setRedeemResult({ success: false, error: 'Network error. Please try again.' }); }
    finally { setRedeeming(false); }
  };

  const resetRedeem = () => {
    setRedeemDigits(['', '', '', '', '', '']);
    setRedeemResult(null);
    digitRefs.current[0]?.focus();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-300 absolute inset-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  const activeDeals = deals.filter(d => d.status === 'active');
  const spontiDeals = deals.filter(d => d.deal_type === 'sponti_coupon' && d.status === 'active');

  const statItems = [
    { label: 'Active Deals', value: analytics?.active_deals || 0, icon: <Tag className="w-5 h-5" />, color: 'from-primary-500 to-orange-500', trend: activeDeals.length > 0 ? `${activeDeals.length} live` : undefined },
    { label: 'Total Claims', value: analytics?.total_claims || 0, icon: <Users className="w-5 h-5" />, color: 'from-accent-500 to-blue-600' },
    { label: 'Redemptions', value: analytics?.total_redemptions || 0, icon: <QrCode className="w-5 h-5" />, color: 'from-green-500 to-emerald-600' },
    { label: 'Revenue (Month)', value: revenue?.total_revenue || 0, icon: <DollarSign className="w-5 h-5" />, color: 'from-emerald-500 to-green-600', isCurrency: true, trend: revenue?.total_transactions ? `${revenue.total_transactions} txns` : undefined },
    { label: 'Commission Saved', value: revenue?.commission_savings || 0, icon: <TrendingUp className="w-5 h-5" />, color: 'from-blue-500 to-sky-600', isCurrency: true },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-up">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, <span className="gradient-text">{vendor?.business_name}</span>
            </h1>
            <Sparkles className="w-6 h-6 text-primary-400 animate-pulse-slow" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            {vendor?.subscription_tier && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primary-50 to-orange-50 text-primary-600 px-3 py-1 rounded-full text-sm font-medium capitalize border border-primary-100">
                <Star className="w-3 h-3" /> {vendor.subscription_tier} Plan
              </span>
            )}
            {vendor?.city && <span className="text-sm text-gray-500">{vendor.city}, {vendor.state}</span>}
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link href="/vendor/deals/new" data-tour="vendor-create" className="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transition-all hover:scale-[1.02]">
            <Plus className="w-4 h-4" /> Create Deal
          </Link>
          <Link href="/vendor/scan" data-tour="vendor-scan-qr" className="btn-secondary flex-1 sm:flex-initial flex items-center justify-center gap-2 shadow-lg shadow-secondary-200 hover:shadow-xl transition-all hover:scale-[1.02]">
            <QrCode className="w-4 h-4" /> Scan QR
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div data-tour="vendor-stats" className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        {statItems.map((stat, i) => (
          <div key={stat.label} className="card p-4 sm:p-5 tilt-card animate-fade-up" style={{ animationDelay: `${i * 80 + 100}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <div className={`bg-gradient-to-br ${stat.color} rounded-xl p-2 text-white shadow-lg`}>
                {stat.icon}
              </div>
              {stat.trend && (
                <span className="text-xs text-green-500 font-medium flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3" /> {stat.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
            </p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Deal Usage */}
      {vendor?.subscription_tier && (() => {
        const tier = (vendor.subscription_tier as SubscriptionTier) || 'starter';
        const tierConfig = SUBSCRIPTION_TIERS[tier];
        const isUnlimited = tierConfig.deals_per_month === -1;
        const totalLimit = tierConfig.deals_per_month;
        const spontiLimit = tierConfig.sponti_deals_per_month;
        const regularLimit = tierConfig.regular_deals_per_month;
        const totalPct = isUnlimited ? 0 : Math.min((monthlyDeals.total / totalLimit) * 100, 100);
        const spontiPct = isUnlimited ? 0 : Math.min((monthlyDeals.sponti / spontiLimit) * 100, 100);
        const regularPct = isUnlimited ? 0 : Math.min((monthlyDeals.regular / regularLimit) * 100, 100);

        return (
          <div className="card p-4 sm:p-5 mb-8 animate-fade-up" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-500" />
                Deals This Month
              </h3>
              <span className="text-xs text-gray-400 capitalize">{tierConfig.name} Plan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium text-gray-900">
                    {monthlyDeals.total}{isUnlimited ? '' : ` / ${totalLimit}`}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${totalPct >= 90 ? 'bg-red-500' : totalPct >= 70 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                    style={{ width: isUnlimited ? '15%' : `${totalPct}%` }}
                  />
                </div>
              </div>
              {/* Sponti */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Sponti</span>
                  <span className="font-medium text-gray-900">
                    {monthlyDeals.sponti}{isUnlimited ? '' : ` / ${spontiLimit}`}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${spontiPct >= 90 ? 'bg-red-500' : spontiPct >= 70 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                    style={{ width: isUnlimited ? '15%' : `${spontiPct}%` }}
                  />
                </div>
              </div>
              {/* Regular */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Steady</span>
                  <span className="font-medium text-gray-900">
                    {monthlyDeals.regular}{isUnlimited ? '' : ` / ${regularLimit}`}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${regularPct >= 90 ? 'bg-red-500' : regularPct >= 70 ? 'bg-yellow-500' : 'bg-accent-500'}`}
                    style={{ width: isUnlimited ? '15%' : `${regularPct}%` }}
                  />
                </div>
              </div>
            </div>
            {!isUnlimited && totalPct >= 80 && (
              <p className="text-xs text-yellow-600 mt-2">
                Running low on deals this month.{' '}
                <Link href="/vendor/subscription" className="text-primary-500 hover:underline font-medium">Upgrade</Link> for more.
              </p>
            )}
          </div>
        );
      })()}

      {/* Quick Redeem + Chart Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Redeem Card */}
        <div data-tour="vendor-redeem" className="card p-6 animate-fade-up gradient-border" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gradient-to-br from-primary-500 to-orange-400 rounded-lg p-1.5">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Quick Redeem</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Enter the customer&apos;s 6-digit code</p>

          {!redeemResult ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                {redeemDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { digitRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={i === 0 ? handleDigitPaste : undefined}
                    className="w-11 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all hover:border-gray-300"
                    disabled={redeeming}
                  />
                ))}
              </div>
              {redeeming && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Redeeming...
                </div>
              )}
              <Link href="/vendor/scan" className="text-xs text-primary-500 hover:underline flex items-center justify-center gap-1 mt-3">
                <QrCode className="w-3 h-3" /> Or scan QR code
              </Link>
            </>
          ) : redeemResult.success ? (
            <div className="text-center animate-scale-up">
              <div className="relative w-14 h-14 mx-auto mb-3">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="font-semibold text-green-600 mb-1">Redeemed!</p>
              {redeemResult.deal && <p className="text-sm text-gray-600 mb-1">{redeemResult.deal.title}</p>}
              {redeemResult.customer && <p className="text-xs text-gray-500 mb-1">{redeemResult.customer.name}</p>}
              {redeemResult.remaining_balance !== undefined && redeemResult.remaining_balance > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-2.5 mt-2">
                  <p className="text-sm font-medium text-yellow-700">Collect: {formatCurrency(redeemResult.remaining_balance)}</p>
                </div>
              )}
              <button onClick={resetRedeem} className="text-sm text-primary-500 hover:underline mt-3">Redeem another</button>
            </div>
          ) : (
            <div className="text-center animate-scale-up">
              <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-red-500 mb-1">Failed</p>
              <p className="text-sm text-gray-500 mb-2">{redeemResult.error}</p>
              <button onClick={resetRedeem} className="text-sm text-primary-500 hover:underline">Try again</button>
            </div>
          )}
        </div>

        {/* Claims Mini Chart */}
        <div data-tour="vendor-claims-chart" className="card p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-accent-500 to-blue-600 rounded-lg p-1.5">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Claims by Deal</h2>
            </div>
            <Link href="/vendor/analytics" className="text-primary-500 hover:underline text-sm font-medium flex items-center gap-1 group">
              Full Analytics <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {recentClaims.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={recentClaims}>
                <defs>
                  <linearGradient id="dashClaimsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8632B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8632B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="claims" stroke="#E8632B" strokeWidth={2.5} fill="url(#dashClaimsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Create deals to see claim trends</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div data-tour="vendor-actions" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/vendor/analytics" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-all group tilt-card animate-fade-up" style={{ animationDelay: '700ms' }}>
          <div className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl p-3 text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors">Analytics</h3>
            <p className="text-xs text-gray-500">Charts &amp; performance data</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link href="/vendor/insights" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-all group tilt-card animate-fade-up" style={{ animationDelay: '780ms' }}>
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors">Ava&apos;s Insights</h3>
            <p className="text-xs text-gray-500">Smart recommendations</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>

        {spontiDeals.length > 0 ? (
          <div className="card p-5 bg-gradient-to-r from-primary-50 to-orange-50 border border-primary-100 animate-fade-up" style={{ animationDelay: '860ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-br from-primary-500 to-orange-400 rounded-lg p-1">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-primary-600">{spontiDeals.length} Active Sponti Deal{spontiDeals.length > 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm text-gray-600">{spontiDeals.reduce((s, d) => s + d.claims_count, 0)} total claims on Sponti Coupons</p>
          </div>
        ) : (
          <Link href="/vendor/deals/new" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-all group border-dashed border-2 border-gray-200 hover:border-primary-300 animate-fade-up" style={{ animationDelay: '860ms' }}>
            <div className="bg-gray-100 rounded-xl p-3 text-gray-400 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-orange-400 group-hover:text-white transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors">Create a Deal</h3>
              <p className="text-xs text-gray-500">Start attracting customers</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </Link>
        )}
      </div>

      {/* ROI Dashboard */}
      <div data-tour="vendor-roi" className="mb-8 animate-fade-up" style={{ animationDelay: '900ms' }}>
        <ROIDashboard />
      </div>

      {/* Recent Deals */}
      <div data-tour="vendor-deals" className="card animate-fade-up" style={{ animationDelay: '1000ms' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Recent Deals</h2>
          <Link href="/vendor/deals" className="text-primary-500 hover:underline text-sm font-medium flex items-center gap-1 group">
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {deals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full animate-pulse-soft" />
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <Tag className="w-6 h-6 text-gray-300" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-500">No deals yet</h3>
            <p className="text-gray-400 mt-1">Create your first deal to start attracting customers</p>
            <Link href="/vendor/deals/new" className="btn-primary inline-flex items-center gap-2 mt-4 shadow-lg shadow-primary-200">
              <Plus className="w-4 h-4" /> Create Your First Deal
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deals.map(deal => (
              <div key={deal.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {deal.image_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deal.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`rounded-xl p-2.5 ${deal.deal_type === 'sponti_coupon' ? 'bg-gradient-to-br from-primary-50 to-orange-50' : 'bg-gray-50'}`}>
                      {deal.deal_type === 'sponti_coupon' ? <SpontiIcon className="w-5 h-5 text-primary-500" /> : <Tag className="w-5 h-5 text-gray-500" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{deal.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        deal.status === 'active' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-600 border border-green-100' :
                        deal.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                        deal.status === 'paused' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-gray-100 text-gray-500'
                      }`}>{deal.status}</span>
                      {deal.deal_type === 'sponti_coupon' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gradient-to-r from-primary-50 to-orange-50 text-primary-600 border border-primary-100">Sponti</span>
                      )}
                      <span className="text-xs text-gray-400">{formatPercentage(deal.discount_percentage)} off</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                  {deal.status === 'active' && deal.deal_type === 'sponti_coupon' && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <CountdownTimer expiresAt={deal.expires_at} size="sm" variant="sponti" />
                    </div>
                  )}
                  <div className="text-right">
                    <p className="font-bold text-primary-500">{formatCurrency(deal.deal_price)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(deal.original_price)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-gray-900">{deal.claims_count}</p>
                    <p className="text-xs text-gray-400">claims</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guided Tour */}
      <GuidedTour tourKey="vendor_dashboard" steps={VENDOR_DASHBOARD_STEPS} />
    </div>
  );
}
