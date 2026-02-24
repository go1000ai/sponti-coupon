'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, ArrowUpRight, ArrowDownRight, Gift, Loader2,
  Coins, ChevronRight, AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  points: number;
  reason: string;
  created_at: string;
  expires_at: string | null;
  deal?: { title: string } | null;
  vendor?: { business_name: string; logo_url: string | null } | null;
}

interface SpontiPointsData {
  balance: number;
  total_earned: number;
  total_redeemed: number;
  total_credit_earned: number;
  can_redeem: boolean;
  max_credit: number;
  min_redeem_points: number;
  points_per_dollar: number;
  transactions: Transaction[];
}

const reasonLabels: Record<string, string> = {
  earn_redemption: 'Deal Redeemed',
  spend_credit: 'Credit Redeemed',
  bonus: 'Bonus',
  adjustment: 'Adjustment',
  reversal: 'Reversal',
  expired: 'Expired',
};

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SpontiPointsWallet() {
  const [data, setData] = useState<SpontiPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const fetchPoints = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/spontipoints');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail — wallet just won't show
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const handleRedeem = async () => {
    const points = parseInt(redeemAmount);
    if (isNaN(points) || points < 500 || points % 100 !== 0) {
      setRedeemError('Enter a multiple of 100, minimum 500.');
      return;
    }
    if (!data || points > data.balance) {
      setRedeemError('Insufficient balance.');
      return;
    }

    setRedeeming(true);
    setRedeemError(null);
    try {
      const res = await fetch('/api/customer/spontipoints/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      });
      const json = await res.json();
      if (res.ok) {
        setRedeemSuccess(json.message);
        setShowRedeem(false);
        setRedeemAmount('');
        fetchPoints();
      } else {
        setRedeemError(json.error || 'Redemption failed.');
      }
    } catch {
      setRedeemError('Network error. Try again.');
    }
    setRedeeming(false);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || (data.balance === 0 && data.transactions.length === 0)) {
    return null; // Don't show wallet if user has no SpontiPoints activity
  }

  const progressToRedeem = Math.min((data.balance / data.min_redeem_points) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium text-white/90">SpontiPoints</span>
          </div>

          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-bold">{data.balance.toLocaleString()}</span>
            <span className="text-lg text-white/80 pb-1">pts</span>
          </div>

          {/* Progress to redeem */}
          {data.balance < data.min_redeem_points ? (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                <span>{data.min_redeem_points - data.balance} pts to first reward</span>
                <span>{data.min_redeem_points} pts</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${progressToRedeem}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                <Gift className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {formatCurrency(data.max_credit)} credit available!
                </span>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Earned</p>
              <p className="text-sm font-bold">{data.total_earned.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Redeemed</p>
              <p className="text-sm font-bold">{data.total_redeemed.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Credit</p>
              <p className="text-sm font-bold">{formatCurrency(data.total_credit_earned)}</p>
            </div>
          </div>

          {/* Redeem button */}
          {data.can_redeem && (
            <button
              onClick={() => { setShowRedeem(!showRedeem); setRedeemError(null); setRedeemSuccess(null); }}
              className="mt-4 w-full bg-white text-orange-600 font-semibold py-2.5 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              Redeem for Credit
            </button>
          )}
        </div>
      </div>

      {/* Redeem Panel */}
      {showRedeem && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary-500">Redeem SpontiPoints</h3>
            <span className="text-xs text-gray-400">100 pts = $1.00</span>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].filter(v => v <= data.balance).map(amount => (
              <button
                key={amount}
                onClick={() => { setRedeemAmount(String(amount)); setRedeemError(null); }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  redeemAmount === String(amount)
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {amount.toLocaleString()} pts (${amount / 100})
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={redeemAmount}
              onChange={e => { setRedeemAmount(e.target.value); setRedeemError(null); }}
              placeholder="Custom amount..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              min={500}
              step={100}
            />
            <button
              onClick={handleRedeem}
              disabled={redeeming}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Redeem
            </button>
          </div>

          {redeemError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {redeemError}
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {redeemSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <Gift className="w-4 h-4 flex-shrink-0" />
          {redeemSuccess}
        </div>
      )}

      {/* Recent Activity */}
      {data.transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-secondary-500">Recent Activity</h3>
            <span className="text-xs text-gray-400">{data.transactions.length} entries</span>
          </div>
          <div className="divide-y divide-gray-50">
            {data.transactions.slice(0, 8).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.points > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {tx.points > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-500 truncate">
                    {tx.vendor?.business_name || reasonLabels[tx.reason] || tx.reason}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tx.deal?.title || reasonLabels[tx.reason] || tx.reason}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${tx.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </p>
                  <p className="text-[10px] text-gray-400">{formatTimeAgo(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          {data.transactions.length > 8 && (
            <div className="px-4 py-2 bg-gray-50 text-center">
              <span className="text-xs text-gray-500">
                Showing 8 of {data.transactions.length} transactions
              </span>
            </div>
          )}
        </div>
      )}

      {/* Learn more */}
      <Link
        href="/loyalty-terms"
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-primary-500 transition-colors"
      >
        <span>SpontiPoints Terms & Conditions</span>
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
