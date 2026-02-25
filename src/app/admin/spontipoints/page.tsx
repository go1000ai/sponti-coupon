'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Wallet,
  Gift,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Star,
  Wrench,
} from 'lucide-react';

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

interface IssueFormData {
  user_id: string;
  amount: string;
  description: string;
}

export default function AdminSpontiPointsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PointsStats>({ total_issued: 0, total_redeemed: 0, active_balance: 0 });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  // Issue modal state
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueFormData>({ user_id: '', amount: '', description: '' });
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

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
    return entry.user.full_name || entry.user.email || '--';
  };

  // --- Issue Handlers ---

  const openIssueModal = () => {
    setIssueForm({ user_id: '', amount: '', description: '' });
    setIssueError('');
    setIssueSuccess('');
    setIsIssueOpen(true);
  };

  const closeIssueModal = () => {
    setIsIssueOpen(false);
    setIssueError('');
    setIssueSuccess('');
  };

  const handleIssueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setIssueForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssue = async () => {
    if (!issueForm.user_id.trim()) {
      setIssueError('User ID is required.');
      return;
    }
    if (!issueForm.amount || Number(issueForm.amount) <= 0) {
      setIssueError('Amount must be a positive number.');
      return;
    }
    setIssueLoading(true);
    setIssueError('');
    setIssueSuccess('');
    try {
      const res = await fetch('/api/admin/spontipoints/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: issueForm.user_id,
          amount: Number(issueForm.amount),
          description: issueForm.description || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to issue points');
      }
      const data = await res.json();
      const userName = data.user?.full_name || data.user?.email || 'user';
      setIssueSuccess(`Successfully issued ${formatNumber(Number(issueForm.amount))} bonus points to ${userName}.`);
      // Refresh data
      fetchData();
      // Clear form but keep modal open to show success
      setIssueForm({ user_id: '', amount: '', description: '' });
    } catch (err: unknown) {
      setIssueError(err instanceof Error ? err.message : 'Failed to issue points');
    } finally {
      setIssueLoading(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">SpontiPoints</h1>
            <p className="text-sm text-gray-500">Platform-wide points management</p>
          </div>
        </div>
        <button
          onClick={openIssueModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <Gift className="w-4 h-4" />
          Issue Bonus Points
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Issued</p>
              <p className="text-2xl font-bold text-secondary-500">{formatNumber(stats.total_issued)}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Redeemed</p>
              <p className="text-2xl font-bold text-secondary-500">{formatNumber(stats.total_redeemed)}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Balance</p>
              <p className="text-2xl font-bold text-secondary-500">{formatNumber(stats.active_balance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ledger Entries */}
      <div className="card mb-8">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-secondary-500">Recent Ledger Entries</h2>
          <p className="text-xs text-gray-400">Last 50 transactions</p>
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
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No ledger entries yet.
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-secondary-500 font-medium">
                      {getUserDisplay(entry)}
                    </td>
                    <td className="p-4">
                      {getTypeBadge(entry.type)}
                    </td>
                    <td className="p-4 text-sm text-right">
                      <span className={`font-medium ${entry.type === 'redeemed' ? 'text-red-500' : 'text-green-600'}`}>
                        {entry.type === 'redeemed' ? '-' : '+'}{formatNumber(Math.abs(entry.amount))}
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
                redemptions.map((redemption) => (
                  <tr key={redemption.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-secondary-500 font-medium">
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

      {/* Issue Bonus Points Modal */}
      <AdminModal
        isOpen={isIssueOpen}
        onClose={closeIssueModal}
        title="Issue Bonus Points"
        size="md"
      >
        <div className="space-y-4">
          {issueError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{issueError}</div>
          )}
          {issueSuccess && (
            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg">{issueSuccess}</div>
          )}

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
            <input
              type="text"
              name="user_id"
              value={issueForm.user_id}
              onChange={handleIssueChange}
              className="input-field"
              placeholder="UUID of the customer"
            />
            <p className="text-xs text-gray-400 mt-1">The UUID of the customer to receive points</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              name="amount"
              value={issueForm.amount}
              onChange={handleIssueChange}
              className="input-field"
              placeholder="e.g. 500"
              min="1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={issueForm.description}
              onChange={handleIssueChange}
              rows={3}
              className="input-field"
              placeholder="Reason for the bonus (optional)"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeIssueModal}
              disabled={issueLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={handleIssue}
              disabled={issueLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {issueLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Issue Points
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
