'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Key,
  Search,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

interface ApiKeyRow {
  id: string;
  vendor_id: string;
  key_name: string | null;
  api_key_masked: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  vendor_name: string;
}

export default function AdminApiKeysPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/api-keys?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch API keys');

      const data = await res.json();
      setApiKeys(data.api_keys || []);
    } catch {
      showToast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchApiKeys();
  }, [user, role, fetchApiKeys]);

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: revokeTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke key');
      }
      showToast('API key revoked successfully', 'success');
      setRevokeTarget(null);
      fetchApiKeys();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to revoke key', 'error');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Stats
  const totalKeys = apiKeys.length;
  const activeKeys = apiKeys.filter((k) => k.is_active).length;
  const revokedKeys = apiKeys.filter((k) => !k.is_active).length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

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
          <Key className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">API Keys</h1>
            <p className="text-sm text-gray-500">{totalKeys} total keys</p>
          </div>
        </div>
        <button
          onClick={fetchApiKeys}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-secondary-500">{totalKeys}</p>
          <p className="text-xs text-gray-500">Total Keys</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeKeys}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{revokedKeys}</p>
          <p className="text-xs text-gray-500">Revoked</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vendor or key name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Key Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">API Key</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Last Used</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading API keys...
                    </div>
                  </td>
                </tr>
              ) : apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No API keys found.
                  </td>
                </tr>
              ) : (
                apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-secondary-500">{apiKey.vendor_name}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600">{apiKey.key_name || '--'}</span>
                    </td>
                    <td className="p-4">
                      <code className="text-sm text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded">
                        {apiKey.api_key_masked}
                      </code>
                    </td>
                    <td className="p-4">
                      {apiKey.is_active ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500">
                        {new Date(apiKey.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(apiKey.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-500">
                        {apiKey.last_used_at
                          ? new Date(apiKey.last_used_at).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    <td className="p-4">
                      {apiKey.is_active ? (
                        <button
                          onClick={() => setRevokeTarget(apiKey)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">--</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Confirmation */}
      <AdminConfirmDialog
        isOpen={!!revokeTarget}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
        title="Revoke API Key"
        message={
          revokeTarget
            ? `Are you sure you want to revoke "${revokeTarget.key_name || 'this key'}" for "${revokeTarget.vendor_name}"? Any integrations using this key will stop working immediately.`
            : ''
        }
        confirmLabel="Revoke Key"
        variant="danger"
        loading={revokeLoading}
      />
    </div>
  );
}
