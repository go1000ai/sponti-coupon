'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Users,
  Search,
  Shield,
  Store,
  UserCircle,
  Ban,
  CheckCircle,
  Calendar,
  Loader2,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import type { UserRole } from '@/lib/types/database';

interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  associated_name: string;
  disabled: boolean;
  created_at: string;
}

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Selected user and form state
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('customer');

  // Add user form
  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    role: 'customer' as UserRole,
    first_name: '',
    last_name: '',
    business_name: '',
  });
  const [addingUser, setAddingUser] = useState(false);

  // Loading states for mutations
  const [updatingRole, setUpdatingRole] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.set('role', roleFilter);
      }
      const url = `/api/admin/users${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('Failed to fetch users:', res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchUsers();
  }, [user, fetchUsers]);

  // Client-side search filtering
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.associated_name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  // Summary counts
  const summaryStats = useMemo(() => {
    const total = users.length;
    const vendors = users.filter((u) => u.role === 'vendor').length;
    const customers = users.filter((u) => u.role === 'customer').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    return { total, vendors, customers, admins };
  }, [users]);

  // --- Handlers ---

  const openRoleModal = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setNewRole(userRecord.role);
    setFormError(null);
    setShowRoleModal(true);
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    if (newRole === selectedUser.role) {
      setShowRoleModal(false);
      return;
    }

    setFormError(null);
    setUpdatingRole(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update role');
        return;
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u
        )
      );
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setUpdatingRole(false);
    }
  };

  const openToggleDialog = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setShowToggleDialog(true);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setTogglingStatus(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !selectedUser.disabled }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Toggle status failed:', data.error);
        return;
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, disabled: !selectedUser.disabled } : u
        )
      );
      setShowToggleDialog(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Toggle status error:', err);
    } finally {
      setTogglingStatus(false);
    }
  };

  // --- Add User ---
  const openAddModal = () => {
    setAddForm({ email: '', password: '', role: 'customer', first_name: '', last_name: '', business_name: '' });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleAddUser = async () => {
    if (!addForm.email || !addForm.password) {
      setFormError('Email and password are required');
      return;
    }
    if (addForm.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    if (addForm.role === 'vendor' && !addForm.business_name.trim()) {
      setFormError('Business name is required for vendor accounts');
      return;
    }

    setFormError(null);
    setAddingUser(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email,
          password: addForm.password,
          role: addForm.role,
          first_name: addForm.first_name || undefined,
          last_name: addForm.last_name || undefined,
          business_name: addForm.role === 'vendor' ? addForm.business_name : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create user');
        return;
      }

      setShowAddModal(false);
      fetchUsers();
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setAddingUser(false);
    }
  };

  // --- Delete User ---
  const openDeleteDialog = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setShowDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeletingUser(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Delete user failed:', data.error);
        setDeletingUser(false);
        setShowDeleteDialog(false);
        setSelectedUser(null);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Delete user error:', err);
    } finally {
      setDeletingUser(false);
    }
  };

  // --- Role badge helper ---
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case 'vendor':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
            <Store className="w-3 h-3" />
            Vendor
          </span>
        );
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium">
            <UserCircle className="w-3 h-3" />
            Customer
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
            {role}
          </span>
        );
    }
  };

  const getStatusBadge = (disabled: boolean) => {
    if (disabled) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-500 font-medium">
          <Ban className="w-3 h-3" />
          Disabled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Users &amp; Roles</h1>
            <p className="text-sm text-gray-500">Manage user accounts and role assignments</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-6 h-6 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summaryStats.total}</p>
          <p className="text-sm text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Store className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Vendors</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summaryStats.vendors}</p>
          <p className="text-sm text-gray-500 mt-1">Vendor Accounts</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <UserCircle className="w-6 h-6 text-primary-500" />
            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">Customers</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summaryStats.customers}</p>
          <p className="text-sm text-gray-500 mt-1">Customer Accounts</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Admins</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summaryStats.admins}</p>
          <p className="text-sm text-gray-500 mt-1">Admin Accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Roles</option>
            <option value="vendor">Vendor</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Email</th>
                <th className="p-4 font-semibold text-sm text-gray-500">First Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Last Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Role</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Created At</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((userRecord) => (
                  <tr
                    key={userRecord.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/users/${userRecord.id}`)}
                  >
                    <td className="p-4 text-sm text-gray-900 font-medium">
                      {userRecord.email || '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {userRecord.first_name || '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {userRecord.last_name || '--'}
                    </td>
                    <td className="p-4">
                      {getRoleBadge(userRecord.role)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(userRecord.disabled)}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {userRecord.created_at
                          ? new Date(userRecord.created_at).toLocaleDateString()
                          : '--'}
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/users/${userRecord.id}`)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="View & Edit Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRoleModal(userRecord)}
                          className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="Change Role"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {userRecord.disabled ? (
                          <button
                            onClick={() => openToggleDialog(userRecord)}
                            className="text-gray-500 hover:text-green-500 hover:bg-green-50 p-2 rounded-lg transition-colors"
                            title="Enable User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openToggleDialog(userRecord)}
                            className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Disable User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteDialog(userRecord)}
                          className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete User"
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
          totalItems={filteredUsers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Change Role Modal */}
      <AdminModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={`Change Role: ${selectedUser?.email || 'User'}`}
        size="sm"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Role
            </label>
            <div className="mb-3">
              {selectedUser && getRoleBadge(selectedUser.role)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="input-field"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {newRole === 'admin' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              Granting admin access gives this user full platform management privileges. Proceed with caution.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleChangeRole}
              disabled={updatingRole || newRole === selectedUser?.role}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {updatingRole && <Loader2 className="w-4 h-4 animate-spin" />}
              {updatingRole ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Disable/Enable Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={showToggleDialog}
        onConfirm={handleToggleStatus}
        onCancel={() => {
          setShowToggleDialog(false);
          setSelectedUser(null);
        }}
        title={selectedUser?.disabled ? 'Enable User' : 'Disable User'}
        message={
          selectedUser?.disabled
            ? `Are you sure you want to re-enable "${selectedUser?.email}"? This user will be able to sign in and use the platform again.`
            : `Are you sure you want to disable "${selectedUser?.email}"? This user will no longer be able to sign in until re-enabled.`
        }
        confirmLabel={selectedUser?.disabled ? 'Enable User' : 'Disable User'}
        variant={selectedUser?.disabled ? 'warning' : 'danger'}
        loading={togglingStatus}
      />

      {/* Delete User Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={showDeleteDialog}
        onConfirm={handleDeleteUser}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        message={`Are you sure you want to permanently delete "${selectedUser?.email}"? This will remove the user account and all associated data. This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="danger"
        loading={deletingUser}
      />

      {/* Add User Modal */}
      <AdminModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        size="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="input-field"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              className="input-field"
              placeholder="Min. 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
              className="input-field"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {addForm.role === 'admin' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              This user will have full admin access to the platform.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={addForm.first_name}
                onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                className="input-field"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={addForm.last_name}
                onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                className="input-field"
                placeholder="Last name"
              />
            </div>
          </div>

          {addForm.role === 'vendor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={addForm.business_name}
                onChange={(e) => setAddForm({ ...addForm, business_name: e.target.value })}
                className="input-field"
                placeholder="Business name (required for vendors)"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddUser}
              disabled={addingUser}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {addingUser && <Loader2 className="w-4 h-4 animate-spin" />}
              {addingUser ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
