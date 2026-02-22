'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { QrCode, Clock, CheckCircle2, XCircle, TrendingUp, DollarSign, ShoppingBag, Copy, Check } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Claim, Deal } from '@/lib/types/database';

export default function MyDealsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'redeemed'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    const response = await fetch(`/api/claims${params}`);
    const data = await response.json();
    setClaims(data.claims || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (!user) return;
    fetchClaims();
  }, [user, filter, fetchClaims]);

  const getStatus = (claim: Claim) => {
    if (claim.redeemed) return 'redeemed';
    if (new Date(claim.expires_at) < new Date()) return 'expired';
    if (!claim.deposit_confirmed) return 'pending_deposit';
    return 'active';
  };

  // Calculate savings stats
  const totalSavings = claims.reduce((sum, claim) => {
    if (claim.deal && claim.redeemed) {
      return sum + (claim.deal.original_price - claim.deal.deal_price);
    }
    return sum;
  }, 0);

  const pendingSavings = claims.reduce((sum, claim) => {
    const status = getStatus(claim);
    if (claim.deal && (status === 'active' || status === 'pending_deposit')) {
      return sum + (claim.deal.original_price - claim.deal.deal_price);
    }
    return sum;
  }, 0);

  const redeemedCount = claims.filter(c => c.redeemed).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-secondary-500 mb-2">My Deals</h1>
      <p className="text-gray-500 mb-6">View your claimed deals and QR codes</p>

      {/* Savings Tracker */}
      {!loading && claims.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 rounded-xl p-2.5">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Total Saved</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalSavings)}</p>
              </div>
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-br from-primary-50 to-orange-50 border-primary-100">
            <div className="flex items-center gap-3">
              <div className="bg-primary-500 rounded-xl p-2.5">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-primary-600 font-medium">Pending Savings</p>
                <p className="text-2xl font-bold text-primary-700">{formatCurrency(pendingSavings)}</p>
              </div>
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 rounded-xl p-2.5">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Deals Redeemed</p>
                <p className="text-2xl font-bold text-blue-700">{redeemedCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'redeemed', 'expired'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : claims.length === 0 ? (
        <div className="card p-12 text-center">
          <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No deals yet</h3>
          <p className="text-gray-400 mt-1">Browse deals and claim your first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map(claim => {
            const status = getStatus(claim);
            const deal = claim.deal;

            return (
              <div key={claim.id} className="card p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* QR Code + 6-Digit Code */}
                  <div className="flex-shrink-0">
                    {status === 'active' && claim.qr_code ? (
                      <button
                        onClick={() => { setSelectedQR(claim.qr_code!); setSelectedCode(claim.redemption_code || null); }}
                        className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                      >
                        <QrCode className="w-16 h-16 text-secondary-500" />
                        {claim.redemption_code && (
                          <p className="text-lg font-bold text-primary-500 tracking-widest mt-1">{claim.redemption_code}</p>
                        )}
                        <p className="text-xs text-primary-500 font-medium mt-0.5">Tap to view</p>
                      </button>
                    ) : status === 'redeemed' ? (
                      <div className="bg-green-50 rounded-lg p-3 flex flex-col items-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <p className="text-xs text-green-600 font-medium mt-1">Redeemed</p>
                      </div>
                    ) : status === 'expired' ? (
                      <div className="bg-red-50 rounded-lg p-3 flex flex-col items-center">
                        <XCircle className="w-16 h-16 text-red-400" />
                        <p className="text-xs text-red-500 font-medium mt-1">Expired</p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 rounded-lg p-3 flex flex-col items-center">
                        <Clock className="w-16 h-16 text-yellow-500" />
                        <p className="text-xs text-yellow-600 font-medium mt-1">Pending</p>
                      </div>
                    )}
                  </div>

                  {/* Deal Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {deal?.deal_type === 'sponti_coupon' ? (
                        <span className="bg-primary-50 text-primary-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <SpontiIcon className="w-3 h-3" /> Sponti
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                          Regular
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        status === 'active' ? 'bg-green-50 text-green-600' :
                        status === 'redeemed' ? 'bg-blue-50 text-blue-600' :
                        status === 'expired' ? 'bg-red-50 text-red-500' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {status === 'pending_deposit' ? 'Awaiting Deposit' : status}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-secondary-500">{deal?.title}</h3>
                    <p className="text-sm text-gray-500">
                      {(deal?.vendor as Deal['vendor'])?.business_name}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-gray-400 line-through text-sm">
                        {deal && formatCurrency(deal.original_price)}
                      </span>
                      <span className="text-primary-500 font-bold text-lg">
                        {deal && formatCurrency(deal.deal_price)}
                      </span>
                      <span className="text-green-600 text-sm font-medium">
                        {deal && formatPercentage(deal.discount_percentage)} off
                      </span>
                    </div>

                    {/* Countdown for active deals */}
                    {status === 'active' && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <Clock className="w-3 h-3" />
                          <span>Expires in:</span>
                        </div>
                        <CountdownTimer expiresAt={claim.expires_at} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code + Redemption Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => { setSelectedQR(null); setSelectedCode(null); setCodeCopied(false); }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-secondary-500 mb-4">Your Redemption Code</h3>

            {/* 6-Digit Code - Primary */}
            {selectedCode && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Tell the vendor this code:</p>
                <div className="bg-gradient-to-br from-primary-50 to-orange-50 border-2 border-primary-200 rounded-xl p-5">
                  <div className="flex items-center justify-center gap-2">
                    {selectedCode.split('').map((digit, i) => (
                      <span key={i} className="w-10 h-12 bg-white border-2 border-primary-300 rounded-lg flex items-center justify-center text-2xl font-bold text-secondary-500 shadow-sm">
                        {digit}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {codeCopied ? (
                      <><Check className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy Code</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or show QR code</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* QR Code Display - Secondary */}
            <div className="bg-white border-4 border-secondary-500 rounded-xl p-4 inline-block mb-4">
              <div className="w-40 h-40 bg-gray-100 flex items-center justify-center rounded-lg">
                <QrCode className="w-28 h-28 text-secondary-500" />
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Show either the code or QR to the vendor to redeem your deal
            </p>

            <button onClick={() => { setSelectedQR(null); setSelectedCode(null); setCodeCopied(false); }} className="btn-primary w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
