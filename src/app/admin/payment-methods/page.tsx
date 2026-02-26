'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Wallet,
  Search,
  Filter,
  RefreshCw,
  Star,
  Loader2,
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  vendor_id: string;
  method_type: string;
  is_primary: boolean;
  account_identifier: string | null;
  created_at: string;
  updated_at: string | null;
  vendor_name: string;
}

const METHOD_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  square: '#006AFF',
  paypal: '#003087',
  venmo: '#3D95CE',
  zelle: '#6D1ED4',
  cashapp: '#00D632',
};

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  square: 'Square',
  paypal: 'PayPal',
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'Cash App',
};

const PAGE_SIZE = 15;

export default function AdminPaymentMethodsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter !== 'all') params.set('method_type', typeFilter);

      const res = await fetch(`/api/admin/payment-methods?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch payment methods');

      const data = await res.json();
      setMethods(data.payment_methods || []);
    } catch {
      showToast('Failed to load payment methods', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchMethods();
  }, [user, role, fetchMethods]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(methods.length / PAGE_SIZE);
  const paginatedMethods = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return methods.slice(start, start + PAGE_SIZE);
  }, [methods, currentPage]);

  // Stat cards
  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    for (const m of methods) {
      typeCounts[m.method_type] = (typeCounts[m.method_type] || 0) + 1;
    }
    return {
      total: methods.length,
      primary: methods.filter((m) => m.is_primary).length,
      typeCounts,
    };
  }, [methods]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    );
  }

  // Auth guard
  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
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
          <Wallet className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Payment Methods</h1>
            <p className="text-sm text-gray-500">{methods.length} total payment methods</p>
          </div>
        </div>
        <button
          onClick={fetchMethods}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-secondary-500">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Methods</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-500">{stats.primary}</p>
          <p className="text-xs text-gray-500">Primary Methods</p>
        </div>
        {Object.entries(stats.typeCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([type, count]) => (
            <div key={type} className="card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: METHOD_COLORS[type] || '#6B7280' }}>
                {count}
              </p>
              <p className="text-xs text-gray-500">{METHOD_LABELS[type] || type}</p>
            </div>
          ))}
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vendor, method type, or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field w-full sm:w-44"
            >
              <option value="all">All Types</option>
              <option value="stripe">Stripe</option>
              <option value="square">Square</option>
              <option value="paypal">PayPal</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
              <option value="cashapp">Cash App</option>
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
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Method Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Primary</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Account</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading payment methods...
                    </div>
                  </td>
                </tr>
              ) : paginatedMethods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No payment methods found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Adjust your filters or wait for vendors to add payment methods.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedMethods.map((method) => (
                  <tr key={method.id} className="hover:bg-gray-50 transition-colors">
                    {/* Vendor */}
                    <td className="p-4">
                      <span className="font-medium text-secondary-500">{method.vendor_name}</span>
                    </td>

                    {/* Method Type Badge */}
                    <td className="p-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                        style={{
                          backgroundColor: METHOD_COLORS[method.method_type] || '#6B7280',
                        }}
                      >
                        {METHOD_LABELS[method.method_type] || method.method_type}
                      </span>
                    </td>

                    {/* Primary */}
                    <td className="p-4">
                      {method.is_primary ? (
                        <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-primary-500" /> PRIMARY
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">--</span>
                      )}
                    </td>

                    {/* Account */}
                    <td className="p-4">
                      <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                        {method.account_identifier || '--'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="p-4">
                      <p className="text-sm text-gray-500">
                        {new Date(method.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(method.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
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
          totalItems={methods.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
