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
  Eye,
  Pencil,
  Copy,
  KeyRound,
  X,
  Save,
} from 'lucide-react';

type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'pending';

interface ClaimRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  deal_title: string;
  deal_type: string;
  deal_id: string;
  vendor_name: string;
  status: ClaimStatus;
  deposit_confirmed: boolean;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string;
  qr_code: string | null;
  qr_code_url: string | null;
  redemption_code: string | null;
  session_token: string | null;
  redeemed_by_vendor: string | null;
  redeemed_by_name: string | null;
  redeemed_by_id: string | null;
  scanned_at: string | null;
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

  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Status summary counts
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

  // View Code dialog
  const [codeTarget, setCodeTarget] = useState<ClaimRow | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ClaimRow | null>(null);
  const [editForm, setEditForm] = useState({
    deposit_confirmed: false,
    redeemed: false,
    redeemed_at: '',
    expires_at: '',
  });
  const [editLoading, setEditLoading] = useState(false);

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
      // Silently fail
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

  const handleGenerateCodes = async (claim: ClaimRow) => {
    setActionLoading(claim.id);
    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_codes' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate codes');
      }
      showToast('QR code & redemption code generated', 'success');
      fetchClaims();
      fetchStatusCounts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate codes', 'error');
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

  // View Code
  const openCodeDialog = async (claim: ClaimRow) => {
    setCodeTarget(claim);
    setQrDataUrl(null);
    setCodeCopied(false);

    if (claim.qr_code) {
      setCodeLoading(true);
      try {
        const res = await fetch(`/api/admin/claims/qr-code?claim_id=${claim.id}`);
        if (res.ok) {
          const data = await res.json();
          setQrDataUrl(data.qr_data_url);
        }
      } catch {
        // QR image failed to load — still show codes
      } finally {
        setCodeLoading(false);
      }
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Edit
  const openEditDialog = (claim: ClaimRow) => {
    setEditTarget(claim);
    setEditForm({
      deposit_confirmed: claim.deposit_confirmed,
      redeemed: claim.status === 'redeemed',
      redeemed_at: claim.redeemed_at ? claim.redeemed_at.split('T')[0] : '',
      expires_at: claim.expires_at.split('T')[0],
    });
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const updateBody: Record<string, unknown> = {
        action: 'edit',
        deposit_confirmed: editForm.deposit_confirmed,
        redeemed: editForm.redeemed,
        expires_at: new Date(editForm.expires_at).toISOString(),
      };
      if (editForm.redeemed && editForm.redeemed_at) {
        updateBody.redeemed_at = new Date(editForm.redeemed_at).toISOString();
      } else if (!editForm.redeemed) {
        updateBody.redeemed_at = null;
      }

      const res = await fetch(`/api/admin/claims/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update claim');
      }
      showToast('Claim updated successfully', 'success');
      setEditTarget(null);
      fetchClaims();
      fetchStatusCounts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update claim', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openExtendDialog = (claim: ClaimRow) => {
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
                <th className="p-4 font-semibold text-sm text-gray-500">Code</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Redeemed By</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Claimed</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Expires</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading claims...
                    </div>
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No claims found matching your filters.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-medium text-secondary-500">{claim.customer_name}</span>
                        {claim.customer_email && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{claim.customer_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-secondary-500 truncate max-w-[180px]">
                        {claim.deal_title}
                      </p>
                      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                        claim.deal_type === 'sponti_coupon'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-teal-50 text-teal-600'
                      }`}>
                        {claim.deal_type === 'sponti_coupon' ? 'Sponti Deal' : 'Steady Deal'}
                      </span>
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
                    <td className="p-4">
                      {claim.redemption_code ? (
                        <button
                          onClick={() => openCodeDialog(claim)}
                          className="inline-flex items-center gap-1.5 text-xs font-mono bg-gray-100 text-secondary-500 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          {claim.redemption_code}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerateCodes(claim)}
                          disabled={actionLoading === claim.id}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-500 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                          title="Generate QR & redemption code"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Generate
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      {claim.status === 'redeemed' && claim.redeemed_by_name ? (
                        <div>
                          <p className="text-sm font-medium text-secondary-500">{claim.redeemed_by_name}</p>
                          {claim.scanned_at && (
                            <p className="text-xs text-gray-400">
                              {new Date(claim.scanned_at).toLocaleDateString()}{' '}
                              {new Date(claim.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      ) : claim.status === 'redeemed' ? (
                        <span className="text-xs text-gray-400">Admin / Unknown</span>
                      ) : (
                        <span className="text-xs text-gray-300">--</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500">
                        {new Date(claim.expires_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(claim.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {/* View codes */}
                        {claim.qr_code && (
                          <button
                            onClick={() => openCodeDialog(claim)}
                            className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                            title="View QR Code"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit claim */}
                        <button
                          onClick={() => openEditDialog(claim)}
                          className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                          title="Edit Claim"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

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

                        {/* Pending claims: Confirm Deposit + Generate Codes */}
                        {claim.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirmDeposit(claim)}
                              disabled={actionLoading === claim.id}
                              className="text-green-500 hover:bg-green-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                              title="Confirm Deposit"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            {!claim.qr_code && (
                              <button
                                onClick={() => handleGenerateCodes(claim)}
                                disabled={actionLoading === claim.id}
                                className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                                title="Generate QR & Code"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}
                          </>
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

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* ==================== View Code Modal ==================== */}
      {codeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setCodeTarget(null); setQrDataUrl(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-secondary-500 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary-500" />
                  Claim Codes
                </h3>
                <button
                  onClick={() => { setCodeTarget(null); setQrDataUrl(null); }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="text-center mb-5">
                <p className="text-sm text-gray-500 mb-1">{codeTarget.customer_name}</p>
                <p className="text-sm font-medium text-secondary-500">{codeTarget.deal_title}</p>
              </div>

              {/* QR Code Image */}
              <div className="flex justify-center mb-5">
                {codeLoading ? (
                  <div className="w-48 h-48 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-gray-300" />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-48 h-48 rounded-xl border border-gray-200"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                    No QR code available
                  </div>
                )}
              </div>

              {/* 6-Digit Code */}
              {codeTarget.redemption_code && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-1 text-center">6-Digit Redemption Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold tracking-[0.3em] text-secondary-500">
                      {codeTarget.redemption_code}
                    </span>
                    <button
                      onClick={() => copyCode(codeTarget.redemption_code!)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Copy code"
                    >
                      <Copy className={`w-4 h-4 ${codeCopied ? 'text-green-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  {codeCopied && (
                    <p className="text-xs text-green-500 text-center mt-1">Copied!</p>
                  )}
                </div>
              )}

              {/* QR URL */}
              {codeTarget.qr_code_url && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Redemption URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-600 truncate flex-1">{codeTarget.qr_code_url}</code>
                    <button
                      onClick={() => copyCode(codeTarget.qr_code_url!)}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* No codes at all */}
              {!codeTarget.redemption_code && !codeTarget.qr_code && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-3">This claim has no codes yet.</p>
                  <button
                    onClick={() => {
                      setCodeTarget(null);
                      handleGenerateCodes(codeTarget);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                    Generate Codes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== Edit Claim Modal ==================== */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-secondary-500 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary-500" />
                  Edit Claim
                </h3>
                <button
                  onClick={() => setEditTarget(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Claim info summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-medium text-secondary-500">{editTarget.customer_name}</p>
                    {editTarget.customer_email && (
                      <p className="text-xs text-gray-400">{editTarget.customer_email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deal</p>
                    <p className="font-medium text-secondary-500 truncate">{editTarget.deal_title}</p>
                    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                      editTarget.deal_type === 'sponti_coupon'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-teal-50 text-teal-600'
                    }`}>
                      {editTarget.deal_type === 'sponti_coupon' ? 'Sponti Deal' : 'Steady Deal'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Vendor</p>
                    <p className="text-gray-600">{editTarget.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Claim ID</p>
                    <p className="font-mono text-xs text-gray-500 truncate">{editTarget.id}</p>
                  </div>
                  {editTarget.redeemed_by_name && (
                    <div>
                      <p className="text-xs text-gray-400">Redeemed By</p>
                      <p className="font-medium text-green-600">{editTarget.redeemed_by_name}</p>
                    </div>
                  )}
                  {editTarget.scanned_at && (
                    <div>
                      <p className="text-xs text-gray-400">Scanned At</p>
                      <p className="text-gray-600">
                        {new Date(editTarget.scanned_at).toLocaleDateString()}{' '}
                        {new Date(editTarget.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                {/* Deposit Confirmed */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Deposit Confirmed</label>
                  <button
                    onClick={() => setEditForm((f) => ({ ...f, deposit_confirmed: !f.deposit_confirmed }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.deposit_confirmed ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editForm.deposit_confirmed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Redeemed */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Redeemed</label>
                  <button
                    onClick={() => setEditForm((f) => ({
                      ...f,
                      redeemed: !f.redeemed,
                      redeemed_at: !f.redeemed ? new Date().toISOString().split('T')[0] : '',
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.redeemed ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editForm.redeemed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Redeemed At (only visible if redeemed) */}
                {editForm.redeemed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Redeemed At</label>
                    <input
                      type="date"
                      value={editForm.redeemed_at}
                      onChange={(e) => setEditForm((f) => ({ ...f, redeemed_at: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                )}

                {/* Expires At */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                  <input
                    type="date"
                    value={editForm.expires_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, expires_at: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditTarget(null)}
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
