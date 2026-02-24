'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import {
  Gift, Plus, Pencil, Trash2, Loader2, Save, X,
  Stamp, Star, Users, TrendingUp, Award, Activity,
  ChevronDown, ToggleLeft, ToggleRight,
  Sparkles, Crown, Zap, Check, ArrowRight,
} from 'lucide-react';
import type { LoyaltyProgram, LoyaltyReward, LoyaltyTransaction } from '@/lib/types/database';

/* ── Types ──────────────────────────── */
interface ProgramForm {
  program_type: 'punch_card' | 'points';
  name: string;
  description: string;
  punches_required: number;
  punch_reward: string;
  points_per_dollar: number;
}

interface RewardForm {
  name: string;
  description: string;
  points_cost: number;
}

interface Stats {
  total_members: number;
  total_punches: number;
  total_points: number;
  rewards_redeemed: number;
}

interface ProgramWithStats extends LoyaltyProgram {
  member_count: number;
}

interface Member {
  id: string;
  current_punches: number;
  total_punches_earned: number;
  current_points: number;
  total_points_earned: number;
  updated_at: string;
  customer: { first_name: string | null; last_name: string | null; email: string } | null;
}

const emptyProgramForm: ProgramForm = {
  program_type: 'punch_card',
  name: '',
  description: '',
  punches_required: 10,
  punch_reward: '',
  points_per_dollar: 1,
};

const emptyRewardForm: RewardForm = { name: '', description: '', points_cost: 100 };

/* ═══════════════════════════════════════
   Floating Particles
   ═══════════════════════════════════════ */
function FloatingParticles({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 animate-float-slow"
          style={{
            width: `${20 + i * 12}px`,
            height: `${20 + i * 12}px`,
            background: `linear-gradient(135deg, ${i % 2 === 0 ? '#E8632B' : '#F5A623'}, transparent)`,
            left: `${10 + i * 15}%`,
            top: `${10 + i * 10}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${5 + i}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Program Card (Grid Item)
   ═══════════════════════════════════════ */
function ProgramCard({
  program,
  delay,
  onClick,
}: {
  program: ProgramWithStats;
  delay: number;
  onClick: () => void;
}) {
  const isPunch = program.program_type === 'punch_card';

  return (
    <button
      onClick={onClick}
      className="group relative bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 opacity-0 animate-card-pop focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Card Header Gradient */}
      <div className={`relative px-5 pt-5 pb-8 ${
        isPunch
          ? 'bg-gradient-to-br from-primary-500 via-orange-500 to-amber-400'
          : 'bg-gradient-to-br from-secondary-500 via-blue-600 to-indigo-500'
      }`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute bottom-0 left-4 w-12 h-12 bg-white/5 rounded-full" />
        </div>

        <div className="relative flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            {isPunch ? <Stamp className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-white" />}
          </div>
          <div className="flex items-center gap-1.5">
            {program.is_active ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-400/20 border border-green-400/30 rounded-full text-[9px] font-bold text-green-100 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-bold text-white/60 uppercase tracking-wider">
                Paused
              </span>
            )}
          </div>
        </div>

        <div className="relative mt-3">
          <h3 className="text-lg font-extrabold text-white truncate">{program.name}</h3>
          <p className="text-white/60 text-xs font-medium mt-0.5 capitalize">{program.program_type.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Card Body */}
      <div className="relative px-5 py-4 -mt-3">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-secondary-500">{program.member_count}</span>
              <span className="text-xs text-gray-400">members</span>
            </div>
            {isPunch && (
              <span className="text-xs font-semibold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
                {program.punches_required} stamps
              </span>
            )}
            {!isPunch && (
              <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                {program.points_per_dollar}x pts/$
              </span>
            )}
          </div>

          {isPunch && program.punch_reward && (
            <p className="text-xs text-gray-500 truncate">
              <Gift className="w-3 h-3 inline mr-1 text-primary-400" />
              {program.punch_reward}
            </p>
          )}
          {program.description && !isPunch && (
            <p className="text-xs text-gray-500 truncate">{program.description}</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 group-hover:text-primary-500 transition-colors">
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════
   Program Detail Modal
   ═══════════════════════════════════════ */
function ProgramModal({
  programId,
  onClose,
  onDeleted,
  onUpdated,
}: {
  programId: string;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // UI
  const [isEditing, setIsEditing] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

  // Forms
  const [form, setForm] = useState<ProgramForm>(emptyProgramForm);
  const [rewardForm, setRewardForm] = useState<RewardForm>(emptyRewardForm);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/vendor/loyalty?id=${programId}`);
      const data = await res.json();
      setProgram(data.program);
      setRewards(data.rewards || []);
      setStats(data.stats);
    } catch { /* ignore */ }
    setLoading(false);
  }, [programId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const fetchMembers = async () => {
    const res = await fetch(`/api/vendor/loyalty/members?program_id=${programId}&limit=100`);
    const data = await res.json();
    setMembers(data.members || []);
  };

  const fetchTransactions = async () => {
    const res = await fetch(`/api/vendor/loyalty/transactions?limit=20`);
    const data = await res.json();
    setTransactions(data.transactions || []);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: programId, ...form }),
      });
      if (res.ok) { showMsg('success', 'Program updated!'); setIsEditing(false); fetchDetail(); onUpdated(); }
      else { const d = await res.json(); showMsg('error', d.error || 'Failed.'); }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  const handleToggleActive = async () => {
    if (!program) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: programId, is_active: !program.is_active }),
      });
      if (res.ok) { showMsg('success', program.is_active ? 'Paused.' : 'Activated!'); fetchDetail(); onUpdated(); }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/vendor/loyalty?id=${programId}`, { method: 'DELETE' });
      if (res.ok) { onDeleted(); onClose(); }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  const handleAddReward = async () => {
    if (!rewardForm.name.trim() || rewardForm.points_cost < 1) { showMsg('error', 'Name and cost required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rewardForm) });
      if (res.ok) { showMsg('success', 'Reward added!'); setShowAddReward(false); setRewardForm(emptyRewardForm); fetchDetail(); }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  const handleUpdateReward = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty/rewards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...rewardForm }) });
      if (res.ok) { showMsg('success', 'Updated!'); setEditingRewardId(null); setRewardForm(emptyRewardForm); fetchDetail(); }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  const handleDeleteReward = async (id: string) => {
    try {
      const res = await fetch(`/api/vendor/loyalty/rewards?id=${id}`, { method: 'DELETE' });
      if (res.ok) { showMsg('success', 'Deleted.'); fetchDetail(); }
    } catch { showMsg('error', 'Network error.'); }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-3xl p-10 shadow-2xl" onClick={e => e.stopPropagation()}>
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!program) return null;
  const isPunch = program.program_type === 'punch_card';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up-fade"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`sticky top-0 z-10 relative px-6 py-5 ${
          isPunch
            ? 'bg-gradient-to-br from-primary-500 via-orange-500 to-amber-400'
            : 'bg-gradient-to-br from-secondary-500 via-blue-600 to-indigo-500'
        }`}>
          <FloatingParticles count={4} />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                {isPunch ? <Stamp className="w-7 h-7 text-white" /> : <Star className="w-7 h-7 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">{program.name}</h2>
                  {program.is_active && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-400/20 border border-green-400/30 rounded-full text-[9px] font-bold text-green-100 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                    </span>
                  )}
                </div>
                <p className="text-white/70 text-sm">
                  {isPunch ? `${program.punches_required} stamps → ${program.punch_reward}` : `${program.points_per_dollar} pt${Number(program.points_per_dollar) !== 1 ? 's' : ''} per $1`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={handleToggleActive} disabled={saving} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all">
                {program.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => { setIsEditing(!isEditing); if (!isEditing) setForm({ program_type: program.program_type, name: program.name, description: program.description || '', punches_required: program.punches_required || 10, punch_reward: program.punch_reward || '', points_per_dollar: Number(program.points_per_dollar) || 1 }); }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!program.is_active && (
            <div className="relative mt-3 bg-white/10 rounded-xl px-3 py-2 text-sm text-white/80 flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 shrink-0" /> Program paused — not awarding stamps/points.
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Message */}
          {message && (
            <div className={`px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 animate-slide-up-fade ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-gray-50 rounded-2xl p-5 space-y-4 animate-slide-up-fade">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-secondary-500">Program Name</label>
                  <AIAssistButton type="loyalty_program_name" context={{ program_type: form.program_type, current_text: form.name }} onResult={t => setForm(f => ({ ...f, name: t }))} label="Suggest Name" />
                </div>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-secondary-500 font-medium" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-secondary-500">Description</label>
                  <AIAssistButton type="loyalty_description" context={{ program_type: form.program_type, program_name: form.name, current_text: form.description }} onResult={t => setForm(f => ({ ...f, description: t }))} label="Write Description" />
                </div>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-secondary-500 resize-none" rows={2} />
              </div>
              {isPunch ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-secondary-500 mb-2">Stamps Required</label>
                    <input type="number" min={1} value={form.punches_required} onChange={e => setForm(f => ({ ...f, punches_required: parseInt(e.target.value) || 1 }))} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-secondary-500 font-medium" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-secondary-500">Reward</label>
                      <AIAssistButton type="loyalty_reward" context={{ program_name: form.name, punches_required: String(form.punches_required), current_text: form.punch_reward }} onResult={t => setForm(f => ({ ...f, punch_reward: t }))} label="Suggest" />
                    </div>
                    <input value={form.punch_reward} onChange={e => setForm(f => ({ ...f, punch_reward: e.target.value }))} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-secondary-500 font-medium" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-secondary-500 mb-2">Points Per Dollar</label>
                  <input type="number" min={0.1} step={0.1} value={form.points_per_dollar} onChange={e => setForm(f => ({ ...f, points_per_dollar: parseFloat(e.target.value) || 1 }))} className="w-32 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-secondary-500 font-medium" />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={handleUpdate} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 text-gray-400 hover:text-gray-600 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Users, label: 'Members', value: stats.total_members, color: 'blue' },
                { icon: TrendingUp, label: isPunch ? 'Total Stamps' : 'Total Points', value: isPunch ? stats.total_punches : stats.total_points.toLocaleString(), color: 'green' },
                { icon: Award, label: 'Redeemed', value: stats.rewards_redeemed, color: 'amber' },
                { icon: Gift, label: 'Active Rewards', value: rewards.filter(r => r.is_active).length || (isPunch ? 1 : 0), color: 'primary' },
              ].map((s, i) => {
                const colorMap: Record<string, string> = { blue: 'from-blue-500/10 to-indigo-500/10 text-blue-600', green: 'from-emerald-500/10 to-green-500/10 text-emerald-600', amber: 'from-amber-500/10 to-yellow-500/10 text-amber-600', primary: 'from-primary-500/10 to-orange-500/10 text-primary-600' };
                const iconColor: Record<string, string> = { blue: 'text-blue-500', green: 'text-emerald-500', amber: 'text-amber-500', primary: 'text-primary-500' };
                return (
                  <div key={i} className={`bg-gradient-to-br ${colorMap[s.color]} rounded-2xl p-4 text-center`}>
                    <s.icon className={`w-5 h-5 ${iconColor[s.color]} mx-auto mb-1`} />
                    <p className={`text-2xl font-extrabold ${colorMap[s.color].split(' ').pop()}`}>{s.value}</p>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reward Tiers (points) */}
          {!isPunch && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-secondary-500 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Reward Tiers
                </h3>
                <button onClick={() => { setShowAddReward(true); setRewardForm(emptyRewardForm); }} className="text-xs text-primary-500 font-bold hover:text-primary-600 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {rewards.length === 0 && !showAddReward ? (
                <div className="p-6 text-center text-sm text-gray-400">No rewards yet. Add reward tiers for customers to redeem.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {rewards.map((reward, i) => (
                    editingRewardId === reward.id ? (
                      <div key={reward.id} className="p-4 bg-blue-50/50">
                        <div className="flex justify-end mb-2">
                          <AIAssistButton type="loyalty_reward_name" context={{ program_name: program.name, points_cost: String(rewardForm.points_cost), current_text: rewardForm.name }} onResult={t => setRewardForm(f => ({ ...f, name: t }))} label="Suggest" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <input value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} className="px-3 py-2 bg-white border-2 border-blue-200 rounded-xl text-sm" placeholder="Name" />
                          <input value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))} className="px-3 py-2 bg-white border-2 border-blue-200 rounded-xl text-sm" placeholder="Description" />
                          <input type="number" min={1} value={rewardForm.points_cost} onChange={e => setRewardForm(f => ({ ...f, points_cost: parseInt(e.target.value) || 0 }))} className="px-3 py-2 bg-white border-2 border-blue-200 rounded-xl text-sm" placeholder="Points" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateReward(reward.id)} disabled={saving} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                          </button>
                          <button onClick={() => { setEditingRewardId(null); setRewardForm(emptyRewardForm); }} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key={reward.id} className="group px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${reward.is_active ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
                          <div>
                            <p className={`font-semibold text-sm ${reward.is_active ? 'text-secondary-500' : 'text-gray-400 line-through'}`}>{reward.name}</p>
                            {reward.description && <p className="text-[10px] text-gray-400">{reward.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-extrabold text-primary-500 bg-primary-50 px-2 py-1 rounded-full">{reward.points_cost} pts</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => { setEditingRewardId(reward.id); setRewardForm({ name: reward.name, description: reward.description || '', points_cost: reward.points_cost }); }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteReward(reward.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
              {showAddReward && (
                <div className="p-4 bg-green-50/50 border-t border-green-100">
                  <div className="flex justify-end mb-2">
                    <AIAssistButton type="loyalty_reward_name" context={{ program_name: program.name, points_cost: String(rewardForm.points_cost), current_text: rewardForm.name }} onResult={t => setRewardForm(f => ({ ...f, name: t }))} label="Suggest Name" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <input value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} className="px-3 py-2 bg-white border-2 border-green-200 rounded-xl text-sm" placeholder="Reward name" />
                    <input value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))} className="px-3 py-2 bg-white border-2 border-green-200 rounded-xl text-sm" placeholder="Description" />
                    <input type="number" min={1} value={rewardForm.points_cost} onChange={e => setRewardForm(f => ({ ...f, points_cost: parseInt(e.target.value) || 0 }))} className="px-3 py-2 bg-white border-2 border-green-200 rounded-xl text-sm" placeholder="Points cost" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddReward} disabled={saving} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 shadow-lg shadow-green-500/20">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                    </button>
                    <button onClick={() => { setShowAddReward(false); setRewardForm(emptyRewardForm); }} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => { setShowMembers(!showMembers); if (!showMembers && members.length === 0) fetchMembers(); }} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
              <h3 className="font-bold text-secondary-500 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Members {stats && <span className="text-gray-400 font-normal">({stats.total_members})</span>}
              </h3>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showMembers ? 'rotate-180' : ''}`} />
            </button>
            {showMembers && (
              <div className="border-t border-gray-100">
                {members.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">No members yet. Customers join when they redeem a deal.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {members.map(m => {
                      const required = program.punches_required || 10;
                      const progressPct = isPunch
                        ? Math.min((m.current_punches / required) * 100, 100)
                        : 0;
                      const closeToReward = isPunch && m.current_punches >= required - 2 && m.current_punches < required;
                      const rewardReady = isPunch && m.current_punches >= required;
                      const lastActive = getTimeAgo(m.updated_at);

                      return (
                        <div key={m.id} className="px-5 py-3.5 hover:bg-gray-50/30 transition-colors">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                              rewardReady ? 'bg-green-100 text-green-600' : closeToReward ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {(m.customer?.first_name?.[0] || m.customer?.email?.[0] || '?').toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-secondary-500 text-xs truncate">
                                  {m.customer?.first_name || ''} {m.customer?.last_name || ''}
                                </p>
                                {rewardReady && (
                                  <span className="text-[9px] font-bold bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full flex-shrink-0">REWARD READY</span>
                                )}
                                {closeToReward && !rewardReady && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">ALMOST THERE</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">{m.customer?.email}</p>
                            </div>

                            {/* Current Progress */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-bold text-primary-500">
                                {isPunch ? `${m.current_punches}/${required}` : `${m.current_points.toLocaleString()} pts`}
                              </p>
                              <p className="text-[10px] text-gray-400">{lastActive}</p>
                            </div>
                          </div>

                          {/* Progress bar for punch cards */}
                          {isPunch && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    rewardReady ? 'bg-green-500' : closeToReward ? 'bg-amber-400' : 'bg-primary-400'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 font-medium w-8 text-right">{Math.round(progressPct)}%</span>
                            </div>
                          )}

                          {/* Lifetime stats row */}
                          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-gray-400">
                            <span>Lifetime: <b className="text-gray-500">{isPunch ? `${m.total_punches_earned} stamps` : `${m.total_points_earned.toLocaleString()} pts`}</b></span>
                            {!isPunch && m.total_points_earned > 0 && (
                              <span>Redeemed: <b className="text-gray-500">{(m.total_points_earned - m.current_points).toLocaleString()} pts</b></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => { setShowActivity(!showActivity); if (!showActivity && transactions.length === 0) fetchTransactions(); }} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
              <h3 className="font-bold text-secondary-500 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" /> Recent Activity
              </h3>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showActivity ? 'rotate-180' : ''}`} />
            </button>
            {showActivity && (
              <div className="border-t border-gray-100">
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">No activity yet.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {transactions.map(t => (
                      <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.transaction_type.startsWith('earn') ? 'bg-green-100' : 'bg-amber-100'}`}>
                          {t.transaction_type.startsWith('earn') ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : <Award className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-secondary-500 truncate">{t.description}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.transaction_type.startsWith('earn') ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {t.transaction_type.includes('punch') ? `${t.punches_amount > 0 ? '+' : ''}${t.punches_amount}` : `${t.points_amount > 0 ? '+' : ''}${t.points_amount} pts`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete Zone */}
          <div className="pt-2">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors inline-flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Delete this program
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 border border-red-200 animate-slide-up-fade">
                <p className="text-sm font-medium text-red-700 mb-3">Delete this program? All cards, rewards, and history will be permanently removed.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Keep</button>
                  <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 inline-flex items-center gap-1.5 shadow-lg shadow-red-500/20">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Create Program Modal
   ═══════════════════════════════════════ */
function CreateProgramModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ProgramForm>(emptyProgramForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Program name is required.'); return; }
    if (form.program_type === 'punch_card' && (!form.punch_reward.trim() || form.punches_required < 1)) { setError('Set stamps and reward.'); return; }
    if (form.program_type === 'points' && form.points_per_dollar <= 0) { setError('Points per dollar must be > 0.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { onCreated(); onClose(); }
      else { setError(data.error || 'Failed.'); }
    } catch { setError('Network error.'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up-fade" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-secondary-500 via-secondary-400 to-primary-500 px-6 pt-6 pb-10">
          <FloatingParticles count={4} />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <X className="w-5 h-5" />
          </button>
          <div className="relative">
            <h2 className="text-2xl font-extrabold text-white">Create Loyalty Program</h2>
            <p className="text-white/60 text-sm mt-1">Choose a type and customize it for your business</p>
          </div>
        </div>

        <div className="px-6 pb-6 -mt-5 relative space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 flex items-center gap-2">
              <X className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'punch_card' as const, icon: Stamp, label: 'Punch Card', desc: 'Buy X, get Y free', color: 'primary', tag: 'Popular', tagIcon: Zap },
              { type: 'points' as const, icon: Star, label: 'Points System', desc: 'Earn points per $1', color: 'blue', tag: 'Premium', tagIcon: Crown },
            ].map(t => {
              const sel = form.program_type === t.type;
              const grad = t.color === 'primary' ? 'from-primary-500 to-orange-500' : 'from-blue-500 to-indigo-500';
              const bg = t.color === 'primary' ? 'from-primary-50 to-orange-50' : 'from-blue-50 to-indigo-50';
              const ring = t.color === 'primary' ? 'ring-primary-500' : 'ring-blue-500';
              return (
                <button
                  key={t.type}
                  onClick={() => setForm(f => ({ ...f, program_type: t.type }))}
                  className={`relative group p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                    sel ? `border-transparent ring-2 ${ring} bg-gradient-to-br ${bg} shadow-xl scale-[1.02]` : 'border-gray-200 bg-white hover:shadow-lg hover:scale-[1.01]'
                  }`}
                >
                  {sel && <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center animate-check-pop"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${sel ? `bg-gradient-to-br ${grad} shadow-lg` : 'bg-gray-100'}`}>
                    <t.icon className={`w-5 h-5 ${sel ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`font-bold text-sm ${sel ? 'text-secondary-500' : 'text-gray-600'}`}>{t.label}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                  {sel && <div className="mt-2 flex items-center gap-1 text-[10px] font-bold" style={{ color: t.color === 'primary' ? '#E8632B' : '#3B82F6' }}><t.tagIcon className="w-3 h-3" /> {t.tag}</div>}
                </button>
              );
            })}
          </div>

          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-secondary-500">Program Name</label>
              <AIAssistButton type="loyalty_program_name" context={{ program_type: form.program_type, current_text: form.name }} onResult={t => setForm(f => ({ ...f, name: t }))} label="Suggest Name" />
            </div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white text-secondary-500 font-medium transition-all" placeholder={form.program_type === 'punch_card' ? 'e.g., Coffee Stamp Card' : 'e.g., Rewards Points'} />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-secondary-500">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <AIAssistButton type="loyalty_description" context={{ program_type: form.program_type, program_name: form.name, current_text: form.description }} onResult={t => setForm(f => ({ ...f, description: t }))} label="Write Description" />
            </div>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white text-secondary-500 resize-none transition-all" rows={2} placeholder="A short description for your customers" />
          </div>

          {/* Type-specific */}
          {form.program_type === 'punch_card' ? (
            <div className="bg-gradient-to-br from-primary-50 to-orange-50 rounded-2xl p-5 border border-primary-100/50 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary-500 mb-2">Stamps Required</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={50} value={form.punches_required} onChange={e => setForm(f => ({ ...f, punches_required: parseInt(e.target.value) || 1 }))} className="w-20 px-3 py-2.5 bg-white border-2 border-primary-200 rounded-xl text-center text-xl font-extrabold text-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  <span className="text-sm text-gray-500">stamps to earn reward</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-secondary-500">Reward</label>
                  <AIAssistButton type="loyalty_reward" context={{ program_name: form.name, punches_required: String(form.punches_required), current_text: form.punch_reward }} onResult={t => setForm(f => ({ ...f, punch_reward: t }))} label="Suggest Reward" />
                </div>
                <input value={form.punch_reward} onChange={e => setForm(f => ({ ...f, punch_reward: e.target.value }))} className="w-full px-4 py-3 bg-white border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-secondary-500 font-medium" placeholder="e.g., Free Medium Coffee" />
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100/50">
              <label className="block text-sm font-semibold text-secondary-500 mb-2">Points Per Dollar</label>
              <div className="flex items-center gap-3">
                <input type="number" min={0.1} step={0.1} value={form.points_per_dollar} onChange={e => setForm(f => ({ ...f, points_per_dollar: parseFloat(e.target.value) || 1 }))} className="w-20 px-3 py-2.5 bg-white border-2 border-blue-200 rounded-xl text-center text-xl font-extrabold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <span className="text-sm text-gray-500">point{form.points_per_dollar !== 1 ? 's' : ''} per $1</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 bg-white/60 rounded-lg px-3 py-1.5">A $50 deal earns <span className="font-bold text-blue-600">{Math.floor(50 * form.points_per_dollar)}</span> points</p>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {saving ? <Loader2 className="w-5 h-5 animate-spin relative" /> : <Save className="w-5 h-5 relative" />}
            <span className="relative">Create Program</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Main Page
   ═══════════════════════════════════════ */
export default function LoyaltyPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();

  const [programs, setPrograms] = useState<ProgramWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const hasAccess = canAccess('loyalty_program');

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/loyalty');
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPrograms();
  }, [user, fetchPrograms]);

  if (tierLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center animate-pulse">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping" />
        </div>
        <p className="text-sm text-gray-400 animate-pulse">Loading loyalty programs...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <UpgradePrompt requiredTier="pro" featureName="Loyalty Rewards Program" description="Create punch cards and points programs to reward your repeat customers. Available on Pro, Business, and Enterprise plans." mode="full-page" />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-xl shadow-primary-500/30 animate-float">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg animate-bounce-subtle">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-secondary-500 via-secondary-400 to-primary-500 bg-clip-text text-transparent">
              Loyalty Programs
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Create and manage multiple reward programs</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-[1.03] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Plus className="w-5 h-5 relative" />
          <span className="relative">New Program</span>
        </button>
      </div>

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-card-pop">
          <div className="relative px-8 py-16 text-center">
            <FloatingParticles />
            <div className="relative">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/20 to-orange-500/20 animate-pulse-soft" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-2xl shadow-primary-500/30 animate-float">
                  <Gift className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 animate-bounce-subtle">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-secondary-500 mb-3">No Loyalty Programs Yet</h3>
              <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Create punch cards or points programs to reward repeat customers. You can create multiple programs for different product lines or promotions.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="group relative inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 hover:scale-[1.03] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Plus className="w-5 h-5 relative" />
                <span className="relative">Create Your First Program</span>
                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {programs.map((prog, i) => (
            <ProgramCard
              key={prog.id}
              program={prog}
              delay={i * 80}
              onClick={() => setSelectedProgramId(prog.id)}
            />
          ))}

          {/* Add New Card */}
          <button
            onClick={() => setShowCreate(true)}
            className="group flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-300 opacity-0 animate-card-pop min-h-[200px]"
            style={{ animationDelay: `${programs.length * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
              <Plus className="w-7 h-7 text-gray-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <span className="text-sm font-semibold text-gray-400 group-hover:text-primary-500 transition-colors">Add Program</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateProgramModal onClose={() => setShowCreate(false)} onCreated={() => { fetchPrograms(); }} />
      )}
      {selectedProgramId && (
        <ProgramModal
          programId={selectedProgramId}
          onClose={() => setSelectedProgramId(null)}
          onDeleted={() => { fetchPrograms(); }}
          onUpdated={() => { fetchPrograms(); }}
        />
      )}
    </div>
  );
}

/* ── Utility ──────────────────────────── */
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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
