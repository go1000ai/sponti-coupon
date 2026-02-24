'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import {
  QrCode, Clock, CheckCircle2, XCircle, DollarSign, ShoppingBag,
  Copy, Check, ExternalLink, Store, CreditCard,
  X, MapPin, Tag, Shield, Phone, Globe, Mail, Send, Trash2, Loader2, AlertTriangle,
  Sparkles, Zap, ArrowRight, ArrowUpDown, Flame, Trophy, Target,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { LoyaltyCards } from '@/components/customer/LoyaltyCards';
import { useCountdown } from '@/lib/hooks/useCountdown';
import type { Claim, Deal, Vendor, BusinessHours } from '@/lib/types/database';

type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'pending_deposit';
type SortOption = 'newest' | 'oldest' | 'expiring_soon' | 'discount' | 'price_low' | 'price_high' | 'category';

const sortLabels: Record<SortOption, string> = {
  newest: 'Date Added (Newest)',
  oldest: 'Date Added (Oldest)',
  expiring_soon: 'Expiring Soon',
  discount: 'Biggest Discount',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
  category: 'Category',
};

export default function DashboardMyDealsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'redeemed'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
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

  const getStatus = (claim: Claim): ClaimStatus => {
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

  // Sort claims
  const sortedClaims = useMemo(() => {
    const sorted = [...claims];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'expiring_soon':
        return sorted.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
      case 'discount':
        return sorted.sort((a, b) => (b.deal?.discount_percentage || 0) - (a.deal?.discount_percentage || 0));
      case 'price_low':
        return sorted.sort((a, b) => (a.deal?.deal_price || 0) - (b.deal?.deal_price || 0));
      case 'price_high':
        return sorted.sort((a, b) => (b.deal?.deal_price || 0) - (a.deal?.deal_price || 0));
      case 'category': {
        return sorted.sort((a, b) => {
          const catA = (a.deal?.vendor as Deal['vendor'])?.category || 'zzz';
          const catB = (b.deal?.vendor as Deal['vendor'])?.category || 'zzz';
          return catA.localeCompare(catB);
        });
      }
      default:
        return sorted;
    }
  }, [claims, sortBy]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  const openDetail = (claim: Claim) => {
    setSelectedClaim(claim);
    setCodeCopied(false);
  };

  const closeDetail = () => {
    setSelectedClaim(null);
    setCodeCopied(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">My Coupons</h1>
      <p className="text-gray-500 mb-6">View your claimed deals, deposits, and redemption codes</p>

      {/* ═══ GAMIFIED SAVINGS HUB ═══ */}
      {!loading && claims.length > 0 && (
        <SavingsHub
          totalSavings={totalSavings}
          pendingSavings={pendingSavings}
          redeemedCount={redeemedCount}
          totalClaims={claims.length}
          activeClaims={claims.filter(c => { const s = getStatus(c); return s === 'active' || s === 'pending_deposit'; }).length}
        />
      )}

      {/* Loyalty Cards */}
      {!loading && <LoyaltyCards />}

      {/* Filters + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Status filters */}
        <div className="flex gap-2 flex-1">
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

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-medium">{sortLabels[sortBy]}</span>
            <span className="sm:hidden text-xs font-medium">Sort</span>
          </button>

          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20">
                {(Object.keys(sortLabels) as SortOption[]).map(option => (
                  <button
                    key={option}
                    onClick={() => { setSortBy(option); setShowSortMenu(false); }}
                    className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                      sortBy === option
                        ? 'bg-primary-50 text-primary-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {sortLabels[option]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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
          <Link href="/deals" className="btn-primary inline-flex items-center gap-2 mt-4">
            Browse Deals <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClaims.map(claim => {
            const deal = claim.deal;
            if (!deal) return null;
            const status = getStatus(claim);
            const isSponti = deal.deal_type === 'sponti_coupon';
            const vendor = deal.vendor as Deal['vendor'];

            const statusStyles = {
              active: { dot: 'bg-green-500', label: 'Active', text: 'text-green-700', bg: 'bg-green-50' },
              redeemed: { dot: 'bg-blue-500', label: 'Redeemed', text: 'text-blue-700', bg: 'bg-blue-50' },
              expired: { dot: 'bg-gray-400', label: 'Expired', text: 'text-gray-500', bg: 'bg-gray-100' },
              pending_deposit: { dot: 'bg-yellow-500', label: 'Pending', text: 'text-yellow-700', bg: 'bg-yellow-50' },
            }[status];

            return (
              <button
                key={claim.id}
                onClick={() => openDetail(claim)}
                className={`card p-4 hover:shadow-lg transition-all duration-200 w-full text-left cursor-pointer group flex flex-col ${
                  status === 'expired' ? 'opacity-60' : ''
                }`}
              >
                {/* Row 1: Status + Deal type */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyles.bg} ${statusStyles.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`} />
                    {statusStyles.label}
                  </span>
                  {isSponti ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
                      <SpontiIcon className="w-3 h-3" /> Sponti
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Tag className="w-2.5 h-2.5" /> Steady
                    </span>
                  )}
                </div>

                {/* Row 2: Title + Business */}
                <h3 className="font-semibold text-sm text-secondary-500 leading-snug line-clamp-2 group-hover:text-primary-500 transition-colors">
                  {deal.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {vendor?.business_name}
                </p>

                {/* Row 3: Pricing — push to bottom */}
                <div className="mt-auto pt-3 flex items-end justify-between">
                  <div>
                    <span className="text-primary-500 font-bold text-lg leading-none">
                      {formatCurrency(deal.deal_price)}
                    </span>
                    <span className="text-gray-300 line-through text-xs ml-1.5">
                      {formatCurrency(deal.original_price)}
                    </span>
                  </div>
                  <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                    {formatPercentage(deal.discount_percentage)} off
                  </span>
                </div>

                {/* Row 4: Footer — countdown or date */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {(status === 'active' || status === 'pending_deposit') ? (
                    <InlineCountdown expiresAt={claim.expires_at} />
                  ) : status === 'redeemed' && claim.redeemed_at ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      Used {formatDate(claim.redeemed_at)}
                    </p>
                  ) : status === 'expired' ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      Expired {formatDate(claim.expires_at)}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          DEAL DETAIL POP-OUT MODAL
          Full listing copy with redemption code
         ═══════════════════════════════════════════════════ */}
      {selectedClaim && (
        <DetailModal
          claim={selectedClaim}
          status={getStatus(selectedClaim)}
          codeCopied={codeCopied}
          onCopy={() => {
            if (selectedClaim.redemption_code) {
              navigator.clipboard.writeText(selectedClaim.redemption_code);
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 2000);
            }
          }}
          onClose={closeDetail}
          onRefresh={() => { closeDetail(); fetchClaims(); }}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
}


/* ──────────────────────────────────────────────────────────
   SavingsHub — Gamified savings dashboard with progress
   ────────────────────────────────────────────────────────── */
function SavingsHub({
  totalSavings,
  pendingSavings,
  redeemedCount,
  totalClaims,
  activeClaims,
}: {
  totalSavings: number;
  pendingSavings: number;
  redeemedCount: number;
  totalClaims: number;
  activeClaims: number;
}) {
  // Milestones
  const milestones = [50, 100, 250, 500, 1000, 2500, 5000];
  const combinedSavings = totalSavings + pendingSavings;
  const currentMilestone = milestones.find(m => m > combinedSavings) || milestones[milestones.length - 1];
  const previousMilestone = milestones[milestones.indexOf(currentMilestone) - 1] || 0;
  const milestoneProgress = currentMilestone > previousMilestone
    ? Math.min(((combinedSavings - previousMilestone) / (currentMilestone - previousMilestone)) * 100, 100)
    : 100;

  // Ring SVG math (for the circular progress)
  const ringSize = 100;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference - (milestoneProgress / 100) * circumference;

  // Achievements
  const achievements = [];
  if (redeemedCount >= 1) achievements.push({ icon: '🎉', label: 'First Save' });
  if (redeemedCount >= 5) achievements.push({ icon: '⭐', label: '5 Deals' });
  if (redeemedCount >= 10) achievements.push({ icon: '🔥', label: '10 Deals' });
  if (totalSavings >= 100) achievements.push({ icon: '💰', label: '$100 Club' });
  if (totalSavings >= 500) achievements.push({ icon: '🏆', label: '$500 Saver' });
  if (totalSavings >= 1000) achievements.push({ icon: '👑', label: '$1K Legend' });

  // Motivational text
  const getMotivation = () => {
    if (activeClaims >= 3) return 'You\'re on a roll! Keep saving!';
    if (redeemedCount === 0) return 'Redeem your first deal to start saving!';
    if (pendingSavings > 0) return `${formatCurrency(pendingSavings)} in savings waiting for you!`;
    return 'Browse deals to keep the savings going!';
  };

  const toNextMilestone = currentMilestone - combinedSavings;

  return (
    <div className="mb-8 space-y-4">
      {/* Main hero card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-secondary-500 via-secondary-400 to-primary-600 p-6 deal-modal-shine">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Savings Ring */}
            <div className="relative flex-shrink-0">
              <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                {/* Background ring */}
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius}
                  fill="none" stroke="rgba(255,255,255,0.15)"
                  strokeWidth={strokeWidth}
                />
                {/* Progress ring */}
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius}
                  fill="none" stroke="#22c55e"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400 mb-0.5" />
                <span className="text-white font-extrabold text-lg leading-none">
                  {combinedSavings >= 1000 ? `${(combinedSavings / 1000).toFixed(1)}k` : Math.round(combinedSavings)}
                </span>
                <span className="text-white/60 text-[9px] font-medium mt-0.5">SAVED</span>
              </div>
            </div>

            {/* Stats + motivation */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-white font-bold text-xl sm:text-2xl">
                {formatCurrency(combinedSavings)} <span className="text-white/60 text-sm font-normal">total savings</span>
              </h2>

              {/* Milestone progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Next goal: {formatCurrency(currentMilestone)}
                  </span>
                  <span className="font-semibold text-white/80">{Math.round(milestoneProgress)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${milestoneProgress}%` }}
                  />
                </div>
                {toNextMilestone > 0 && (
                  <p className="text-[11px] text-white/50 mt-1.5">
                    <span className="text-green-300 font-semibold">{formatCurrency(toNextMilestone)}</span> more to reach {formatCurrency(currentMilestone)}
                  </p>
                )}
              </div>

              {/* Motivation message */}
              <p className="text-white/70 text-sm mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {getMotivation()}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-green-500 mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-secondary-500">{redeemedCount}</p>
            <p className="text-[11px] text-gray-400 font-medium">Redeemed</p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary-500 mb-1">
              <Flame className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-secondary-500">{activeClaims}</p>
            <p className="text-[11px] text-gray-400 font-medium">Active Now</p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-purple-500 mb-1">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-secondary-500">{totalClaims}</p>
            <p className="text-[11px] text-gray-400 font-medium">Total Deals</p>
          </div>
        </div>
      </div>

      {/* Achievements row */}
      {achievements.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
          {achievements.map((badge, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/60 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            >
              <span>{badge.icon}</span> {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


/* ──────────────────────────────────────────────────────────
   DetailModal — Premium deal detail pop-out
   ────────────────────────────────────────────────────────── */
function DetailModal({
  claim,
  status,
  codeCopied,
  onCopy,
  onClose,
  onRefresh,
  formatCurrency: fmtCurrency,
  formatPercentage: fmtPercent,
  formatDate: fmtDate,
  formatDateTime: fmtDateTime,
}: {
  claim: Claim;
  status: ClaimStatus;
  codeCopied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onRefresh: () => void;
  formatCurrency: (n: number) => string;
  formatPercentage: (n: number) => string;
  formatDate: (s: string) => string;
  formatDateTime: (s: string) => string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'redeem' | 'vendor'>('details');

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  const deal = claim.deal;

  useEffect(() => {
    if (claim.qr_code && status === 'active') {
      setQrLoading(true);
      fetch(`/api/claims/qr-code?claim_id=${claim.id}`)
        .then(res => res.json())
        .then(data => { if (data.qr_data_url) setQrDataUrl(data.qr_data_url); })
        .catch(() => {})
        .finally(() => setQrLoading(false));
    }
  }, [claim.id, claim.qr_code, status]);

  // Auto-open redeem tab if active
  useEffect(() => {
    if (status === 'active' && claim.redemption_code) setActiveTab('redeem');
  }, [status, claim.redemption_code]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch('/api/claims/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claim.id }),
      });
      const data = await res.json();
      if (res.ok) { onRefresh(); } else { setCancelError(data.error || 'Failed to cancel'); }
    } catch { setCancelError('Network error. Please try again.'); }
    setCancelling(false);
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim()) return;
    setTransferring(true);
    setTransferError('');
    setTransferSuccess('');
    try {
      const res = await fetch('/api/claims/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claim.id, recipient_email: transferEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setTransferSuccess(data.message); setTimeout(() => onRefresh(), 2000); }
      else { setTransferError(data.error || 'Failed to transfer'); }
    } catch { setTransferError('Network error. Please try again.'); }
    setTransferring(false);
  };

  if (!deal) return null;

  const vendor = deal.vendor as Deal['vendor'];
  const isSponti = deal.deal_type === 'sponti_coupon';
  const depositAmount = deal.deposit_amount || 0;
  const remainingBalance = isSponti ? deal.deal_price - depositAmount : 0;
  const hasImage = deal.image_url || (deal.image_urls && deal.image_urls.length > 0);
  const displayImage = deal.image_url || (deal.image_urls && deal.image_urls[0]) || null;
  const canModify = status === 'active' || status === 'pending_deposit';
  const savings = deal.original_price - deal.deal_price;

  const tabs = [
    { key: 'details' as const, label: 'Details', icon: <Tag className="w-3.5 h-3.5" /> },
    ...(status === 'active' && claim.redemption_code
      ? [{ key: 'redeem' as const, label: 'Redeem', icon: <QrCode className="w-3.5 h-3.5" /> }]
      : []),
    ...(vendor ? [{ key: 'vendor' as const, label: 'Business', icon: <Store className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto modal-backdrop bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-content bg-white rounded-2xl w-full max-w-lg mx-4 my-6 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ═══ HERO HEADER ═══ */}
        <div className="relative deal-modal-shine">
          {hasImage && displayImage ? (
            <div className="h-52 sm:h-60 relative">
              <Image src={displayImage} alt={deal.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
          ) : (
            <div className={`h-44 relative ${isSponti
              ? 'bg-gradient-to-br from-primary-600 via-primary-500 to-amber-400'
              : 'bg-gradient-to-br from-secondary-500 via-secondary-400 to-blue-500'
            }`}>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)',
                backgroundSize: '60px 60px, 80px 80px, 40px 40px',
              }} />
              {isSponti ? (
                <SpontiIcon className="absolute bottom-4 right-4 w-20 h-20 opacity-20" />
              ) : (
                <Tag className="absolute bottom-4 right-4 w-20 h-20 text-white/10" />
              )}
            </div>
          )}

          {/* Close */}
          <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-sm">
            <X className="w-5 h-5" />
          </button>

          {/* Status badge */}
          <div className="absolute top-3 left-3 float-badge">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm ${
              status === 'active' ? 'bg-green-500/90 text-white' :
              status === 'redeemed' ? 'bg-blue-500/90 text-white' :
              status === 'expired' ? 'bg-gray-500/90 text-white' :
              'bg-yellow-500/90 text-white'
            }`}>
              {status === 'pending_deposit' ? 'Awaiting Deposit' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>

          {/* Floating savings badge — bottom right overlay */}
          <div className="absolute -bottom-5 right-5">
            <div className="bg-green-500 text-white font-bold text-sm px-4 py-2 rounded-full shadow-lg shadow-green-500/30 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Save {fmtCurrency(savings)}
            </div>
          </div>
        </div>

        {/* ═══ TITLE SECTION ═══ */}
        <div className="px-6 pt-8 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            {isSponti ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                <SpontiIcon className="w-3 h-3" /> Sponti Coupon
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary-400 bg-gray-100 px-2 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" /> Steady Deal
              </span>
            )}
            <span className="text-green-600 text-[11px] font-bold bg-green-50 px-2 py-0.5 rounded-full">
              {fmtPercent(deal.discount_percentage)} off
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-secondary-500 leading-tight">{deal.title}</h2>
          {vendor && (
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" />
              {vendor.business_name}
            </p>
          )}
        </div>

        {/* ═══ PRICING STRIP ═══ */}
        <div className="mx-6 mt-3 mb-1 flex items-center gap-4 bg-gradient-to-r from-gray-50 to-transparent rounded-xl px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary-500">{fmtCurrency(deal.deal_price)}</span>
            <span className="text-gray-400 line-through text-sm">{fmtCurrency(deal.original_price)}</span>
          </div>
          {isSponti && depositAmount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
              <CreditCard className="w-3.5 h-3.5 text-primary-500" />
              <span>Deposit: <b className="text-primary-600">{fmtCurrency(depositAmount)}</b></span>
              {claim.deposit_confirmed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Clock className="w-3.5 h-3.5 text-yellow-500" />}
            </div>
          )}
        </div>

        {/* ═══ TAB NAVIGATION ═══ */}
        <div className="px-6 mt-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-white text-secondary-500 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div className="px-6 py-5">
          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Description */}
              {deal.description && (
                <p className="text-gray-600 text-sm leading-relaxed">{deal.description}</p>
              )}

              {/* Time Remaining */}
              {(status === 'active' || status === 'pending_deposit') && (
                <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-xl p-4 text-white deal-modal-shine">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-semibold">Time remaining</span>
                  </div>
                  <CountdownTimer expiresAt={claim.expires_at} size="sm" />
                  <p className="text-xs text-secondary-300 mt-2">Expires {fmtDateTime(claim.expires_at)}</p>
                </div>
              )}

              {status === 'expired' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">This coupon has expired</p>
                  <p className="text-xs text-gray-400 mt-1">Expired on {fmtDateTime(claim.expires_at)}</p>
                </div>
              )}

              {status === 'redeemed' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm font-bold text-green-700">Successfully Redeemed!</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    You saved {fmtCurrency(savings)} on this deal
                  </p>
                  {claim.redeemed_at && (
                    <p className="text-xs text-gray-400 mt-2">Used on {fmtDateTime(claim.redeemed_at)}</p>
                  )}
                </div>
              )}

              {/* Deposit breakdown (Sponti) */}
              {isSponti && depositAmount > 0 && (
                <div className="bg-primary-50/60 border border-primary-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-secondary-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-primary-500" />
                    Payment Breakdown
                  </h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Deposit paid</span>
                      <span className="font-semibold text-green-600 flex items-center gap-1">
                        {fmtCurrency(depositAmount)}
                        {claim.deposit_confirmed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Clock className="w-3.5 h-3.5 text-yellow-500" />}
                      </span>
                    </div>
                    {claim.deposit_confirmed && remainingBalance > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Balance due at vendor</span>
                        <span className="font-semibold text-secondary-500">{fmtCurrency(remainingBalance)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-primary-200/60 pt-2">
                      <span className="font-bold text-secondary-500">Total</span>
                      <span className="font-bold text-secondary-500">{fmtCurrency(deal.deal_price)}</span>
                    </div>
                  </div>
                  {!claim.deposit_confirmed && (
                    <p className="text-xs text-yellow-700 mt-3 bg-yellow-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                      Deposit not yet confirmed. Your code will appear once confirmed.
                    </p>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Timeline</h4>
                <div className="relative pl-4 border-l-2 border-gray-100 space-y-3">
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                    <p className="text-xs text-gray-500">Claimed on <span className="font-medium text-gray-700">{fmtDate(claim.created_at)}</span></p>
                  </div>
                  {claim.deposit_confirmed_at && (
                    <div className="relative">
                      <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                      <p className="text-xs text-gray-500">Deposit confirmed <span className="font-medium text-gray-700">{fmtDate(claim.deposit_confirmed_at)}</span></p>
                    </div>
                  )}
                  {claim.redeemed_at && (
                    <div className="relative">
                      <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                      <p className="text-xs text-gray-500">Redeemed <span className="font-medium text-gray-700">{fmtDateTime(claim.redeemed_at)}</span></p>
                    </div>
                  )}
                  <div className="relative">
                    <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ${status === 'expired' ? 'bg-red-400' : 'bg-gray-300'}`} />
                    <p className="text-xs text-gray-500">
                      {status === 'expired' ? 'Expired' : 'Expires'} <span className="font-medium text-gray-700">{fmtDateTime(claim.expires_at)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REDEEM TAB ── */}
          {activeTab === 'redeem' && status === 'active' && claim.redemption_code && (
            <div className="space-y-5">
              {/* 6-Digit Code */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-500 mb-3">
                  <Zap className="w-3.5 h-3.5" />
                  Tell the vendor this code
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {claim.redemption_code.split('').map((digit, i) => (
                    <span
                      key={i}
                      className="code-digit w-11 h-14 bg-gradient-to-b from-white to-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-center text-2xl font-extrabold text-secondary-500 shadow-sm"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onCopy}
                  className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    codeCopied
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {codeCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">or scan</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>

              {/* QR Code */}
              <div className="text-center">
                <div className="qr-reveal inline-block bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm">
                  {qrLoading ? (
                    <div className="w-40 h-40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                  ) : qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                  ) : (
                    <div className="w-40 h-40 bg-gray-50 flex items-center justify-center rounded-xl">
                      <QrCode className="w-20 h-20 text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">Show this QR code to the vendor to redeem your deal</p>
              </div>
            </div>
          )}

          {/* ── VENDOR TAB ── */}
          {activeTab === 'vendor' && vendor && (
            <VendorInfoCard vendor={vendor} />
          )}
        </div>

        {/* ═══ FOOTER ACTIONS ═══ */}
        <div className="px-6 pb-6 space-y-3">
          {/* Transfer & Cancel */}
          {canModify && (
            <>
              {!showTransfer && !showCancelConfirm && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-600 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Transfer
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showTransfer && (
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-secondary-500 mb-1.5 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-500" />
                    Transfer Coupon
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">Recipient must have a SpontiCoupon account.</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={transferEmail}
                      onChange={e => setTransferEmail(e.target.value)}
                      placeholder="recipient@email.com"
                      className="input-field flex-1 text-sm !py-2.5 !rounded-xl"
                      disabled={transferring}
                    />
                    <button
                      onClick={handleTransfer}
                      disabled={transferring || !transferEmail.trim()}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 rounded-xl font-medium disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                    >
                      {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                  {transferError && <p className="text-xs text-red-600 mt-2">{transferError}</p>}
                  {transferSuccess && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {transferSuccess}</p>}
                  {!transferSuccess && (
                    <button onClick={() => { setShowTransfer(false); setTransferEmail(''); setTransferError(''); }} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {showCancelConfirm && (
                <div className="bg-red-50/80 border border-red-100 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-700">Cancel this coupon?</h4>
                      <p className="text-xs text-red-500 mt-1">
                        This action is permanent.{isSponti && depositAmount > 0 && ' Your deposit is non-refundable.'}
                      </p>
                    </div>
                  </div>
                  {cancelError && <p className="text-xs text-red-600 mb-2">{cancelError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setShowCancelConfirm(false); setCancelError(''); }} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Keep
                    </button>
                    <button onClick={handleCancel} disabled={cancelling} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {cancelling ? 'Cancelling...' : 'Cancel Coupon'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Close */}
          <button onClick={onClose} className="w-full py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl font-semibold text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────────────────────
   VendorInfoCard — Business details inside the pop-out
   ────────────────────────────────────────────────────────── */
function VendorInfoCard({ vendor }: { vendor: Vendor }) {
  const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zip]
    .filter(Boolean)
    .join(', ');

  const mapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  const businessHours = vendor.business_hours as BusinessHours | null;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayLabels: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  const todayKey = dayNames[new Date().getDay()];
  const formatTime12 = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  const hasHours = businessHours && Object.values(businessHours).some(v => v !== undefined && v !== null);

  return (
    <div className="space-y-4">
      {/* Business header */}
      <div className="flex items-center gap-3 bg-secondary-500 rounded-xl px-4 py-3">
        {vendor.logo_url ? (
          <Image src={vendor.logo_url} alt={vendor.business_name} width={40} height={40} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
        )}
        <div>
          <h4 className="text-white font-bold text-sm">{vendor.business_name}</h4>
          <div className="flex items-center gap-1 text-secondary-300 text-xs">
            <Shield className="w-3 h-3 text-green-400" />
            Verified Business
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-3 text-sm">
        {fullAddress && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
            <div className="pt-1">
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-primary-500 transition-colors text-sm leading-snug">
                  {vendor.address && <span className="block">{vendor.address}</span>}
                  <span>{vendor.city}, {vendor.state} {vendor.zip}</span>
                </a>
              ) : (
                <span className="text-gray-700 text-sm">{fullAddress}</span>
              )}
            </div>
          </div>
        )}

        {vendor.phone && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-gray-400" />
            </div>
            <a href={`tel:${vendor.phone}`} className="text-gray-700 hover:text-primary-500 transition-colors text-sm">{vendor.phone}</a>
          </div>
        )}

        {vendor.email && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <a href={`mailto:${vendor.email}`} className="text-gray-700 hover:text-primary-500 transition-colors text-sm truncate">{vendor.email}</a>
          </div>
        )}

        {vendor.website && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-gray-400" />
            </div>
            <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600 transition-colors text-sm truncate">
              {vendor.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Hours */}
      {hasHours && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Business Hours
          </h4>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => {
              const hours = businessHours?.[day];
              const isToday = day === todayKey;
              return (
                <div key={day} className={`contents ${isToday ? 'font-bold' : ''}`}>
                  <span className={isToday ? 'text-primary-500' : 'text-gray-500'}>
                    {dayLabels[day]}{isToday ? ' ●' : ''}
                  </span>
                  <span className={hours?.closed ? 'text-red-400' : isToday ? 'text-secondary-500' : 'text-gray-600'}>
                    {!hours || hours.closed ? 'Closed' : `${formatTime12(hours.open)} – ${formatTime12(hours.close)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/* ──────────────────────────────────────────────────────────
   InlineCountdown — Compact text-based countdown for cards
   ────────────────────────────────────────────────────────── */
function InlineCountdown({ expiresAt }: { expiresAt: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(expiresAt);

  if (expired) {
    return (
      <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Expired
      </p>
    );
  }

  const isUrgent = days === 0 && hours < 2;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${String(minutes).padStart(2, '0')}m`);
  parts.push(`${String(seconds).padStart(2, '0')}s`);

  return (
    <p className={`text-xs font-semibold tabular-nums flex items-center gap-1.5 ${
      isUrgent ? 'text-red-500' : 'text-secondary-500'
    }`}>
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-500' : 'text-primary-500'}`} />
      <span>{parts.join(' ')}</span>
    </p>
  );
}
