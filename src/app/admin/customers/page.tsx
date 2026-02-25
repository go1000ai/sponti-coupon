'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Users,
  Search,
  Mail,
  MapPin,
  QrCode,
  CheckCircle,
  DollarSign,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Customer } from '@/lib/types/database';

interface CustomerWithStats extends Customer {
  total_claims: number;
  total_redeemed: number;
  total_saved: number;
}

interface EditFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  email_digest_opt_in: boolean;
  review_email_opt_out: boolean;
}

const PAGE_SIZE = 20;

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    zip: '',
    email_digest_opt_in: true,
    review_email_opt_out: false,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete confirm state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithStats | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      console.error('Error fetching customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCustomers();
  }, [user, fetchCustomers]);

  // Filtered customers based on search query (client-side for responsiveness)
  const filteredCustomers = useMemo(() => {
    if (searchQuery === '') return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        (c.first_name && c.first_name.toLowerCase().includes(q)) ||
        (c.last_name && c.last_name.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- Edit handlers ---

  function openEditModal(customer: CustomerWithStats) {
    setEditingCustomer(customer);
    setEditForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email,
      phone: customer.phone || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      email_digest_opt_in: customer.email_digest_opt_in ?? true,
      review_email_opt_out: customer.review_email_opt_out ?? false,
    });
    setEditError('');
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingCustomer(null);
    setEditError('');
  }

  function handleEditChange(field: keyof EditFormData, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;

    setEditLoading(true);
    setEditError('');

    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editForm.first_name || null,
          last_name: editForm.last_name || null,
          email: editForm.email,
          phone: editForm.phone || null,
          city: editForm.city || null,
          state: editForm.state || null,
          zip: editForm.zip || null,
          email_digest_opt_in: editForm.email_digest_opt_in,
          review_email_opt_out: editForm.review_email_opt_out,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update customer');
      }

      const data = await res.json();
      // Update local state with the returned customer data
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? { ...c, ...data.customer }
            : c
        )
      );
      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setEditLoading(false);
    }
  }

  // --- Delete handlers ---

  function openDeleteDialog(customer: CustomerWithStats) {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setDeletingCustomer(null);
  }

  async function handleDeleteConfirm() {
    if (!deletingCustomer) return;

    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/customers/${deletingCustomer.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      // Remove from local state
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      closeDeleteDialog();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

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
          <Users className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Customer Management</h1>
            <p className="text-sm text-gray-500">{customers.length} total customers</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Total Customers</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">{customers.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Total Claims</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">
            {customers.reduce((sum, c) => sum + c.total_claims, 0)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Redeemed</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">
            {customers.reduce((sum, c) => sum + c.total_redeemed, 0)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Savings</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">
            {formatCurrency(customers.reduce((sum, c) => sum + c.total_saved, 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Email</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Location</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Redeemed</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-right">Total Saved</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Joined</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {(customer.first_name?.[0] || customer.email[0]).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-secondary-500">
                          {customer.first_name || ''} {customer.last_name || ''}
                          {!customer.first_name && !customer.last_name && (
                            <span className="text-gray-400 italic">No name</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.city ? (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {customer.city}, {customer.state}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {customer.total_claims}
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {customer.total_redeemed}
                    </td>
                    <td className="p-4 text-sm text-green-600 font-medium text-right">
                      {customer.total_saved > 0 ? formatCurrency(customer.total_saved) : '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(customer)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete customer"
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
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCustomers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Edit Modal */}
      <AdminModal isOpen={editModalOpen} onClose={closeEditModal} title="Edit Customer" size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={editForm.first_name}
                onChange={(e) => handleEditChange('first_name', e.target.value)}
                className="input-field"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={editForm.last_name}
                onChange={(e) => handleEditChange('last_name', e.target.value)}
                className="input-field"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => handleEditChange('email', e.target.value)}
              className="input-field"
              placeholder="Email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => handleEditChange('phone', e.target.value)}
              className="input-field"
              placeholder="Phone number"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => handleEditChange('city', e.target.value)}
                className="input-field"
                placeholder="City"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={editForm.state}
                onChange={(e) => handleEditChange('state', e.target.value)}
                className="input-field"
                placeholder="State"
                maxLength={2}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={editForm.zip}
                onChange={(e) => handleEditChange('zip', e.target.value)}
                className="input-field"
                placeholder="ZIP code"
                maxLength={10}
              />
            </div>
          </div>

          {/* Email Preferences */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Preferences</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.email_digest_opt_in}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email_digest_opt_in: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm text-gray-700">Email Digest Opt In</span>
                <p className="text-xs text-gray-400">Receives weekly email digest of deals</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.review_email_opt_out}
                onChange={(e) => setEditForm((prev) => ({ ...prev, review_email_opt_out: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm text-gray-700">Review Email Opt Out</span>
                <p className="text-xs text-gray-400">Opted out of review request emails</p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={editLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteDialog}
        title="Delete Customer"
        message={
          deletingCustomer
            ? `Are you sure you want to delete "${
                [deletingCustomer.first_name, deletingCustomer.last_name].filter(Boolean).join(' ') || deletingCustomer.email
              }"? This will permanently remove the customer and all associated data including claims, reviews, and loyalty cards. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Customer"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
