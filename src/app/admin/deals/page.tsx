'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatPercentage } from '@/lib/utils';
import {
  Tag,
  Search,
  Star,
  XCircle,
  Filter,
} from 'lucide-react';
import type { Deal, DealStatus, DealType } from '@/lib/types/database';

interface DealWithVendor extends Omit<Deal, 'vendor'> {
  vendor?: { business_name: string } | null;
}

export default function AdminDealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<DealWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchDeals() {
      const { data } = await supabase
        .from('deals')
        .select('*, vendor:vendors(business_name)')
        .order('created_at', { ascending: false });

      setDeals(data || []);
      setLoading(false);
    }

    fetchDeals();
  }, [user]);

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchesSearch =
        searchQuery === '' ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.vendor?.business_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || d.status === statusFilter;

      const matchesType =
        typeFilter === 'all' || d.deal_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deals, searchQuery, statusFilter, typeFilter]);

  const handleFeatureDeal = async (dealId: string) => {
    const supabase = createClient();
    await supabase.from('featured_deals').insert({ deal_id: dealId, position: 0 });
  };

  const handleExpireDeal = async (dealId: string) => {
    const supabase = createClient();
    await supabase.from('deals').update({ status: 'expired' as DealStatus }).eq('id', dealId);
    setDeals(prev =>
      prev.map(d => (d.id === dealId ? { ...d, status: 'expired' as DealStatus } : d))
    );
  };

  const getDealTypeLabel = (type: DealType) => {
    return type === 'sponti_coupon' ? 'Sponti' : 'Steady';
  };

  const getDealTypeBadgeClass = (type: DealType) => {
    return type === 'sponti_coupon'
      ? 'bg-primary-50 text-primary-600'
      : 'bg-accent-50 text-accent-600';
  };

  const getStatusBadgeClass = (status: DealStatus) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-600';
      case 'expired': return 'bg-gray-100 text-gray-500';
      case 'paused': return 'bg-yellow-50 text-yellow-600';
      case 'draft': return 'bg-blue-50 text-blue-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // Stats for the header
  const activeCount = deals.filter(d => d.status === 'active').length;
  const spontiCount = deals.filter(d => d.deal_type === 'sponti_coupon').length;
  const steadyCount = deals.filter(d => d.deal_type === 'regular').length;

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
          <Tag className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Deal Management</h1>
            <p className="text-sm text-gray-500">
              {deals.length} total deals &middot; {activeCount} active &middot; {spontiCount} Sponti &middot; {steadyCount} Steady
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by deal title or vendor..."
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
              className="input-field w-full sm:w-36"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field w-full sm:w-36"
          >
            <option value="all">All Types</option>
            <option value="sponti_coupon">Sponti</option>
            <option value="regular">Steady</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Title</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Discount</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No deals found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-secondary-500 truncate max-w-[200px]">
                        {deal.title}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {deal.vendor?.business_name || '--'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getDealTypeBadgeClass(deal.deal_type)}`}
                      >
                        {getDealTypeLabel(deal.deal_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusBadgeClass(deal.status)}`}
                      >
                        {deal.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {deal.claims_count}
                      {deal.max_claims && (
                        <span className="text-gray-400">/{deal.max_claims}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {formatPercentage(deal.discount_percentage)}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleFeatureDeal(deal.id)}
                          className="text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Feature Deal"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        {deal.status === 'active' && (
                          <button
                            onClick={() => handleExpireDeal(deal.id)}
                            className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                            title="Expire Deal"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
