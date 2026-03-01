'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Gift, Stamp, Star, Check, Lock, Loader2, Award, ChevronDown, ChevronUp,
  TrendingUp, Clock, ArrowRight, Sparkles, Trophy, History, Store, Coins,
} from 'lucide-react';
import { SpontiPointsWallet } from '@/components/customer/SpontiPointsWallet';
import type { LoyaltyProgram, LoyaltyReward } from '@/lib/types/database';

/* ──────────────────────────────────────────
   Types
   ────────────────────────────────────────── */
interface LoyaltyCardData {
  id: string;
  program_id: string;
  customer_id: string;
  vendor_id: string;
  current_punches: number;
  total_punches_earned: number;
  current_points: number;
  total_points_earned: number;
  total_points_redeemed: number;
  created_at: string;
  updated_at: string;
  program: LoyaltyProgram | null;
  vendor: { business_name: string; logo_url: string | null; category: string } | null;
  available_rewards: LoyaltyReward[];
}

interface Transaction {
  id: string;
  transaction_type: string;
  points_amount: number;
  punches_amount: number;
  description: string | null;
  deal_title: string | null;
  created_at: string;
  vendor?: { business_name: string; logo_url: string | null } | null;
}

/* ──────────────────────────────────────────
   Main Page
   ────────────────────────────────────────── */
type LoyaltyTab = 'spontipoints' | 'business';

export default function CustomerLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<LoyaltyTab>('spontipoints');
  const [cards, setCards] = useState<LoyaltyCardData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCardData | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/loyalty');
      const data = await res.json();
      setCards(data.cards || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetch('/api/customer/loyalty/history?limit=50');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch { /* ignore */ }
    setTxLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
    fetchTransactions();
  }, [fetchCards, fetchTransactions]);

  const handleRedeem = async (cardId: string, rewardId?: string) => {
    setRedeeming(cardId + (rewardId || ''));
    setMessage(null);
    try {
      const res = await fetch('/api/customer/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, reward_id: rewardId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Reward redeemed: ${data.reward_name}!` });
        fetchCards();
        fetchTransactions();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to redeem.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    }
    setRedeeming(null);
    setTimeout(() => setMessage(null), 4000);
  };

  // Stats
  const totalPrograms = cards.length;
  const totalStampsEarned = cards.reduce((s, c) => s + (c.total_punches_earned || 0), 0);
  const totalPointsEarned = cards.reduce((s, c) => s + (c.total_points_earned || 0), 0);
  const rewardsRedeemed = transactions.filter(t =>
    t.transaction_type === 'redeem_punch_reward' || t.transaction_type === 'redeem_points_reward'
  ).length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-blue-600 p-6 sm:p-8 mb-8 shadow-xl">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Gift className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Loyalty Rewards</h1>
              <p className="text-white/60 text-sm mt-0.5">Track your progress and redeem rewards</p>
            </div>
          </div>

          {/* Stats row */}
          {totalPrograms > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard icon={<Store className="w-4 h-4" />} value={totalPrograms} label="Programs" color="blue" />
              <StatCard icon={<Stamp className="w-4 h-4" />} value={totalStampsEarned} label="Stamps Earned" color="orange" />
              <StatCard icon={<Star className="w-4 h-4" />} value={totalPointsEarned.toLocaleString()} label="Points Earned" color="blue" />
              <StatCard icon={<Trophy className="w-4 h-4" />} value={rewardsRedeemed} label="Rewards Claimed" color="green" />
            </div>
          )}
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8">
        <button
          onClick={() => setActiveTab('spontipoints')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'spontipoints'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          SpontiPoints
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'business'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Business Rewards
        </button>
      </div>

      {/* ═══ SPONTIPOINTS TAB ═══ */}
      {activeTab === 'spontipoints' && (
        <SpontiPointsWithFallback />
      )}

      {/* ═══ BUSINESS REWARDS TAB ═══ */}
      {activeTab === 'business' && (
        <>
      {/* Success/Error message */}
      {message && (
        <div className={`mb-6 px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : null}
          {message.text}
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {cards.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">No Loyalty Programs Yet</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            When you redeem deals from participating vendors, you&apos;ll automatically be enrolled in their loyalty programs. Start shopping to earn stamps and points!
          </p>
          <a
            href="/deals"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-200/50 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Browse Deals
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <>
          {/* ═══ LOYALTY CARDS GRID ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {cards.map((card, i) => (
              <div
                key={card.id}
                className="animate-card-pop"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {card.program?.program_type === 'punch_card' ? (
                  <PunchCardFull
                    card={card}
                    onRedeem={handleRedeem}
                    redeeming={redeeming}
                    onSelect={() => setSelectedCard(card)}
                  />
                ) : (
                  <PointsCardFull
                    card={card}
                    onRedeem={handleRedeem}
                    redeeming={redeeming}
                    onSelect={() => setSelectedCard(card)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ═══ ACTIVITY HISTORY ═══ */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-gray-900">Activity History</h2>
              </div>
              {transactions.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  {showAllHistory ? 'Show Less' : `Show All (${transactions.length})`}
                  {showAllHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {txLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No activity yet. Redeem deals to start earning rewards!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(showAllHistory ? transactions : transactions.slice(0, 5)).map(tx => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
        </>
      )}

      {/* ═══ CARD DETAIL MODAL ═══ */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onRedeem={handleRedeem}
          redeeming={redeeming}
        />
      )}
    </div>
  );
}


/* ──────────────────────────────────────────
   SpontiPoints with Empty State Fallback
   ────────────────────────────────────────── */
function SpontiPointsWithFallback() {
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/customer/spontipoints')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setHasData(data && (data.balance > 0 || data.transactions?.length > 0));
      })
      .catch(() => setHasData(false));
  }, []);

  if (hasData === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (hasData) {
    return <SpontiPointsWallet />;
  }

  return (
    <div className="card p-12 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mx-auto mb-4">
        <Coins className="w-10 h-10 text-orange-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">No SpontiPoints Yet</h2>
      <p className="text-gray-400 max-w-md mx-auto">
        You earn 25 SpontiPoints every time you redeem a deal at any business. Once you reach 500 points, you can convert them into credit. Start redeeming deals to earn!
      </p>
      <a
        href="/deals"
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-200/50 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Browse Deals
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}


/* ──────────────────────────────────────────
   Stat Card (hero section)
   ────────────────────────────────────────── */
function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'blue' | 'orange' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-400/20 text-blue-200',
    orange: 'bg-orange-400/20 text-orange-200',
    green: 'bg-green-400/20 text-green-200',
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5">
      <div className={`w-7 h-7 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-white/50 font-medium">{label}</p>
    </div>
  );
}


/* ──────────────────────────────────────────
   Punch Card — Full Detail
   ────────────────────────────────────────── */
function PunchCardFull({
  card,
  onRedeem,
  redeeming,
  onSelect,
}: {
  card: LoyaltyCardData;
  onRedeem: (cardId: string) => void;
  redeeming: string | null;
  onSelect: () => void;
}) {
  const program = card.program;
  if (!program) return null;

  const required = program.punches_required || 10;
  const current = card.current_punches;
  const canClaim = current >= required;
  const progressPct = Math.min((current / required) * 100, 100);
  const stamps = Array.from({ length: required }, (_, i) => i < current);

  return (
    <div className="card overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group" onClick={onSelect}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-primary-500 to-amber-500 px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Stamp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{program.name}</p>
              <p className="text-[11px] text-white/70 truncate">{card.vendor?.business_name}</p>
            </div>
          </div>
          {canClaim && (
            <span className="bg-green-400 text-green-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">
              REWARD READY
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span className="font-medium">{current} / {required} stamps</span>
            <span className="font-semibold text-primary-500">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-primary-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Stamp Grid */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {stamps.map((filled, i) => {
            const isReward = i === required - 1;
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  filled
                    ? 'bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-200'
                    : isReward
                      ? 'border-dashed border-amber-300 text-amber-300'
                      : 'border-gray-200 text-gray-200'
                }`}
              >
                {filled ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isReward ? (
                  <Gift className="w-3.5 h-3.5" />
                ) : (
                  <Stamp className="w-3 h-3" />
                )}
              </div>
            );
          })}
        </div>

        {/* Reward info */}
        <div className="bg-orange-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Reward</p>
          <p className="text-sm font-bold text-primary-600">{program.punch_reward}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{card.total_punches_earned}</p>
            <p className="text-[10px] text-gray-400">Lifetime Stamps</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{required - current > 0 ? required - current : 0}</p>
            <p className="text-[10px] text-gray-400">Until Reward</p>
          </div>
        </div>

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={(e) => { e.stopPropagation(); onRedeem(card.id); }}
            disabled={redeeming === card.id}
            className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-green-200/50 inline-flex items-center justify-center gap-2"
          >
            {redeeming === card.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Claim Reward
          </button>
        )}
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────
   Points Card — Full Detail
   ────────────────────────────────────────── */
function PointsCardFull({
  card,
  onRedeem,
  redeeming,
  onSelect,
}: {
  card: LoyaltyCardData;
  onRedeem: (cardId: string, rewardId: string) => void;
  redeeming: string | null;
  onSelect: () => void;
}) {
  const program = card.program;
  if (!program) return null;

  const rewards = card.available_rewards || [];
  const nextReward = rewards.find(r => r.points_cost > card.current_points);
  const progressToNext = nextReward
    ? Math.min((card.current_points / nextReward.points_cost) * 100, 100)
    : 100;

  return (
    <div className="card overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group" onClick={onSelect}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600 px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{program.name}</p>
              <p className="text-[11px] text-white/70 truncate">{card.vendor?.business_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Points Balance */}
        <div className="text-center mb-4">
          <div className="inline-flex items-baseline gap-1">
            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-600">
              {card.current_points.toLocaleString()}
            </p>
            <span className="text-xs text-gray-400 font-bold uppercase">pts</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {card.total_points_earned.toLocaleString()} earned total
          </p>
        </div>

        {/* Progress bar to next reward */}
        {nextReward && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span className="truncate flex-1">Next: <span className="font-medium text-gray-600">{nextReward.name}</span></span>
              <span className="font-semibold text-blue-500 ml-2">{nextReward.points_cost} pts</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {nextReward.points_cost - card.current_points > 0
                ? `${(nextReward.points_cost - card.current_points).toLocaleString()} more points needed`
                : 'Ready to redeem!'
              }
            </p>
          </div>
        )}

        {/* Available Rewards */}
        {rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.slice(0, 3).map(reward => {
              const canAfford = card.current_points >= reward.points_cost;
              const isRedeeming = redeeming === card.id + reward.id;
              return (
                <div key={reward.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                  canAfford
                    ? 'bg-green-50 border border-green-200 hover:border-green-300'
                    : 'bg-gray-50 border border-gray-100'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    canAfford ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {canAfford ? <Star className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${canAfford ? 'text-gray-700' : 'text-gray-400'}`}>
                      {reward.name}
                    </p>
                    <p className="text-[10px] text-gray-400">{reward.points_cost.toLocaleString()} pts</p>
                  </div>
                  {canAfford && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRedeem(card.id, reward.id); }}
                      disabled={!!isRedeeming}
                      className="text-[10px] font-bold text-green-600 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
                    >
                      {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
                    </button>
                  )}
                </div>
              );
            })}
            {rewards.length > 3 && (
              <p className="text-[11px] text-blue-500 font-medium text-center pt-1">
                +{rewards.length - 3} more rewards available
              </p>
            )}
          </div>
        )}

        {/* Lifetime stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{card.total_points_earned.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">Lifetime Earned</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{card.total_points_redeemed.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">Redeemed</p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────
   Transaction Row
   ────────────────────────────────────────── */
function TransactionRow({ tx }: { tx: Transaction }) {
  const isEarn = tx.transaction_type === 'earn_punch' || tx.transaction_type === 'earn_points';
  const isPunch = tx.transaction_type === 'earn_punch' || tx.transaction_type === 'redeem_punch_reward';

  const iconBg = isEarn ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600';
  const Icon = isEarn
    ? (isPunch ? Stamp : TrendingUp)
    : Award;

  const amountText = isPunch
    ? `${isEarn ? '+' : ''}${tx.punches_amount} stamp${Math.abs(tx.punches_amount) !== 1 ? 's' : ''}`
    : `${isEarn ? '+' : ''}${tx.points_amount.toLocaleString()} pts`;

  const amountColor = isEarn ? 'text-green-600' : 'text-blue-600';

  const timeAgo = getTimeAgo(tx.created_at);

  return (
    <div className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">
          {tx.description || (isEarn ? 'Earned reward' : 'Redeemed reward')}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {tx.vendor?.business_name && (
            <>
              <span className="truncate">{tx.vendor.business_name}</span>
              <span className="text-gray-200">|</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </div>
      <span className={`text-sm font-bold ${amountColor} flex-shrink-0`}>
        {amountText}
      </span>
    </div>
  );
}


/* ──────────────────────────────────────────
   Card Detail Modal
   ────────────────────────────────────────── */
function CardDetailModal({
  card,
  onClose,
  onRedeem,
  redeeming,
}: {
  card: LoyaltyCardData;
  onClose: () => void;
  onRedeem: (cardId: string, rewardId?: string) => void;
  redeeming: string | null;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/customer/loyalty/history?program_id=${card.program_id}&limit=20`);
        const data = await res.json();
        setTransactions(data.transactions || []);
      } catch { /* ignore */ }
      setTxLoading(false);
    })();
  }, [card.program_id]);

  const program = card.program;
  if (!program) return null;

  const isPunch = program.program_type === 'punch_card';
  const required = program.punches_required || 10;
  const canClaim = isPunch && card.current_punches >= required;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 my-8 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 relative overflow-hidden ${
          isPunch
            ? 'bg-gradient-to-r from-orange-500 via-primary-500 to-amber-500'
            : 'bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600'
        }`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-sm">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                {isPunch ? <Stamp className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-amber-300" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{program.name}</h2>
                <p className="text-sm text-white/70">{card.vendor?.business_name}</p>
              </div>
            </div>

            {program.description && (
              <p className="text-sm text-white/60 mt-3">{program.description}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Progress */}
          {isPunch ? (
            <>
              <div className="text-center">
                <p className="text-4xl font-extrabold text-gray-900">
                  {card.current_punches} / {required}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {canClaim ? 'Reward ready to claim!' : `${required - card.current_punches} stamps to go`}
                </p>
              </div>

              {/* Stamp Grid */}
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: required }, (_, i) => i < card.current_punches).map((filled, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      filled
                        ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-200'
                        : i === required - 1
                          ? 'border-dashed border-amber-300 text-amber-300'
                          : 'border-gray-200 text-gray-200'
                    }`}
                  >
                    {filled ? <Check className="w-4 h-4" /> : i === required - 1 ? <Gift className="w-4 h-4" /> : <Stamp className="w-3.5 h-3.5" />}
                  </div>
                ))}
              </div>

              {/* Reward */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Reward</p>
                <p className="text-lg font-bold text-primary-600">{program.punch_reward}</p>
              </div>

              {canClaim && (
                <button
                  onClick={() => onRedeem(card.id)}
                  disabled={redeeming === card.id}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-200/50 inline-flex items-center justify-center gap-2"
                >
                  {redeeming === card.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                  Claim Reward
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-600">
                  {card.current_points.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400 mt-1">current points</p>
              </div>

              {/* Rewards list */}
              {card.available_rewards.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Rewards</h3>
                  {card.available_rewards.map(reward => {
                    const canAfford = card.current_points >= reward.points_cost;
                    const isRedeeming = redeeming === card.id + reward.id;
                    const progress = Math.min((card.current_points / reward.points_cost) * 100, 100);
                    return (
                      <div key={reward.id} className={`rounded-xl p-3.5 border transition-all ${
                        canAfford ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            canAfford ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {canAfford ? <Star className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${canAfford ? 'text-gray-700' : 'text-gray-400'}`}>
                              {reward.name}
                            </p>
                            <p className="text-[11px] text-gray-400">{reward.points_cost.toLocaleString()} pts</p>
                          </div>
                          {canAfford && (
                            <button
                              onClick={() => onRedeem(card.id, reward.id)}
                              disabled={!!isRedeeming}
                              className="text-xs font-bold text-white bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl transition-colors"
                            >
                              {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
                            </button>
                          )}
                        </div>
                        {!canAfford && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-400 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {(reward.points_cost - card.current_points).toLocaleString()} more points needed
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Lifetime Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">
                {isPunch ? card.total_punches_earned : card.total_points_earned.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400">Total Earned</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">
                {isPunch ? card.current_punches : card.current_points.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400">Current</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">
                {isPunch
                  ? card.total_punches_earned > 0 ? Math.floor(card.total_punches_earned / (program.punches_required || 10)) : 0
                  : card.total_points_redeemed.toLocaleString()
                }
              </p>
              <p className="text-[10px] text-gray-400">{isPunch ? 'Rewards Won' : 'Redeemed'}</p>
            </div>
          </div>

          {/* Transaction History for this card */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Activity
            </h3>
            {txLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {transactions.map(tx => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────
   Utility
   ────────────────────────────────────────── */
function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
