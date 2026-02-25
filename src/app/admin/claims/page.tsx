'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import {
  QrCode,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  CalendarPlus,
  RefreshCw,
} from 'lucide-react';

type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'pending';

interface ClaimRow {
  id: string;
  customer_name: string;
  deal_title: string;
  deal_id: string;
  vendor_name: string;
  status: ClaimStatus;
  deposit_confirmed: boolean;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string;
}

const PAGE_SIZE = 20;

export default function AdminClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Action loading state (tracks which claim ID is being acted on)
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Status summary counts (fetched from unfiltered total)
  const [statusCounts, setStatusCounts] = useState({
    active: 0,
    redeemed: 0,
    expired: 0,
    pending: 0,
  });

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<ClaimRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Extend expiry dialog
  const [extendTarget, setExtendTarget] = useState<ClaimRow | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [extendLoading, setExtendLoading] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
      });
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/claims?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch claims');

      const data = await res.json();
      setClaims(data.claims || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Failed to load claims', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, showToast]);

  // Fetch status counts (unfiltered) for the summary cards
  const fetchStatusCounts = useCallback(async () => {
    try {
      const statuses: ClaimStatus[] = ['active', 'redeemed', 'expired', 'pending'];
      const counts: Record<string, number> = {};

      await Promise.all(
        statuses.map(async (s) => {
          const res = await fetch(`/api/admin/claims?status=${s}&page=1&pageSize=1`);
          if (res.ok) {
            const data = await res.json();
            counts[s] = data.total || 0;
          }
        })
      );

      setStatusCounts({
        active: counts.active || 0,
        redeemed: counts.redeemed || 0,
        expired: counts.expired || 0,
        pending: counts.pending || 0,
      });
    } catch {
      // Silently fail — cards will show 0
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchClaims();
  }, [user, fetchClaims]);

  useEffect(() => {
    if (!user) return;
    fetchStatusCounts();
  }, [user, fetchStatusCounts]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // ==================== Action Handlers ====================

  const handleRedeem = async (claim: ClaimRow) => {
    setActionLoading(claim.id);
    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to redeem claim');
      }
      showToast('Claim redeemed successfully', 'success');
      fetchClaims();
      fetchStatusCounts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to redeem claim', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (claim: ClaimRow) => {
    setActionLoading(claim.id);
    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel claim');
      }
      showToast('Claim cancelled successfully', 'success');
      fetchClaims();
      fetchStatusCounts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel claim', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDeposit = async (claim: ClaimRow) => {
    setActionLoading(claim.id);
    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_deposit' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm deposit');
      }
      showToast('Deposit confirmed successfully', 'success');
      fetchClaims();
      fetchStatusCounts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to confirm deposit', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendSubmit = async () => {
    if (!extendTarget || !extendDate) return;
    setExtendLoading(true);
    try {
      const res = await fetch(`/api/admin/claims/${extendTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', expires_at: new Date(extendDate).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to extend claim');
      }
      showToast('Claim expiry extended successfully', 'success');
      setExtendTarget(null);
      setExtendDate('');
      fetchClaims();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to extend claim', 'error');
    } finally {
      setExtendLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/claims/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete claim');
      }
      showToast('Claim deleted successfully', 'success');
      setDeleteTarget(null);
      fetchClaims();
      fetchStatusCounts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete claim', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openExtendDialog = (claim: ClaimRow) => {
    // Default extend date: 7 days from current expiry or from now if already expired
    const baseDate = new Date(claim.expires_at) > new Date() ? new Date(claim.expires_at) : new Date();
    const defaultDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    setExtendDate(defaultDate.toISOString().split('T')[0]);
    setExtendTarget(claim);
  };

  // ==================== Helpers ====================

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case 'active': return <Clock className="w-3 h-3" />;
      case 'redeemed': return <CheckCircle className="w-3 h-3" />;
      case 'expired': return <XCircle className="w-3 h-3" />;
      case 'pending': return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusBadgeClass = (status: ClaimStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-50 text-blue-600';
      case 'redeemed': return 'bg-green-50 text-green-600';
      case 'expired': return 'bg-gray-100 text-gray-500';
      case 'pending': return 'bg-yellow-50 text-yellow-600';
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalAll = statusCounts.active + statusCounts.redeemed + statusCounts.expired + statusCounts.pending;

  if (loading && claims.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <QrCode className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Claims Management</h1>
            <p className="text-sm text-gray-500">{totalAll} total claims</p>
          </div>
        </div>
        <button
          onClick={() => { fetchClaims(); fetchStatusCounts(); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', count: statusCounts.active, color: 'text-blue-500', bg: 'bg-blue-50', icon: <Clock className="w-5 h-5" /> },
          { label: 'Redeemed', count: statusCounts.redeemed, color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle className="w-5 h-5" /> },
          { label: 'Expired', count: statusCounts.expired, color: 'text-gray-500', bg: 'bg-gray-100', icon: <XCircle className="w-5 h-5" /> },
          { label: 'Pending', count: statusCounts.pending, color: 'text-yellow-500', bg: 'bg-yellow-50', icon: <AlertCircle className="w-5 h-5" /> },
        ].map(({ label, count, color, bg, icon }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(statusFilter === label.toLowerCase() ? 'all' : label.toLowerCase())}
            className={`card p-4 text-left transition-all hover:shadow-lg ${
              statusFilter === label.toLowerCase() ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-2`}>
              {icon}
            </div>
            <p className="text-2xl font-bold text-secondary-500">{count}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, deal, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Customer</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Claimed</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Redeemed</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Expires</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading claims...
                    </div>
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No claims found matching your filters.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-secondary-500">{claim.customer_name}</span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-secondary-500 truncate max-w-[180px]">
                        {claim.deal_title}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{claim.vendor_name}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeClass(claim.status)}`}
                      >
                        {getStatusIcon(claim.status)}
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {claim.redeemed_at
                        ? new Date(claim.redeemed_at).toLocaleDateString()
                        : '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(claim.expires_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {/* Active claims: Redeem, Cancel, Extend */}
                        {claim.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleRedeem(claim)}
                              disabled={actionLoading === claim.id}
                              className="text-green-500 hover:bg-green-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                              title="Redeem"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancel(claim)}
                              disabled={actionLoading === claim.id}
                              className="text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openExtendDialog(claim)}
                              disabled={actionLoading === claim.id}
                              className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                              title="Extend Expiry"
                            >
                              <CalendarPlus className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Pending claims: Confirm Deposit */}
                        {claim.status === 'pending' && (
                          <button
                            onClick={() => handleConfirmDeposit(claim)}
                            disabled={actionLoading === claim.id}
                            className="text-green-500 hover:bg-green-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                            title="Confirm Deposit"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Expired claims: Extend */}
                        {claim.status === 'expired' && (
                          <button
                            onClick={() => openExtendDialog(claim)}
                            disabled={actionLoading === claim.id}
                            className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                            title="Extend Expiry"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        )}

                        {/* All claims: Delete */}
                        <button
                          onClick={() => setDeleteTarget(claim)}
                          disabled={actionLoading === claim.id}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
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

        {/* Pagination */}
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Claim"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete the claim by "${deleteTarget.customer_name}" for "${deleteTarget.deal_title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Claim"
        variant="danger"
        loading={deleteLoading}
      />

      {/* Extend Expiry Dialog */}
      {extendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setExtendTarget(null); setExtendDate(''); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50">
                  <CalendarPlus className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-secondary-500">Extend Expiry</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Extend the claim by <strong>{extendTarget.customer_name}</strong> for &quot;{extendTarget.deal_title}&quot;.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Current expiry: {new Date(extendTarget.expires_at).toLocaleDateString()}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Expiry Date</label>
              <input
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field w-full mb-6"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => { setExtendTarget(null); setExtendDate(''); }}
                  disabled={extendLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtendSubmit}
                  disabled={extendLoading || !extendDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {extendLoading ? 'Extending...' : 'Extend Expiry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
