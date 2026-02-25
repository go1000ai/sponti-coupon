'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Star,
  Wrench,
  Plus,
  Minus,
  Search,
  Mail,
} from 'lucide-react';

// --- Inline Sub-Components ---

function AnimatedValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 700;
    const steps = 35;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, decimals]);
  return (
    <>
      {prefix}
      {decimals > 0
        ? display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : display.toLocaleString()}
      {suffix}
    </>
  );
}

// --- Skeleton Components ---

function SkeletonStatCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-7 bg-gray-200 rounded w-28" />
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full w-full mt-2" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="animate-pulse">
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-32" /><div className="h-3 bg-gray-50 rounded w-24 mt-1" /></td>
      <td className="p-4"><div className="h-6 bg-gray-100 rounded-full w-20" /></td>
      <td className="p-4 text-right"><div className="h-4 bg-gray-100 rounded w-16 ml-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
    </tr>
  );
}

// --- Custom Tooltip for PieChart ---

const DISTRIBUTION_COLORS: Record<string, string> = {
  earned: '#22c55e',
  bonus: '#eab308',
  redeemed: '#ef4444',
  adjustment: '#3b82f6',
};

interface DistributionEntry {
  name: string;
  value: number;
  color: string;
}

function DistributionTooltip({ active, payload }: { active?: boolean; payload?: { payload: DistributionEntry }[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-gray-100">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="text-sm font-medium capitalize text-secondary-500">{data.name}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{data.value.toLocaleString()} entries</p>
    </div>
  );
}

// --- Types ---

interface PointsStats {
  total_issued: number;
  total_redeemed: number;
  active_balance: number;
}

interface LedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment';
  description: string | null;
  reference_id: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null } | null;
}

interface Redemption {
  id: string;
  user_id: string;
  reward_type: string | null;
  points_spent: number;
  deal_id: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null } | null;
}

interface PointsFormData {
  email: string;
  amount: string;
  description: string;
  action: 'add' | 'deduct';
}

// --- Row border color helper ---

const TYPE_BORDER_COLORS: Record<string, string> = {
  earned: 'border-l-green-500',
  redeemed: 'border-l-red-500',
  bonus: 'border-l-yellow-500',
  adjustment: 'border-l-blue-500',
};

export default function AdminSpontiPointsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PointsStats>({ total_issued: 0, total_redeemed: 0, active_balance: 0 });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Points modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pointsForm, setPointsForm] = useState<PointsFormData>({ email: '', amount: '', description: '', action: 'add' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/spontipoints');
      if (!res.ok) throw new Error('Failed to fetch SpontiPoints data');
      const data = await res.json();
      setStats(data.stats || { total_issued: 0, total_redeemed: 0, active_balance: 0 });
      setLedger(data.ledger || []);
      setRedemptions(data.redemptions || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  // --- Helpers ---

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
      case 'redeemed':
        return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
      case 'bonus':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'adjustment':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      default:
        return <Coins className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      earned: 'bg-green-50 text-green-600',
      redeemed: 'bg-red-50 text-red-600',
      bonus: 'bg-yellow-50 text-yellow-600',
      adjustment: 'bg-blue-50 text-blue-600',
    };
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium capitalize ${styles[type] || 'bg-gray-100 text-gray-500'}`}>
        {getTypeIcon(type)}
        {type}
      </span>
    );
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getUserDisplay = (entry: { user?: { full_name: string | null; email: string | null } | null }) => {
    if (!entry.user) return '--';
    if (entry.user.full_name && entry.user.email) {
      return (
        <div>
          <p className="font-medium text-secondary-500">{entry.user.full_name}</p>
          <p className="text-xs text-gray-400">{entry.user.email}</p>
        </div>
      );
    }
    return entry.user.full_name || entry.user.email || '--';
  };

  // Filter ledger entries by search
  const filteredLedger = ledgerSearch
    ? ledger.filter((entry) => {
        const q = ledgerSearch.toLowerCase();
        const name = (entry.user?.full_name || '').toLowerCase();
        const email = (entry.user?.email || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const type = (entry.type || '').toLowerCase();
        return name.includes(q) || email.includes(q) || desc.includes(q) || type.includes(q);
      })
    : ledger;

  // --- Compute points distribution from ledger ---
  const distributionData: DistributionEntry[] = (() => {
    const counts: Record<string, number> = { earned: 0, bonus: 0, redeemed: 0, adjustment: 0 };
    ledger.forEach((entry) => {
      if (counts[entry.type] !== undefined) {
        counts[entry.type]++;
      }
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: key,
        value,
        color: DISTRIBUTION_COLORS[key],
      }));
  })();

  // --- Progress bar ratio ---
  const progressPercent = stats.total_issued > 0
    ? Math.round((stats.total_redeemed / stats.total_issued) * 100)
    : 0;

  // --- Points Modal Handlers ---

  const openModal = (action: 'add' | 'deduct') => {
    setPointsForm({ email: '', amount: '', description: '', action });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPointsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!pointsForm.email.trim()) {
      setFormError('Email address is required.');
      return;
    }
    if (!pointsForm.amount || Number(pointsForm.amount) <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await fetch('/api/admin/spontipoints/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pointsForm.email.trim(),
          amount: Number(pointsForm.amount),
          description: pointsForm.description || undefined,
          action: pointsForm.action === 'deduct' ? 'deduct' : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process points');
      }
      const userName = data.user?.full_name || data.user?.email || 'user';
      const actionWord = pointsForm.action === 'deduct' ? 'deducted from' : 'issued to';
      setFormSuccess(`Successfully ${actionWord} ${userName}: ${formatNumber(Number(pointsForm.amount))} points.`);
      fetchData();
      setPointsForm((prev) => ({ ...prev, email: '', amount: '', description: '' }));
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to process points');
    } finally {
      setFormLoading(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div>
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
            <div>
              <div className="h-6 bg-gray-200 rounded w-36 mb-1 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-48 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Table Skeleton */}
        <div className="card mb-8">
          <div className="p-4 border-b border-gray-100">
            <div className="h-5 bg-gray-200 rounded w-44 mb-1 animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-28 animate-pulse" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-12" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-10" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-14" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-20" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-10" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">SpontiPoints</h1>
            <p className="text-sm text-gray-500">Platform-wide points management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('add')}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Points
          </button>
          <button
            onClick={() => openModal('deduct')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <Minus className="w-4 h-4" />
            Deduct Points
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Issued */}
        <div
          className="card p-6 animate-card-pop hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Issued</p>
              <p className="text-2xl font-bold text-secondary-500">
                <AnimatedValue value={stats.total_issued} />
              </p>
            </div>
          </div>
        </div>

        {/* Total Redeemed */}
        <div
          className="card p-6 animate-card-pop hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Redeemed</p>
              <p className="text-2xl font-bold text-secondary-500">
                <AnimatedValue value={stats.total_redeemed} />
              </p>
            </div>
          </div>
        </div>

        {/* Active Balance */}
        <div
          className="card p-6 animate-card-pop hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Balance</p>
              <p className="text-2xl font-bold text-secondary-500">
                <AnimatedValue value={stats.active_balance} />
              </p>
            </div>
          </div>
          {/* Progress bar: issued vs redeemed */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Redeemed</span>
              <span>{progressPercent}% of issued</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Points Distribution Mini Chart */}
      {distributionData.length > 0 && (
        <div className="card p-6 mb-8 animate-card-pop" style={{ animationDelay: '300ms' }}>
          <h2 className="text-lg font-bold text-secondary-500 mb-1">Points Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Breakdown of ledger entry types</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DistributionTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4">
              {distributionData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-secondary-500 capitalize font-medium">{entry.name}</span>
                  <span className="text-xs text-gray-400">({entry.value.toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Ledger Entries */}
      <div className="card mb-8">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-secondary-500">Recent Ledger Entries</h2>
            <p className="text-xs text-gray-400">Last 50 transactions</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ledger..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="input-field pl-10 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">User</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-right">Amount</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Description</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    {ledgerSearch ? 'No matching entries found.' : 'No ledger entries yet.'}
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 transition-colors border-l-4 ${TYPE_BORDER_COLORS[entry.type] || 'border-l-gray-200'} ${index < 20 ? 'animate-slide-up-fade opacity-0' : ''}`}
                    style={index < 20 ? { animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' } : undefined}
                  >
                    <td className="p-4 text-sm">
                      {getUserDisplay(entry)}
                    </td>
                    <td className="p-4">
                      {getTypeBadge(entry.type)}
                    </td>
                    <td className="p-4 text-sm text-right">
                      <span className={`font-medium ${entry.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {entry.amount < 0 ? '' : '+'}{formatNumber(entry.amount)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 truncate max-w-[250px]">
                      {entry.description || '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redemptions */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-secondary-500">Recent Redemptions</h2>
          <p className="text-xs text-gray-400">Last 50 redemptions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">User</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Reward Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-right">Points Spent</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal ID</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No redemptions yet.
                  </td>
                </tr>
              ) : (
                redemptions.map((redemption, index) => (
                  <tr
                    key={redemption.id}
                    className={`hover:bg-gray-50 transition-colors ${index < 20 ? 'animate-slide-up-fade opacity-0' : ''}`}
                    style={index < 20 ? { animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' } : undefined}
                  >
                    <td className="p-4 text-sm">
                      {getUserDisplay(redemption)}
                    </td>
                    <td className="p-4 text-sm text-gray-500 capitalize">
                      {redemption.reward_type || '--'}
                    </td>
                    <td className="p-4 text-sm text-right">
                      <span className="font-medium text-red-500">
                        -{formatNumber(redemption.points_spent)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400 font-mono truncate max-w-[150px]">
                      {redemption.deal_id ? redemption.deal_id.slice(0, 8) + '...' : '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(redemption.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Deduct Points Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={pointsForm.action === 'deduct' ? 'Deduct SpontiPoints' : 'Add SpontiPoints'}
        size="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
          )}
          {formSuccess && (
            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg">{formSuccess}</div>
          )}

          {/* Action Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPointsForm((prev) => ({ ...prev, action: 'add' }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pointsForm.action === 'add'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add Points
              </button>
              <button
                onClick={() => setPointsForm((prev) => ({ ...prev, action: 'deduct' }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pointsForm.action === 'deduct'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Minus className="w-4 h-4" />
                Deduct Points
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={pointsForm.email}
                onChange={handleFormChange}
                className="input-field pl-10"
                placeholder="customer@example.com"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter the customer&apos;s email address</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Points Amount *</label>
            <input
              type="number"
              name="amount"
              value={pointsForm.amount}
              onChange={handleFormChange}
              className="input-field"
              placeholder="e.g. 500"
              min="1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Description</label>
            <textarea
              name="description"
              value={pointsForm.description}
              onChange={handleFormChange}
              rows={3}
              className="input-field"
              placeholder={pointsForm.action === 'deduct' ? 'Reason for deduction (optional)' : 'Reason for bonus (optional)'}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeModal}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={handleSubmit}
              disabled={formLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                pointsForm.action === 'deduct'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {pointsForm.action === 'deduct' ? 'Deduct Points' : 'Add Points'}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
