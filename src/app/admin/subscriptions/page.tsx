'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  CreditCard,
  Filter,
  Pencil,
  Trash2,
  Loader2,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/types/database';

interface SubscriptionWithVendor {
  id: string;
  vendor_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  vendor_name: string;
}

interface EditFormData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_end: string;
}

const PAGE_SIZE = 15;

function toLocalDatetimeValue(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function getStatusBadgeClass(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-50 text-green-600';
    case 'trialing':
      return 'bg-blue-50 text-blue-600';
    case 'past_due':
      return 'bg-yellow-50 text-yellow-600';
    case 'canceled':
      return 'bg-red-50 text-red-500';
    case 'incomplete':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

function getTierBadgeClass(tier: SubscriptionTier): string {
  switch (tier) {
    case 'starter':
      return 'bg-gray-100 text-gray-600';
    case 'pro':
      return 'bg-primary-50 text-primary-600';
    case 'business':
      return 'bg-accent-50 text-accent-600';
    case 'enterprise':
      return 'bg-blue-50 text-blue-600';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

export default function AdminSubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editItem, setEditItem] = useState<SubscriptionWithVendor | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    tier: 'starter',
    status: 'active',
    current_period_end: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete dialog state
  const [deleteItem, setDeleteItem] = useState<SubscriptionWithVendor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSubscriptions();
  }, [user, fetchSubscriptions]);

  // Client-side filtering
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesTier = tierFilter === 'all' || sub.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesTier && matchesStatus;
    });
  }, [subscriptions, tierFilter, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tierFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSubscriptions.length / PAGE_SIZE);
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSubscriptions.slice(start, start + PAGE_SIZE);
  }, [filteredSubscriptions, currentPage]);

  // --- Summary Stats ---
  const totalActive = subscriptions.filter((s) => s.status === 'active').length;
  const starterCount = subscriptions.filter((s) => s.tier === 'starter').length;
  const proCount = subscriptions.filter((s) => s.tier === 'pro').length;
  const businessCount = subscriptions.filter((s) => s.tier === 'business').length;
  const enterpriseCount = subscriptions.filter((s) => s.tier === 'enterprise').length;
  const pastDueCount = subscriptions.filter((s) => s.status === 'past_due').length;

  // --- Handlers ---

  const openEditModal = (sub: SubscriptionWithVendor) => {
    setEditItem(sub);
    setEditForm({
      tier: sub.tier,
      status: sub.status,
      current_period_end: toLocalDatetimeValue(sub.current_period_end),
    });
    setEditError('');
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setEditLoading(true);
    setEditError('');
    try {
      const payload: Record<string, unknown> = {
        tier: editForm.tier,
        status: editForm.status,
      };
      if (editForm.current_period_end) {
        payload.current_period_end = new Date(editForm.current_period_end).toISOString();
      }

      const res = await fetch(`/api/admin/subscriptions/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update subscription');
      }
      const data = await res.json();
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === editItem.id ? data.subscription : s))
      );
      setEditItem(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${deleteItem.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete subscription');
      }
      setSubscriptions((prev) => prev.filter((s) => s.id !== deleteItem.id));
      setDeleteItem(null);
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
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
          <CreditCard className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <p className="text-sm text-gray-500">
              {subscriptions.length} total subscription{subscriptions.length !== 1 ? 's' : ''} &middot; {totalActive} active
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500 font-medium">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{subscriptions.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500 font-medium">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalActive}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500 font-medium">Starter</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{starterCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <p className="text-xs text-gray-500 font-medium">Pro</p>
          </div>
          <p className="text-2xl font-bold text-primary-600">{proCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-accent-500" />
            <p className="text-xs text-gray-500 font-medium">Business</p>
          </div>
          <p className="text-2xl font-bold text-accent-600">{businessCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <p className="text-xs text-gray-500 font-medium">Enterprise / Past Due</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {enterpriseCount} <span className="text-sm font-normal text-yellow-500">/ {pastDueCount}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="input-field w-full sm:w-40"
            >
              <option value="all">All Tiers</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Tier</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Stripe ID</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Period Start</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Period End</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No subscriptions found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{sub.vendor_name}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getTierBadgeClass(sub.tier)}`}
                      >
                        {sub.tier}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusBadgeClass(sub.status)}`}
                      >
                        {sub.status === 'past_due' ? 'Past Due' : sub.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-gray-400 font-mono truncate max-w-[160px] block">
                        {sub.stripe_subscription_id || '--'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {sub.current_period_start
                        ? new Date(sub.current_period_start).toLocaleDateString()
                        : '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : '--'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Edit Subscription"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(sub)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Subscription"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredSubscriptions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Edit Subscription Modal */}
      <AdminModal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Edit Subscription: ${editItem?.vendor_name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{editError}</div>
          )}

          {/* Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select
              value={editForm.tier}
              onChange={(e) => setEditForm((f) => ({ ...f, tier: e.target.value as SubscriptionTier }))}
              className="input-field"
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as SubscriptionStatus }))}
              className="input-field"
            >
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>

          {/* Period End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Period End
            </label>
            <input
              type="datetime-local"
              value={editForm.current_period_end}
              onChange={(e) => setEditForm((f) => ({ ...f, current_period_end: e.target.value }))}
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              Extend or shorten the current billing period.
            </p>
          </div>

          {/* Stripe Info (read-only) */}
          {editItem?.stripe_subscription_id && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">Stripe Subscription ID</p>
              <p className="text-sm text-gray-600 font-mono break-all">
                {editItem.stripe_subscription_id}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setEditItem(null)}
              disabled={editLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={editLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteItem}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        title="Delete Subscription"
        message={`Are you sure you want to delete the subscription for "${deleteItem?.vendor_name}"? This will permanently remove the subscription record. This action cannot be undone.`}
        confirmLabel="Delete Subscription"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
