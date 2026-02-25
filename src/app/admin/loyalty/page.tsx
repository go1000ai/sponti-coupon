'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Gift,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Award,
  Hash,
  TrendingUp,
} from 'lucide-react';

interface LoyaltyProgram {
  id: string;
  vendor_id: string;
  name: string;
  type: 'punch_card' | 'points';
  punch_target: number | null;
  points_per_dollar: number | null;
  is_active: boolean;
  created_at: string;
  vendor?: { business_name: string } | null;
  rewards_count: number;
  cards_count: number;
}

interface EditFormData {
  name: string;
  type: 'punch_card' | 'points';
  punch_target: string;
  points_per_dollar: string;
  is_active: boolean;
}

const PAGE_SIZE = 15;

export default function AdminLoyaltyPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editProgram, setEditProgram] = useState<LoyaltyProgram | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    type: 'punch_card',
    punch_target: '',
    points_per_dollar: '',
    is_active: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete dialog state
  const [deleteProgram, setDeleteProgram] = useState<LoyaltyProgram | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/loyalty');
      if (!res.ok) throw new Error('Failed to fetch loyalty programs');
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch {
      // Silent fail — table will show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPrograms();
  }, [user, fetchPrograms]);

  // Filtered + paginated data
  const filteredPrograms = useMemo(() => {
    if (!searchQuery) return programs;
    const q = searchQuery.toLowerCase();
    return programs.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const vendorName = (p.vendor?.business_name || '').toLowerCase();
      return name.includes(q) || vendorName.includes(q);
    });
  }, [programs, searchQuery]);

  const totalPages = Math.ceil(filteredPrograms.length / PAGE_SIZE);
  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPrograms.slice(start, start + PAGE_SIZE);
  }, [filteredPrograms, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- Helpers ---

  const getTypeBadge = (type: 'punch_card' | 'points') => {
    if (type === 'punch_card') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-purple-50 text-purple-600">
          <Hash className="w-3 h-3" />
          Punch Card
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-600">
        <TrendingUp className="w-3 h-3" />
        Points
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-600">
        Active
      </span>
    ) : (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
        Inactive
      </span>
    );
  };

  // --- Edit Handlers ---

  const openEditModal = (program: LoyaltyProgram) => {
    setFormData({
      name: program.name,
      type: program.type,
      punch_target: program.punch_target != null ? String(program.punch_target) : '',
      points_per_dollar: program.points_per_dollar != null ? String(program.points_per_dollar) : '',
      is_active: program.is_active,
    });
    setFormError('');
    setEditProgram(program);
  };

  const closeEditModal = () => {
    setEditProgram(null);
    setFormError('');
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = async () => {
    if (!editProgram) return;
    if (!formData.name.trim()) {
      setFormError('Program name is required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/admin/loyalty/${editProgram.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          punch_target: formData.punch_target || null,
          points_per_dollar: formData.points_per_dollar || null,
          is_active: formData.is_active,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update program');
      }
      const { program } = await res.json();
      // Preserve the computed counts from the list
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === editProgram.id
            ? { ...program, rewards_count: p.rewards_count, cards_count: p.cards_count }
            : p
        )
      );
      closeEditModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update program');
    } finally {
      setFormLoading(false);
    }
  };

  // --- Delete Handler ---

  const handleDelete = async () => {
    if (!deleteProgram) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/loyalty/${deleteProgram.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete program');
      }
      setPrograms((prev) => prev.filter((p) => p.id !== deleteProgram.id));
      setDeleteProgram(null);
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Stats ---

  const activeCount = programs.filter((p) => p.is_active).length;
  const punchCardCount = programs.filter((p) => p.type === 'punch_card').length;
  const pointsCount = programs.filter((p) => p.type === 'points').length;
  const totalEnrollments = programs.reduce((sum, p) => sum + p.cards_count, 0);

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
          <Gift className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Loyalty Programs</h1>
            <p className="text-sm text-gray-500">
              {programs.length} total &middot; {activeCount} active &middot; {punchCardCount} punch cards &middot; {pointsCount} points &middot; {totalEnrollments} enrollments
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by program name or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Program Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Rewards</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Enrollments</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPrograms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No loyalty programs found.
                  </td>
                </tr>
              ) : (
                paginatedPrograms.map((program) => (
                  <tr key={program.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-secondary-500 truncate max-w-[200px]">
                        {program.name}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {program.vendor?.business_name || '--'}
                    </td>
                    <td className="p-4">
                      {getTypeBadge(program.type)}
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5 text-gray-400" />
                        {program.rewards_count}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {program.cards_count}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(program.is_active)}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(program.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(program)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Edit Program"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteProgram(program)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Program"
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
          totalItems={filteredPrograms.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Edit Modal */}
      <AdminModal
        isOpen={!!editProgram}
        onClose={closeEditModal}
        title="Edit Loyalty Program"
        size="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
          )}

          {/* Program Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className="input-field"
              placeholder="Program name"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              className="input-field"
            >
              <option value="punch_card">Punch Card</option>
              <option value="points">Points</option>
            </select>
          </div>

          {/* Punch Target (shown when type is punch_card) */}
          {formData.type === 'punch_card' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punch Target</label>
              <input
                type="number"
                name="punch_target"
                value={formData.punch_target}
                onChange={handleFormChange}
                className="input-field"
                placeholder="e.g. 10"
                min="1"
              />
              <p className="text-xs text-gray-400 mt-1">Number of punches needed to earn a reward</p>
            </div>
          )}

          {/* Points Per Dollar (shown when type is points) */}
          {formData.type === 'points' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points Per Dollar</label>
              <input
                type="number"
                name="points_per_dollar"
                value={formData.points_per_dollar}
                onChange={handleFormChange}
                className="input-field"
                placeholder="e.g. 1.5"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">Points earned per dollar spent</p>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeEditModal}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteProgram}
        onConfirm={handleDelete}
        onCancel={() => setDeleteProgram(null)}
        title="Delete Loyalty Program"
        message={`Are you sure you want to delete "${deleteProgram?.name}"? This will permanently delete all associated rewards, enrollment cards, and transaction history. This action cannot be undone.`}
        confirmLabel="Delete Program"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
