'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  MapPin,
  Search,
  RefreshCw,
  Building2,
} from 'lucide-react';

interface LocationRow {
  id: string;
  vendor_id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
  created_at: string;
  vendor_name: string;
}

export default function AdminLocationsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/locations?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch locations');

      const data = await res.json();
      setLocations(data.locations || []);
    } catch {
      showToast('Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchLocations();
  }, [user, role, fetchLocations]);

  // Stats
  const stats = useMemo(() => {
    const totalLocations = locations.length;
    const primaryLocations = locations.filter((l) => l.is_primary).length;
    const uniqueCities = new Set(locations.map((l) => l.city).filter(Boolean)).size;
    const uniqueStates = new Set(locations.map((l) => l.state).filter(Boolean)).size;
    return { totalLocations, primaryLocations, uniqueCities, uniqueStates };
  }, [locations]);

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
          <MapPin className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
            <p className="text-sm text-gray-500">{locations.length} total locations</p>
          </div>
        </div>
        <button
          onClick={fetchLocations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.totalLocations}</p>
          <p className="text-xs text-gray-500">Total Locations</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-green-600">{stats.primaryLocations}</p>
          <p className="text-xs text-gray-500">Primary Locations</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-blue-500">{stats.uniqueCities}</p>
          <p className="text-xs text-gray-500">Unique Cities</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-blue-500">{stats.uniqueStates}</p>
          <p className="text-xs text-gray-500">Unique States</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, vendor, address, city, or state..."
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
                <th className="p-4 font-semibold text-sm text-gray-500">Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Address</th>
                <th className="p-4 font-semibold text-sm text-gray-500">City</th>
                <th className="p-4 font-semibold text-sm text-gray-500">State</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Primary</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading locations...
                    </div>
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No locations found</p>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-50 rounded-xl p-2.5">
                          <MapPin className="w-4 h-4 text-primary-500" />
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {loc.name || 'Unnamed Location'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-gray-900">
                        {loc.vendor_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600">{loc.address || '--'}</p>
                      {loc.zip_code && (
                        <p className="text-xs text-gray-400">{loc.zip_code}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600">{loc.city || '--'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600">{loc.state || '--'}</span>
                    </td>
                    <td className="p-4">
                      {loc.is_primary ? (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                          Primary
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">--</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500">
                        {new Date(loc.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(loc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
