'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Star,
  Search,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';

interface FeaturedDeal {
  id: string;
  deal_id: string;
  position: number;
  created_at: string;
  deal_title: string;
  vendor_name: string;
  claims_count: number;
}

interface DealSearchResult {
  id: string;
  title: string;
  vendor?: { business_name: string } | null;
  status: string;
}

const PAGE_SIZE = 15;

export default function AdminFeaturedPage() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<FeaturedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dealSearch, setDealSearch] = useState('');
  const [searchResults, setSearchResults] = useState<DealSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [addPosition, setAddPosition] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit modal state
  const [editItem, setEditItem] = useState<FeaturedDeal | null>(null);
  const [editPosition, setEditPosition] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete dialog state
  const [deleteItem, setDeleteItem] = useState<FeaturedDeal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/featured');
      if (!res.ok) throw new Error('Failed to fetch featured deals');
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

  // Search for deals to add
  const searchDeals = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/deals?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      // Filter out deals already featured
      const featuredDealIds = new Set(featured.map((f) => f.deal_id));
      const results = (data.deals || []).filter(
        (d: DealSearchResult) => !featuredDealIds.has(d.id)
      );
      setSearchResults(results.slice(0, 20));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [featured]);

  // Debounced search
  useEffect(() => {
    if (!isAddOpen) return;
    const timer = setTimeout(() => {
      searchDeals(dealSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [dealSearch, isAddOpen, searchDeals]);

  // --- Handlers ---

  const openAddModal = () => {
    setDealSearch('');
    setSearchResults([]);
    setSelectedDealId('');
    setAddPosition('');
    setAddError('');
    setIsAddOpen(true);
  };

  const handleAdd = async () => {
    if (!selectedDealId) {
      setAddError('Please select a deal.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: selectedDealId,
          position: addPosition ? Number(addPosition) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add featured deal');
      }
      const data = await res.json();
      setFeatured((prev) => [...prev, data.featured].sort((a, b) => a.position - b.position));
      setIsAddOpen(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add featured deal');
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (item: FeaturedDeal) => {
    setEditItem(item);
    setEditPosition(String(item.position));
    setEditError('');
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`/api/admin/featured/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: Number(editPosition) || 0 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update position');
      }
      setFeatured((prev) =>
        prev
          .map((f) =>
            f.id === editItem.id ? { ...f, position: Number(editPosition) || 0 } : f
          )
          .sort((a, b) => a.position - b.position)
      );
      setEditItem(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update position');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/featured/${deleteItem.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove featured deal');
      }
      setFeatured((prev) => prev.filter((f) => f.id !== deleteItem.id));
      setDeleteItem(null);
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Pagination ---
  const totalPages = Math.ceil(featured.length / PAGE_SIZE);
  const paginatedFeatured = featured.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
          <Star className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Featured Deals</h1>
            <p className="text-sm text-gray-500">
              {featured.length} featured deal{featured.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add to Featured
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Position</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal Title</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Added Date</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedFeatured.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No featured deals yet. Click &quot;Add to Featured&quot; to get started.
                  </td>
                </tr>
              ) : (
                paginatedFeatured.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 text-primary-600 font-bold text-sm">
                        {item.position}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-secondary-500 truncate max-w-[250px]">
                        {item.deal_title}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{item.vendor_name}</td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {item.claims_count}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Edit Position"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Remove from Featured"
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
          totalItems={featured.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add to Featured Modal */}
      <AdminModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Deal to Featured"
        size="md"
      >
        <div className="space-y-4">
          {addError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{addError}</div>
          )}

          {/* Deal Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Deal <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={dealSearch}
                onChange={(e) => setDealSearch(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by deal title or vendor name..."
              />
            </div>
          </div>

          {/* Search Results */}
          {searchLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {searchResults.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => setSelectedDealId(deal.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedDealId === deal.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-secondary-500 truncate">{deal.title}</p>
                  <p className="text-xs text-gray-400">
                    {deal.vendor?.business_name || 'Unknown vendor'} &middot;{' '}
                    <span className="capitalize">{deal.status}</span>
                  </p>
                </button>
              ))}
            </div>
          )}
          {!searchLoading && dealSearch.trim() && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No matching deals found.</p>
          )}

          {/* Selected Deal Indicator */}
          {selectedDealId && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
              Deal selected: {searchResults.find((d) => d.id === selectedDealId)?.title || selectedDealId}
            </div>
          )}

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="number"
              value={addPosition}
              onChange={(e) => setAddPosition(e.target.value)}
              className="input-field"
              placeholder="0 (lower = higher priority)"
              min="0"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAddOpen(false)}
              disabled={addLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={addLoading || !selectedDealId}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to Featured
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Edit Position Modal */}
      <AdminModal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Edit Position: ${editItem?.deal_title || ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{editError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="number"
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
              className="input-field"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-gray-400 mt-1">Lower numbers appear first.</p>
          </div>

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
        title="Remove from Featured"
        message={`Are you sure you want to remove "${deleteItem?.deal_title}" from featured deals? The deal itself will not be deleted.`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
