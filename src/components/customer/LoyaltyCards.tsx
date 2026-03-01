'use client';

import { useEffect, useState } from 'react';
import { Gift, Stamp, Star, Check, Lock, Loader2, Award } from 'lucide-react';
import type { LoyaltyProgram, LoyaltyReward, Vendor } from '@/lib/types/database';

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
  program: LoyaltyProgram | null;
  vendor: Pick<Vendor, 'business_name' | 'logo_url' | 'category'> | null;
  available_rewards: LoyaltyReward[];
}

export function LoyaltyCards() {
  const [cards, setCards] = useState<LoyaltyCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  async function fetchCards() {
    try {
      const res = await fetch('/api/customer/loyalty');
      const data = await res.json();
      setCards(data.cards || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

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
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to redeem.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    }
    setRedeeming(null);
    setTimeout(() => setMessage(null), 4000);
  };

  if (loading) return null;
  if (cards.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-bold text-gray-900">My Loyalty Rewards</h2>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {cards.map(card => (
          <div key={card.id} className="min-w-[300px] max-w-[340px] snap-start flex-shrink-0">
            {card.program?.program_type === 'punch_card' ? (
              <PunchCardView card={card} onRedeem={handleRedeem} redeeming={redeeming} />
            ) : (
              <PointsCardView card={card} onRedeem={handleRedeem} redeeming={redeeming} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Punch Card Visual
   ────────────────────────────────────────── */
function PunchCardView({
  card,
  onRedeem,
  redeeming,
}: {
  card: LoyaltyCardData;
  onRedeem: (cardId: string) => void;
  redeeming: string | null;
}) {
  const program = card.program;
  if (!program) return null;

  const required = program.punches_required || 10;
  const current = card.current_punches;
  const canClaim = current >= required;

  // Create stamp grid
  const stamps = Array.from({ length: required }, (_, i) => i < current);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-orange-500 px-4 py-3">
        <div className="flex items-center gap-2">
          <Stamp className="w-5 h-5 text-white/80" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{program.name}</p>
            <p className="text-[11px] text-white/70 truncate">{card.vendor?.business_name}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stamp Grid */}
        <div className="flex flex-wrap gap-2 justify-center mb-3">
          {stamps.map((filled, i) => {
            const isReward = i === required - 1;
            return (
              <div
                key={i}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  filled
                    ? 'bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-200'
                    : isReward
                      ? 'border-dashed border-primary-300 text-primary-300'
                      : 'border-gray-200 text-gray-200'
                }`}
              >
                {filled ? (
                  <Check className="w-4 h-4" />
                ) : isReward ? (
                  <Gift className="w-4 h-4" />
                ) : (
                  <Stamp className="w-3.5 h-3.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress text */}
        <p className="text-center text-sm font-medium text-gray-900">
          {canClaim ? (
            <span className="text-green-600">Reward ready!</span>
          ) : (
            <>{current}/{required} stamps <span className="text-gray-400">— {required - current} more to go</span></>
          )}
        </p>

        {/* Reward info */}
        <div className="mt-3 bg-orange-50 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Reward:</p>
          <p className="text-sm font-bold text-primary-600">{program.punch_reward}</p>
        </div>

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={() => onRedeem(card.id)}
            disabled={redeeming === card.id}
            className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
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
   Points Card Visual
   ────────────────────────────────────────── */
function PointsCardView({
  card,
  onRedeem,
  redeeming,
}: {
  card: LoyaltyCardData;
  onRedeem: (cardId: string, rewardId: string) => void;
  redeeming: string | null;
}) {
  const program = card.program;
  if (!program) return null;

  const rewards = card.available_rewards || [];
  const nextReward = rewards.find(r => r.points_cost > card.current_points);
  const progressToNext = nextReward
    ? Math.min((card.current_points / nextReward.points_cost) * 100, 100)
    : 100;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-500 to-blue-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-white/80" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{program.name}</p>
            <p className="text-[11px] text-white/70 truncate">{card.vendor?.business_name}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Points Balance */}
        <div className="text-center mb-3">
          <p className="text-3xl font-extrabold text-gray-900">{card.current_points.toLocaleString()}</p>
          <p className="text-xs text-gray-400 font-medium">POINTS</p>
        </div>

        {/* Progress bar to next reward */}
        {nextReward && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Next: {nextReward.name}</span>
              <span className="font-medium">{nextReward.points_cost} pts</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {nextReward.points_cost - card.current_points > 0
                ? `${nextReward.points_cost - card.current_points} more points needed`
                : 'Ready to redeem!'
              }
            </p>
          </div>
        )}

        {/* Available Rewards */}
        {rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.map(reward => {
              const canAfford = card.current_points >= reward.points_cost;
              const isRedeeming = redeeming === card.id + reward.id;
              return (
                <div key={reward.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${canAfford ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${canAfford ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {canAfford ? <Star className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${canAfford ? 'text-gray-900' : 'text-gray-400'}`}>{reward.name}</p>
                    <p className="text-[10px] text-gray-400">{reward.points_cost} pts</p>
                  </div>
                  {canAfford && (
                    <button
                      onClick={() => onRedeem(card.id, reward.id)}
                      disabled={!!isRedeeming}
                      className="text-[10px] font-bold text-green-600 bg-green-100 hover:bg-green-200 px-2 py-1 rounded-full transition-colors"
                    >
                      {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
