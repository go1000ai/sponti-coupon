'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  Gift, Plus, Pencil, Trash2, Loader2, Save, X,
  Stamp, Star, Users, TrendingUp, Award, Activity,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from 'lucide-react';
import type { LoyaltyProgram, LoyaltyReward, LoyaltyTransaction } from '@/lib/types/database';

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

export default function LoyaltyPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // UI state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Forms
  const [form, setForm] = useState<ProgramForm>(emptyProgramForm);
  const [rewardForm, setRewardForm] = useState<RewardForm>(emptyRewardForm);

  const hasAccess = canAccess('loyalty_program');

  const fetchProgram = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/loyalty');
      const data = await res.json();
      setProgram(data.program);
      setRewards(data.rewards || []);
      setStats(data.stats);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchMembers = async () => {
    const res = await fetch('/api/vendor/loyalty/members?limit=50');
    const data = await res.json();
    setMembers(data.members || []);
  };

  const fetchTransactions = async () => {
    const res = await fetch('/api/vendor/loyalty/transactions?limit=20');
    const data = await res.json();
    setTransactions(data.transactions || []);
  };

  useEffect(() => {
    if (!user) return;
    fetchProgram();
  }, [user, fetchProgram]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Create Program ────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) { showMsg('error', 'Program name is required.'); return; }
    if (form.program_type === 'punch_card' && (!form.punch_reward.trim() || form.punches_required < 1)) {
      showMsg('error', 'Set punches required and the reward.'); return;
    }
    if (form.program_type === 'points' && form.points_per_dollar <= 0) {
      showMsg('error', 'Points per dollar must be greater than 0.'); return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', 'Loyalty program created!');
        setShowCreateForm(false);
        setForm(emptyProgramForm);
        fetchProgram();
      } else {
        showMsg('error', data.error || 'Failed to create program.');
      }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  // ── Update Program ────────────────────────────
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', 'Program updated!');
        setShowEditForm(false);
        fetchProgram();
      } else {
        showMsg('error', data.error || 'Failed to update.');
      }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  // ── Toggle Active ─────────────────────────────
  const handleToggleActive = async () => {
    if (!program) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !program.is_active }),
      });
      if (res.ok) {
        showMsg('success', program.is_active ? 'Program paused.' : 'Program activated!');
        fetchProgram();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  // ── Delete Program ────────────────────────────
  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty', { method: 'DELETE' });
      if (res.ok) {
        showMsg('success', 'Loyalty program deleted.');
        setProgram(null);
        setRewards([]);
        setStats(null);
        setShowDeleteConfirm(false);
      }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  // ── Add Reward ────────────────────────────────
  const handleAddReward = async () => {
    if (!rewardForm.name.trim() || rewardForm.points_cost < 1) {
      showMsg('error', 'Name and points cost are required.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardForm),
      });
      if (res.ok) {
        showMsg('success', 'Reward added!');
        setShowAddReward(false);
        setRewardForm(emptyRewardForm);
        fetchProgram();
      }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  // ── Update Reward ─────────────────────────────
  const handleUpdateReward = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/loyalty/rewards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...rewardForm }),
      });
      if (res.ok) {
        showMsg('success', 'Reward updated!');
        setEditingRewardId(null);
        setRewardForm(emptyRewardForm);
        fetchProgram();
      }
    } catch { showMsg('error', 'Network error.'); }
    setSaving(false);
  };

  // ── Delete Reward ─────────────────────────────
  const handleDeleteReward = async (id: string) => {
    try {
      const res = await fetch(`/api/vendor/loyalty/rewards?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg('success', 'Reward deleted.');
        fetchProgram();
      }
    } catch { showMsg('error', 'Network error.'); }
  };

  if (tierLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return <UpgradePrompt requiredTier="pro" featureName="Loyalty Rewards Program" description="Create punch cards and points programs to reward your repeat customers. Available on Pro, Business, and Enterprise plans." mode="full-page" />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center shadow-lg shadow-primary-200/40">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500">Loyalty Program</h1>
            <p className="text-gray-500 text-sm mt-0.5">Reward your repeat customers</p>
          </div>
        </div>
        {!program && !showCreateForm && (
          <button onClick={() => setShowCreateForm(true)} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5">
            <Plus className="w-4 h-4" /> Create Program
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* ═══ CREATE FORM ═══ */}
      {showCreateForm && !program && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-bold text-secondary-500 mb-6">Create Loyalty Program</h2>

          {/* Type selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setForm(f => ({ ...f, program_type: 'punch_card' }))}
              className={`p-5 rounded-xl border-2 text-left transition-all ${form.program_type === 'punch_card' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Stamp className={`w-8 h-8 mb-2 ${form.program_type === 'punch_card' ? 'text-primary-500' : 'text-gray-400'}`} />
              <h3 className="font-bold text-secondary-500">Punch Card</h3>
              <p className="text-xs text-gray-500 mt-1">Buy X, get Y free. Customers earn a stamp per deal redemption.</p>
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, program_type: 'points' }))}
              className={`p-5 rounded-xl border-2 text-left transition-all ${form.program_type === 'points' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Star className={`w-8 h-8 mb-2 ${form.program_type === 'points' ? 'text-primary-500' : 'text-gray-400'}`} />
              <h3 className="font-bold text-secondary-500">Points System</h3>
              <p className="text-xs text-gray-500 mt-1">Customers earn points per dollar spent. Redeem at different reward tiers.</p>
            </button>
          </div>

          {/* Name & Description */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder={form.program_type === 'punch_card' ? 'e.g., Coffee Stamp Card' : 'e.g., Rewards Points'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows={2} placeholder="A short description for your customers" />
            </div>
          </div>

          {/* Type-specific fields */}
          {form.program_type === 'punch_card' ? (
            <div className="space-y-4 mb-6 bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stamps Required for Reward</label>
                <input type="number" min={1} max={50} value={form.punches_required} onChange={e => setForm(f => ({ ...f, punches_required: parseInt(e.target.value) || 1 }))} className="input-field w-32" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reward (what they get)</label>
                <input value={form.punch_reward} onChange={e => setForm(f => ({ ...f, punch_reward: e.target.value }))} className="input-field" placeholder="e.g., Free Medium Coffee" />
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points Per Dollar Spent</label>
                <input type="number" min={0.1} step={0.1} value={form.points_per_dollar} onChange={e => setForm(f => ({ ...f, points_per_dollar: parseFloat(e.target.value) || 1 }))} className="input-field w-32" />
                <p className="text-xs text-gray-400 mt-1">e.g., 1 = 1 point per $1. A $50 deal earns 50 points.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Create Program
            </button>
            <button onClick={() => { setShowCreateForm(false); setForm(emptyProgramForm); }} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══ NO PROGRAM STATE ═══ */}
      {!program && !showCreateForm && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-secondary-500 mb-2">No Loyalty Program Yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Create a punch card or points program to reward customers who keep coming back.
            Each customer earns loyalty rewards per vendor — it&apos;s their relationship with <em>your</em> business.
          </p>
          <button onClick={() => setShowCreateForm(true)} className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            <Plus className="w-4 h-4" /> Create Loyalty Program
          </button>
        </div>
      )}

      {/* ═══ ACTIVE PROGRAM DASHBOARD ═══ */}
      {program && !showEditForm && (
        <>
          {/* Program Header Card */}
          <div className="card overflow-hidden mb-6">
            <div className={`px-6 py-5 ${program.program_type === 'punch_card' ? 'bg-gradient-to-r from-primary-500 to-orange-500' : 'bg-gradient-to-r from-secondary-500 to-blue-600'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {program.program_type === 'punch_card' ? <Stamp className="w-8 h-8 text-white/80" /> : <Star className="w-8 h-8 text-white/80" />}
                  <div>
                    <h2 className="text-xl font-bold text-white">{program.name}</h2>
                    <p className="text-white/70 text-sm">
                      {program.program_type === 'punch_card'
                        ? `${program.punches_required} stamps → ${program.punch_reward}`
                        : `${program.points_per_dollar} point${Number(program.points_per_dollar) !== 1 ? 's' : ''} per $1 spent`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleToggleActive} disabled={saving} className="p-2 text-white/80 hover:text-white transition-colors" title={program.is_active ? 'Pause program' : 'Activate program'}>
                    {program.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button onClick={() => { setShowEditForm(true); setForm({ program_type: program.program_type, name: program.name, description: program.description || '', punches_required: program.punches_required || 10, punch_reward: program.punch_reward || '', points_per_dollar: Number(program.points_per_dollar) || 1 }); }} className="p-2 text-white/80 hover:text-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-white/60 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {!program.is_active && (
                <div className="mt-3 bg-white/15 rounded-lg px-3 py-2 text-sm text-white/90">
                  Program is paused. New stamps/points will not be awarded until reactivated.
                </div>
              )}
            </div>
            {program.description && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-sm text-gray-600">{program.description}</p>
              </div>
            )}
          </div>

          {/* Delete Confirm */}
          {showDeleteConfirm && (
            <div className="card p-5 mb-6 border-2 border-red-200 bg-red-50">
              <p className="text-sm font-medium text-red-700 mb-3">
                Delete this loyalty program? All member cards, rewards, and transaction history will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Keep
                </button>
                <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 inline-flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Program
                </button>
              </div>
            </div>
          )}

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="card p-4 text-center">
                <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-secondary-500">{stats.total_members}</p>
                <p className="text-xs text-gray-400">Members</p>
              </div>
              <div className="card p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-secondary-500">
                  {program.program_type === 'punch_card' ? stats.total_punches : stats.total_points.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">{program.program_type === 'punch_card' ? 'Total Stamps' : 'Total Points'}</p>
              </div>
              <div className="card p-4 text-center">
                <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-secondary-500">{stats.rewards_redeemed}</p>
                <p className="text-xs text-gray-400">Rewards Redeemed</p>
              </div>
              <div className="card p-4 text-center">
                <Gift className="w-5 h-5 text-primary-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-secondary-500">{rewards.filter(r => r.is_active).length || (program.program_type === 'punch_card' ? 1 : 0)}</p>
                <p className="text-xs text-gray-400">Active Rewards</p>
              </div>
            </div>
          )}

          {/* Reward Tiers (points only) */}
          {program.program_type === 'points' && (
            <div className="card mb-6">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-secondary-500 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-500" /> Reward Tiers
                </h3>
                <button onClick={() => { setShowAddReward(true); setRewardForm(emptyRewardForm); }} className="text-sm text-primary-500 font-medium hover:text-primary-600 inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Reward
                </button>
              </div>

              {rewards.length === 0 && !showAddReward ? (
                <div className="p-8 text-center">
                  <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No reward tiers yet. Add rewards that customers can redeem with their points.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {rewards.map(reward => (
                    editingRewardId === reward.id ? (
                      <div key={reward.id} className="p-4 bg-blue-50">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <input value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Reward name" />
                          <input value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm" placeholder="Description (optional)" />
                          <input type="number" min={1} value={rewardForm.points_cost} onChange={e => setRewardForm(f => ({ ...f, points_cost: parseInt(e.target.value) || 0 }))} className="input-field text-sm" placeholder="Points cost" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateReward(reward.id)} disabled={saving} className="text-sm bg-primary-500 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                          </button>
                          <button onClick={() => { setEditingRewardId(null); setRewardForm(emptyRewardForm); }} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key={reward.id} className="px-6 py-3 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${reward.is_active ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Star className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${reward.is_active ? 'text-secondary-500' : 'text-gray-400 line-through'}`}>{reward.name}</p>
                            {reward.description && <p className="text-xs text-gray-400">{reward.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary-500">{reward.points_cost} pts</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => { setEditingRewardId(reward.id); setRewardForm({ name: reward.name, description: reward.description || '', points_cost: reward.points_cost }); }} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteReward(reward.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Add Reward Form */}
              {showAddReward && (
                <div className="p-4 bg-green-50 border-t border-green-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Reward name" />
                    <input value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm" placeholder="Description (optional)" />
                    <input type="number" min={1} value={rewardForm.points_cost} onChange={e => setRewardForm(f => ({ ...f, points_cost: parseInt(e.target.value) || 0 }))} className="input-field text-sm" placeholder="Points cost" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddReward} disabled={saving} className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                    </button>
                    <button onClick={() => { setShowAddReward(false); setRewardForm(emptyRewardForm); }} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members Section (collapsible) */}
          <div className="card mb-6">
            <button onClick={() => { setShowMembers(!showMembers); if (!showMembers && members.length === 0) fetchMembers(); }} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <h3 className="font-bold text-secondary-500 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" /> Members
                {stats && <span className="text-xs text-gray-400 font-normal">({stats.total_members})</span>}
              </h3>
              {showMembers ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {showMembers && (
              <div className="border-t border-gray-100">
                {members.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">No members yet. Customers join automatically when they redeem a deal.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{program.program_type === 'punch_card' ? 'Stamps' : 'Points'}</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Lifetime</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {members.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <p className="font-medium text-secondary-500">{m.customer?.first_name || ''} {m.customer?.last_name || ''}</p>
                              <p className="text-xs text-gray-400">{m.customer?.email}</p>
                            </td>
                            <td className="px-6 py-3 font-semibold text-primary-500">
                              {program.program_type === 'punch_card' ? `${m.current_punches}/${program.punches_required}` : m.current_points.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-gray-500">
                              {program.program_type === 'punch_card' ? m.total_punches_earned : m.total_points_earned.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-gray-400 text-xs">
                              {new Date(m.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Feed (collapsible) */}
          <div className="card">
            <button onClick={() => { setShowActivity(!showActivity); if (!showActivity && transactions.length === 0) fetchTransactions(); }} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <h3 className="font-bold text-secondary-500 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" /> Recent Activity
              </h3>
              {showActivity ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {showActivity && (
              <div className="border-t border-gray-100">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">No activity yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {transactions.map(t => (
                      <div key={t.id} className="px-6 py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.transaction_type.startsWith('earn') ? 'bg-green-100' : 'bg-amber-100'}`}>
                          {t.transaction_type.startsWith('earn') ? <TrendingUp className="w-4 h-4 text-green-600" /> : <Award className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-secondary-500 truncate">{t.description}</p>
                          <p className="text-xs text-gray-400">
                            {(t as unknown as { customer?: { first_name?: string; last_name?: string; email?: string } }).customer
                              ? `${(t as unknown as { customer: { first_name?: string; last_name?: string } }).customer.first_name || ''} ${(t as unknown as { customer: { first_name?: string; last_name?: string } }).customer.last_name || ''}`.trim()
                              : ''
                            }
                          </p>
                        </div>
                        <span className={`text-xs font-bold ${t.transaction_type.startsWith('earn') ? 'text-green-600' : 'text-amber-600'}`}>
                          {t.transaction_type.includes('punch') ? `${t.punches_amount > 0 ? '+' : ''}${t.punches_amount} stamp` : `${t.points_amount > 0 ? '+' : ''}${t.points_amount} pts`}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ EDIT FORM ═══ */}
      {program && showEditForm && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-bold text-secondary-500 mb-6">Edit Loyalty Program</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows={2} />
            </div>
            {program.program_type === 'punch_card' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stamps Required</label>
                  <input type="number" min={1} value={form.punches_required} onChange={e => setForm(f => ({ ...f, punches_required: parseInt(e.target.value) || 1 }))} className="input-field w-32" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward</label>
                  <input value={form.punch_reward} onChange={e => setForm(f => ({ ...f, punch_reward: e.target.value }))} className="input-field" />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points Per Dollar</label>
                <input type="number" min={0.1} step={0.1} value={form.points_per_dollar} onChange={e => setForm(f => ({ ...f, points_per_dollar: parseFloat(e.target.value) || 1 }))} className="input-field w-32" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleUpdate} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
            <button onClick={() => setShowEditForm(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
