'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import {
  Star,
  Loader2,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Search,
  GripVertical,
  Tag,
  Users,
} from 'lucide-react';

// --- Types ---

interface FeaturedDeal {
  id: string;
  deal_id: string;
  position: number;
  created_at: string;
  deal_title: string;
  vendor_name: string;
  claims_count: number;
}

interface DealOption {
  id: string;
  title: string;
  deal_type: string;
  vendor_name: string;
}

// --- Skeleton ---

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-8 mx-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-48" /><div className="h-3 bg-gray-100 rounded w-24 mt-1" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-16 mx-auto" /></td>
      <td className="p-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="p-4"><div className="h-6 bg-gray-100 rounded w-20 mx-auto" /></td>
    </tr>
  );
}

export default function AdminFeaturedPage() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<FeaturedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add deal modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [allDeals, setAllDeals] = useState<DealOption[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealSearch, setDealSearch] = useState('');
  const [addingDealId, setAddingDealId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FeaturedDeal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/featured');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeatured(data.featured || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchFeatured();
  }, [user, fetchFeatured]);

  // --- Fetch all deals for the add modal ---
  const fetchAllDeals = async () => {
    setDealsLoading(true);
    try {
      const res = await fetch('/api/admin/deals');
      if (!res.ok) throw new Error('Failed to fetch deals');
      const data = await res.json();
      const deals = (data.deals || []).map((d: Record<string, unknown>) => {
        const vendor = d.vendor as { business_name: string } | null;
        return {
          id: d.id as string,
          title: d.title as string,
          deal_type: (d.deal_type as string) || 'regular',
          vendor_name: vendor?.business_name || '--',
        };
      });
      setAllDeals(deals);
    } catch {
      // Silent fail
    } finally {
      setDealsLoading(false);
    }
  };

  const openAddModal = () => {
    setDealSearch('');
    setIsAddOpen(true);
    fetchAllDeals();
  };

  // --- Add deal to featured ---
  const handleAddDeal = async (dealId: string) => {
    setAddingDealId(dealId);
    try {
      const nextPosition = featured.length > 0
        ? Math.max(...featured.map((f) => f.position)) + 1
        : 1;

      const res = await fetch('/api/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId, position: nextPosition }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');

      await fetchFeatured();
      setIsAddOpen(false);
    } catch {
      // Could show error
    } finally {
      setAddingDealId(null);
    }
  };

  // --- Move position up/down ---
  const handleMove = async (item: FeaturedDeal, direction: 'up' | 'down') => {
    const currentIndex = featured.findIndex((f) => f.id === item.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= featured.length) return;

    const swapItem = featured[swapIndex];
    setActionLoading(item.id);

    try {
      await Promise.all([
        fetch(`/api/admin/featured/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: swapItem.position }),
        }),
        fetch(`/api/admin/featured/${swapItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: item.position }),
        }),
      ]);
      await fetchFeatured();
    } catch {
      // Silent fail
    } finally {
      setActionLoading(null);
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/featured/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchFeatured();
      setDeleteTarget(null);
    } catch {
      // Silent fail
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Filter deals in add modal (exclude already featured) ---
  const featuredDealIds = new Set(featured.map((f) => f.deal_id));
  const filteredDeals = allDeals.filter((d) => {
    if (featuredDealIds.has(d.id)) return false;
    if (!dealSearch) return true;
    const q = dealSearch.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.vendor_name.toLowerCase().includes(q);
  });

  // --- Render ---

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div>
            <div className="h-6 bg-gray-200 rounded w-40 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-56" />
          </div>
        </div>
        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-4 mx-auto" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-12" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-14" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-12" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-10" /></th>
                <th className="p-4"><div className="h-3 bg-gray-100 rounded w-14" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
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
          <Star className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Featured Deals</h1>
            <p className="text-sm text-gray-500">Manage which deals appear in the featured section on the homepage</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Featured Deal
        </button>
      </div>

      {/* Featured Deals Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Current Featured Deals</h2>
          <p className="text-xs text-gray-400">{featured.length} deal{featured.length !== 1 ? 's' : ''} featured &middot; Use arrows to reorder</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500 text-center w-16">#</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Added</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {featured.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">No featured deals yet.</p>
                    <p className="text-sm text-gray-300 mt-1">Click &ldquo;Add Featured Deal&rdquo; to get started.</p>
                  </td>
                </tr>
              ) : (
                featured.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${index < 10 ? 'animate-slide-up-fade opacity-0' : ''}`}
                    style={index < 10 ? { animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' } : undefined}
                  >
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <GripVertical className="w-4 h-4 text-gray-300" />
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-primary-50 text-primary-600 rounded-full text-sm font-bold">
                          {item.position}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{item.deal_title}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{item.vendor_name}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {item.claims_count}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMove(item, 'up')}
                          disabled={index === 0 || actionLoading === item.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMove(item, 'down')}
                          disabled={index === featured.length - 1 || actionLoading === item.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove from featured"
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
      </div>

      {/* Add Featured Deal Modal */}
      <AdminModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Featured Deal"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals by name or vendor..."
              value={dealSearch}
              onChange={(e) => setDealSearch(e.target.value)}
              className="input-field pl-10 text-sm"
            />
          </div>

          {dealsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              {dealSearch ? 'No matching deals found.' : 'All deals are already featured.'}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
              {filteredDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{deal.title}</p>
                      <p className="text-xs text-gray-400">{deal.vendor_name}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      deal.deal_type === 'sponti_coupon'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-teal-50 text-teal-600'
                    }`}>
                      {deal.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddDeal(deal.id)}
                    disabled={addingDealId === deal.id}
                    className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    {addingDealId === deal.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Feature
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Featured Deal"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to remove <strong>{deleteTarget?.deal_title}</strong> from featured deals?
          </p>
          <p className="text-xs text-gray-400">This will not delete the deal itself, just remove it from the featured section.</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
