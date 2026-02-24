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
  Hash,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';
import type { Deal, Vendor } from '@/lib/types/database';

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
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>}>
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

  // Quick Redeem state
  const [redeemDigits, setRedeemDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle auto-checkout redirect (after email confirmation)
  useEffect(() => {
    if (!user) return;
    const checkoutParam = searchParams.get('checkout');
    if (!checkoutParam) return;

    const params = new URLSearchParams(checkoutParam);
    const tier = params.get('tier');
    const interval = params.get('interval') || 'month';

    if (tier) {
      fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, vendorId: user.id, interval }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.url) {
            window.location.href = data.url;
          }
        })
        .catch(() => {
          // If checkout fails, just stay on dashboard
        });
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    async function fetchData() {
      try {
        // Fetch vendor and deals
        const [vendorRes, dealsRes] = await Promise.all([
          supabase.from('vendors').select('*').eq('id', user!.id).single(),
          supabase
            .from('deals')
            .select('*')
            .eq('vendor_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        setVendor(vendorRes.data);
        const allDeals = dealsRes.data || [];
        setDeals(allDeals);

        // Try to get analytics from RPC — fallback to computed
        try {
          const analyticsRes = await supabase.rpc('get_vendor_analytics', { vendor_id_param: user!.id });
          if (analyticsRes.data && !analyticsRes.error) {
            setAnalytics(analyticsRes.data);
          } else {
            computeAnalytics(allDeals);
          }
        } catch {
          computeAnalytics(allDeals);
        }

        // Build mini sparkline data from deals
        const chartData = allDeals
          .slice(0, 7)
          .reverse()
          .map(d => ({
            date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            claims: d.claims_count,
          }));
        setRecentClaims(chartData);
      } catch (err) {
        console.error('[VendorDashboard] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
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

  // Quick Redeem handlers
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...redeemDigits];
    newDigits[index] = value.slice(-1);
    setRedeemDigits(newDigits);

    if (value && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      setTimeout(() => handleRedeem(fullCode), 200);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !redeemDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...redeemDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setRedeemDigits(newDigits);
    if (pasted.length === 6) {
      setTimeout(() => handleRedeem(pasted), 200);
    }
  };

  const handleRedeem = async (code: string) => {
    if (code.length !== 6) return;
    setRedeeming(true);
    setRedeemResult(null);

    try {
      const res = await fetch(`/api/redeem/${code}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRedeemResult({ success: true, ...data });
      } else {
        setRedeemResult({ success: false, error: data.error || 'Redemption failed' });
      }
    } catch {
      setRedeemResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setRedeeming(false);
    }
  };

  const resetRedeem = () => {
    setRedeemDigits(['', '', '', '', '', '']);
    setRedeemResult(null);
    digitRefs.current[0]?.focus();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const totalDepositRevenue = deals.reduce((sum, d) => {
    if (d.deal_type === 'sponti_coupon' && d.deposit_amount) {
      return sum + (d.deposit_amount * d.claims_count);
    }
    return sum;
  }, 0);

  const activeDeals = deals.filter(d => d.status === 'active');
  const spontiDeals = deals.filter(d => d.deal_type === 'sponti_coupon' && d.status === 'active');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-500">
            Welcome back, {vendor?.business_name}
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            {vendor?.subscription_tier && (
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full text-sm font-medium capitalize">
                {vendor.subscription_tier} Plan
              </span>
            )}
            {vendor?.city && <span className="text-sm">{vendor.city}, {vendor.state}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/vendor/deals/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Deal
          </Link>
          <Link href="/vendor/scan" className="btn-secondary flex items-center gap-2">
            <QrCode className="w-4 h-4" /> Scan QR
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <Tag className="w-5 h-5 text-primary-500" />
            {activeDeals.length > 0 && (
              <span className="text-xs text-green-500 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> {activeDeals.length}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-secondary-500">{analytics?.active_deals || 0}</p>
          <p className="text-sm text-gray-500">Active Deals</p>
        </div>
        <div className="card p-5">
          <Users className="w-5 h-5 text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.total_claims || 0}</p>
          <p className="text-sm text-gray-500">Total Claims</p>
        </div>
        <div className="card p-5">
          <QrCode className="w-5 h-5 text-green-500 mb-1" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.total_redemptions || 0}</p>
          <p className="text-sm text-gray-500">Redemptions</p>
        </div>
        <div className="card p-5">
          <TrendingUp className="w-5 h-5 text-purple-500 mb-1" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.conversion_rate || 0}%</p>
          <p className="text-sm text-gray-500">Conversion Rate</p>
        </div>
        <div className="card p-5">
          <DollarSign className="w-5 h-5 text-green-500 mb-1" />
          <p className="text-2xl font-bold text-secondary-500">{formatCurrency(totalDepositRevenue)}</p>
          <p className="text-sm text-gray-500">Deposit Revenue</p>
        </div>
      </div>

      {/* Quick Redeem + Chart Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Redeem Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-secondary-500">Quick Redeem</h2>
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
                    className="w-11 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    disabled={redeeming}
                  />
                ))}
              </div>
              {redeeming && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redeeming...
                </div>
              )}
              <Link href="/vendor/scan" className="text-xs text-primary-500 hover:underline flex items-center justify-center gap-1 mt-3">
                <QrCode className="w-3 h-3" /> Or scan QR code
              </Link>
            </>
          ) : redeemResult.success ? (
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-600 mb-1">Redeemed!</p>
              {redeemResult.deal && (
                <p className="text-sm text-gray-600 mb-1">{redeemResult.deal.title}</p>
              )}
              {redeemResult.customer && (
                <p className="text-xs text-gray-500 mb-1">{redeemResult.customer.name}</p>
              )}
              {redeemResult.remaining_balance !== undefined && redeemResult.remaining_balance > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                  <p className="text-sm font-medium text-yellow-700">
                    Collect: {formatCurrency(redeemResult.remaining_balance)}
                  </p>
                </div>
              )}
              <button onClick={resetRedeem} className="text-sm text-primary-500 hover:underline mt-3">
                Redeem another
              </button>
            </div>
          ) : (
            <div className="text-center">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="font-semibold text-red-500 mb-1">Failed</p>
              <p className="text-sm text-gray-500 mb-2">{redeemResult.error}</p>
              <button onClick={resetRedeem} className="text-sm text-primary-500 hover:underline">
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Claims Mini Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary-500">Claims by Deal</h2>
            <Link href="/vendor/analytics" className="text-primary-500 hover:underline text-sm font-medium flex items-center gap-1">
              Full Analytics <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentClaims.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={recentClaims}>
                <defs>
                  <linearGradient id="dashClaimsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="claims" stroke="#f97316" strokeWidth={2} fill="url(#dashClaimsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400">
              <p>Create deals to see claim trends</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions + Sponti Deals */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/vendor/analytics" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-secondary-500 group-hover:text-primary-500 transition-colors">Analytics</h3>
            <p className="text-xs text-gray-500">Charts &amp; performance data</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
        </Link>

        <Link href="/vendor/insights" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="bg-gradient-to-br from-primary-500 to-orange-400 rounded-xl p-3 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-secondary-500 group-hover:text-primary-500 transition-colors">AI Insights</h3>
            <p className="text-xs text-gray-500">Smart recommendations</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
        </Link>

        {spontiDeals.length > 0 ? (
          <div className="card p-5 bg-gradient-to-r from-primary-50 to-orange-50 border border-primary-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary-500" />
              <span className="font-bold text-primary-600">
                {spontiDeals.length} Active Sponti Deal{spontiDeals.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {spontiDeals.reduce((s, d) => s + d.claims_count, 0)} total claims on Sponti Coupons
            </p>
          </div>
        ) : (
          <Link href="/vendor/deals/new" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group border-dashed border-2 border-gray-200">
            <div className="bg-gray-100 rounded-xl p-3 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-secondary-500 group-hover:text-primary-500 transition-colors">Create a Deal</h3>
              <p className="text-xs text-gray-500">Start attracting customers</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
          </Link>
        )}
      </div>

      {/* Recent Deals */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-secondary-500">Recent Deals</h2>
          <Link href="/vendor/deals" className="text-primary-500 hover:underline text-sm font-medium flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {deals.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">No deals yet</h3>
            <p className="text-gray-400 mt-1">Create your first deal to start attracting customers</p>
            <Link href="/vendor/deals/new" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> Create Your First Deal
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deals.map(deal => (
              <div key={deal.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {deal.image_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deal.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!deal.image_url && (
                    <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-50'}`}>
                      {deal.deal_type === 'sponti_coupon' ? (
                        <SpontiIcon className="w-5 h-5 text-primary-500" />
                      ) : (
                        <Tag className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-secondary-500 truncate">{deal.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        deal.status === 'active' ? 'bg-green-50 text-green-600' :
                        deal.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                        deal.status === 'paused' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {deal.status}
                      </span>
                      {deal.deal_type === 'sponti_coupon' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary-600">
                          Sponti
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatPercentage(deal.discount_percentage)} off
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {deal.status === 'active' && deal.deal_type === 'sponti_coupon' && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <CountdownTimer expiresAt={deal.expires_at} size="sm" />
                    </div>
                  )}
                  <div className="text-right">
                    <p className="font-bold text-primary-500">{formatCurrency(deal.deal_price)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(deal.original_price)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-secondary-500">{deal.claims_count}</p>
                    <p className="text-xs text-gray-400">claims</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
