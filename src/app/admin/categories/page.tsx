'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import {
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  slug: string;
  created_at: string;
}

interface CategoryFormData {
  name: string;
  icon: string;
  slug: string;
}

const emptyFormData: CategoryFormData = {
  name: '',
  icon: '',
  slug: '',
};

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete dialog state
  const [deleteCategory, setDeleteCategory] = useState<CategoryRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // Silent fail — table will show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
  }, [user, fetchCategories]);

  // --- Helpers ---

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // --- Form Handlers ---

  const openCreateModal = () => {
    setFormData(emptyFormData);
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (category: CategoryRow) => {
    setFormData({
      name: category.name,
      icon: category.icon || '',
      slug: category.slug,
    });
    setFormError('');
    setEditCategory(category);
  };

  const closeModals = () => {
    setIsCreateOpen(false);
    setEditCategory(null);
    setFormError('');
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      // Auto-generate slug from name only if creating (not editing)
      ...(isCreateOpen ? { slug: generateSlug(value) } : {}),
    }));
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      setFormError('Name and slug are required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          icon: formData.icon.trim() || null,
          slug: formData.slug.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create category');
      }
      const { category } = await res.json();
      setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
      closeModals();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editCategory) return;
    if (!formData.name.trim() || !formData.slug.trim()) {
      setFormError('Name and slug are required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/admin/categories/${editCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          icon: formData.icon.trim() || null,
          slug: formData.slug.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update category');
      }
      const { category } = await res.json();
      setCategories((prev) =>
        prev
          .map((c) => (c.id === editCategory.id ? category : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      closeModals();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;
    setDeleteLoading(true);
    setDeleteWarning('');
    try {
      const res = await fetch(`/api/admin/categories/${deleteCategory.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        // If deals reference this category, show warning instead of generic error
        if (data.deal_count) {
          setDeleteWarning(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to delete category');
      }
      setCategories((prev) => prev.filter((c) => c.id !== deleteCategory.id));
      setDeleteCategory(null);
      setDeleteWarning('');
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Render ---

  const isFormOpen = isCreateOpen || !!editCategory;

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
          <LayoutGrid className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories Management</h1>
            <p className="text-sm text-gray-500">
              {categories.length} total categories
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Icon</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Slug</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No categories found. Add one to get started.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="text-2xl">{category.icon || '--'}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </td>
                    <td className="p-4">
                      <code className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {category.slug}
                      </code>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(category)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteWarning(''); setDeleteCategory(category); }}
                          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Category"
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

      {/* Create / Edit Modal */}
      <AdminModal
        isOpen={isFormOpen}
        onClose={closeModals}
        title={isCreateOpen ? 'Add Category' : 'Edit Category'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input-field"
              placeholder="e.g. Food & Dining"
            />
          </div>

          {/* Icon Emoji */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                className="input-field w-20 text-center text-2xl"
                placeholder="🍔"
                maxLength={4}
              />
              {formData.icon && (
                <span className="text-3xl">{formData.icon}</span>
              )}
              <p className="text-xs text-gray-400 flex-1">Paste an emoji character</p>
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              className="input-field"
              placeholder="food-dining"
            />
            <p className="text-xs text-gray-400 mt-1">URL-friendly identifier. Auto-generated from name when creating.</p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeModals}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={isCreateOpen ? handleCreate : handleEdit}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isCreateOpen ? 'Add Category' : 'Save Changes'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteCategory}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteCategory(null); setDeleteWarning(''); }}
        title="Delete Category"
        message={
          deleteWarning
            ? deleteWarning
            : `Are you sure you want to delete the category "${deleteCategory?.name}"? This action cannot be undone.`
        }
        confirmLabel={deleteWarning ? 'Close' : 'Delete Category'}
        variant={deleteWarning ? 'warning' : 'danger'}
        loading={deleteLoading}
      />
    </div>
  );
}
