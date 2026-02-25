'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Store,
  Search,
  ChevronUp,
  Eye,
  Ban,
  CheckCircle,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Tag,
  QrCode,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Image as ImageIcon,
  Palette,
  Clock,
  Globe,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { Vendor, SubscriptionTier, SubscriptionStatus } from '@/lib/types/database';

interface VendorWithStats extends Vendor {
  deal_count?: number;
  total_claims?: number;
}

interface VendorFormData {
  email: string;
  password: string;
  business_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  category: string;
  description: string;
  website: string;
}

interface VendorEditData {
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  category: string;
  subscription_tier: SubscriptionTier | '';
  subscription_status: SubscriptionStatus | '';
  logo_url: string;
  cover_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_logo_url: string;
  hide_sponticoupon_branding: boolean;
  social_links: {
    instagram: string;
    facebook: string;
    tiktok: string;
    twitter: string;
    yelp: string;
    google_business: string;
  };
  business_hours: Record<string, { open: string; close: string; closed: boolean }>;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_SOCIAL_LINKS = {
  instagram: '',
  facebook: '',
  tiktok: '',
  twitter: '',
  yelp: '',
  google_business: '',
};

const DEFAULT_BUSINESS_HOURS: Record<string, { open: string; close: string; closed: boolean }> = {
  monday: { open: '9:00', close: '17:00', closed: false },
  tuesday: { open: '9:00', close: '17:00', closed: false },
  wednesday: { open: '9:00', close: '17:00', closed: false },
  thursday: { open: '9:00', close: '17:00', closed: false },
  friday: { open: '9:00', close: '17:00', closed: false },
  saturday: { open: '9:00', close: '17:00', closed: true },
  sunday: { open: '9:00', close: '17:00', closed: true },
};

const EMPTY_FORM: VendorFormData = {
  email: '',
  password: '',
  business_name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  category: '',
  description: '',
  website: '',
};

const PAGE_SIZE = 15;

export default function AdminVendorsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<VendorFormData>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<VendorEditData>({
    first_name: '',
    last_name: '',
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    category: '',
    subscription_tier: '',
    subscription_status: '',
    logo_url: '',
    cover_url: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    custom_logo_url: '',
    hide_sponticoupon_branding: false,
    social_links: { ...DEFAULT_SOCIAL_LINKS },
    business_hours: { ...DEFAULT_BUSINESS_HOURS },
  });
  const [selectedVendor, setSelectedVendor] = useState<VendorWithStats | null>(null);

  // Loading / error states for mutations
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Image upload helper
  const handleImageUpload = async (
    file: File,
    bucket: string,
    vendorId: string,
    field: 'logo_url' | 'cover_url'
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('user_id', vendorId);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    setEditForm((f) => ({ ...f, [field]: data.url }));
  };

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/vendors');
      if (!res.ok) {
        console.error('Failed to fetch vendors:', res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchVendors();
  }, [user, fetchVendors]);

  // Client-side filtering (search, status, tier)
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        searchQuery === '' ||
        v.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.city && v.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (v.subscription_status || 'inactive') === statusFilter;

      const matchesTier =
        tierFilter === 'all' ||
        (v.subscription_tier || 'none') === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [vendors, searchQuery, statusFilter, tierFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / PAGE_SIZE);
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredVendors.slice(start, start + PAGE_SIZE);
  }, [filteredVendors, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, tierFilter]);

  // --- Handlers ---

  const handleSuspendVendor = async (vendorId: string) => {
    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_status: 'canceled' }),
    });
    if (res.ok) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId ? { ...v, subscription_status: 'canceled' as SubscriptionStatus } : v
        )
      );
    }
  };

  const handleActivateVendor = async (vendorId: string) => {
    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_status: 'active' }),
    });
    if (res.ok) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId ? { ...v, subscription_status: 'active' as SubscriptionStatus } : v
        )
      );
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create vendor');
        return;
      }

      // Add new vendor to the list with default stats
      setVendors((prev) => [{ ...data.vendor, deal_count: 0, total_claims: 0 }, ...prev]);
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (vendor: VendorWithStats) => {
    setSelectedVendor(vendor);
    const vendorAny = vendor as unknown as Record<string, unknown>;
    const vendorSocial = (vendorAny.social_links || {}) as Record<string, string>;
    const vendorHours = (vendorAny.business_hours || {}) as Record<
      string,
      { open: string; close: string; closed: boolean }
    >;
    setEditForm({
      first_name: (vendorAny.first_name as string) || '',
      last_name: (vendorAny.last_name as string) || '',
      business_name: vendor.business_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip: vendor.zip || '',
      category: vendor.category || '',
      subscription_tier: vendor.subscription_tier || '',
      subscription_status: vendor.subscription_status || '',
      logo_url: (vendorAny.logo_url as string) || '',
      cover_url: (vendorAny.cover_url as string) || '',
      primary_color: (vendorAny.primary_color as string) || '',
      secondary_color: (vendorAny.secondary_color as string) || '',
      accent_color: (vendorAny.accent_color as string) || '',
      custom_logo_url: (vendorAny.custom_logo_url as string) || '',
      hide_sponticoupon_branding: (vendorAny.hide_sponticoupon_branding as boolean) || false,
      social_links: {
        instagram: vendorSocial.instagram || '',
        facebook: vendorSocial.facebook || '',
        tiktok: vendorSocial.tiktok || '',
        twitter: vendorSocial.twitter || '',
        yelp: vendorSocial.yelp || '',
        google_business: vendorSocial.google_business || '',
      },
      business_hours: DAYS_OF_WEEK.reduce(
        (acc, day) => ({
          ...acc,
          [day]: vendorHours[day] || { open: '9:00', close: '17:00', closed: false },
        }),
        {} as Record<string, { open: string; close: string; closed: boolean }>
      ),
    });
    setExpandedSections({});
    setFormError(null);
    setShowEditModal(true);
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    setFormError(null);
    setUpdating(true);

    try {
      // Build only changed fields
      const updates: Record<string, unknown> = {};
      const stringFields: (keyof VendorEditData)[] = [
        'business_name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'zip',
        'category',
        'subscription_tier',
        'subscription_status',
        'logo_url',
        'cover_url',
        'primary_color',
        'secondary_color',
        'accent_color',
        'custom_logo_url',
      ];

      for (const key of stringFields) {
        const currentValue = (selectedVendor as unknown as Record<string, unknown>)[key] ?? '';
        const newValue = editForm[key];
        if (newValue !== currentValue) {
          // Send null for empty strings on nullable fields
          if (newValue === '' && key !== 'business_name' && key !== 'email') {
            updates[key] = null;
          } else {
            updates[key] = newValue;
          }
        }
      }

      // Boolean field
      const currentBranding =
        (selectedVendor as unknown as Record<string, unknown>).hide_sponticoupon_branding ?? false;
      if (editForm.hide_sponticoupon_branding !== currentBranding) {
        updates.hide_sponticoupon_branding = editForm.hide_sponticoupon_branding;
      }

      // JSON fields — always send full objects if they differ
      const currentSocial = JSON.stringify(
        (selectedVendor as unknown as Record<string, unknown>).social_links || {}
      );
      if (JSON.stringify(editForm.social_links) !== currentSocial) {
        updates.social_links = editForm.social_links;
      }

      const currentHours = JSON.stringify(
        (selectedVendor as unknown as Record<string, unknown>).business_hours || {}
      );
      if (JSON.stringify(editForm.business_hours) !== currentHours) {
        updates.business_hours = editForm.business_hours;
      }

      // Profile-level name fields (stored in user_profiles, not vendors)
      const vendorAny = selectedVendor as unknown as Record<string, unknown>;
      if (editForm.first_name !== ((vendorAny.first_name as string) || '')) {
        updates.first_name = editForm.first_name || null;
      }
      if (editForm.last_name !== ((vendorAny.last_name as string) || '')) {
        updates.last_name = editForm.last_name || null;
      }

      if (Object.keys(updates).length === 0) {
        setShowEditModal(false);
        return;
      }

      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update vendor');
        return;
      }

      // Update local state
      setVendors((prev) =>
        prev.map((v) =>
          v.id === selectedVendor.id
            ? { ...v, ...data.vendor, deal_count: v.deal_count, total_claims: v.total_claims }
            : v
        )
      );
      setShowEditModal(false);
      setSelectedVendor(null);
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const openDeleteDialog = (vendor: VendorWithStats) => {
    setSelectedVendor(vendor);
    setShowDeleteDialog(true);
  };

  const handleDeleteVendor = async () => {
    if (!selectedVendor) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== selectedVendor.id));
        setShowDeleteDialog(false);
        setSelectedVendor(null);
        // Collapse if the deleted vendor was expanded
        if (expandedVendor === selectedVendor.id) {
          setExpandedVendor(null);
        }
      } else {
        const data = await res.json();
        console.error('Delete failed:', data.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
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
          <Store className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Vendor Management</h1>
            <p className="text-sm text-gray-500">{vendors.length} total vendors</p>
          </div>
        </div>
        <button
          onClick={() => {
            setCreateForm(EMPTY_FORM);
            setFormError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Business</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Email</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Tier</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Location</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Deals</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedVendors.map((vendor) => (
                  <VendorRow
                    key={vendor.id}
                    vendor={vendor}
                    expanded={expandedVendor === vendor.id}
                    onToggleExpand={() =>
                      setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)
                    }
                    onCollapse={() => setExpandedVendor(null)}
                    onSuspend={() => handleSuspendVendor(vendor.id)}
                    onActivate={() => handleActivateVendor(vendor.id)}
                    onEdit={() => openEditModal(vendor)}
                    onDelete={() => openDeleteDialog(vendor)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredVendors.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create Vendor Modal */}
      <AdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Vendor"
        size="lg"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="input-field"
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="input-field"
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createForm.business_name}
              onChange={(e) => setCreateForm((f) => ({ ...f, business_name: e.target.value }))}
              className="input-field"
              placeholder="Business name"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className="input-field"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={createForm.category}
                onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                className="input-field"
                placeholder="e.g. Restaurant, Spa, Retail"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={createForm.address}
              onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
              className="input-field"
              placeholder="Street address"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={createForm.city}
                onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
                className="input-field"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={createForm.state}
                onChange={(e) => setCreateForm((f) => ({ ...f, state: e.target.value }))}
                className="input-field"
                placeholder="FL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input
                type="text"
                value={createForm.zip}
                onChange={(e) => setCreateForm((f) => ({ ...f, zip: e.target.value }))}
                className="input-field"
                placeholder="33101"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Brief description of the business..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={createForm.website}
              onChange={(e) => setCreateForm((f) => ({ ...f, website: e.target.value }))}
              className="input-field"
              placeholder="https://example.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              {creating ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Edit Vendor Modal */}
      <AdminModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit: ${selectedVendor?.business_name || 'Vendor'}`}
        size="lg"
      >
        <form onSubmit={handleEditVendor} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={editForm.first_name}
                onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                className="input-field"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={editForm.last_name}
                onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                className="input-field"
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.business_name}
                onChange={(e) => setEditForm((f) => ({ ...f, business_name: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={editForm.state}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input
                type="text"
                value={editForm.zip}
                onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Tier
              </label>
              <select
                value={editForm.subscription_tier}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    subscription_tier: e.target.value as SubscriptionTier | '',
                  }))
                }
                className="input-field"
              >
                <option value="">None</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Status
              </label>
              <select
                value={editForm.subscription_status}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    subscription_status: e.target.value as SubscriptionStatus | '',
                  }))
                }
                className="input-field"
              >
                <option value="">Inactive</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>
          </div>

          {/* Images Section */}
          <button
            type="button"
            onClick={() => toggleSection('images')}
            className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold text-gray-700 border-t border-gray-100 mt-4 pt-4"
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images
            </span>
            {expandedSections.images ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.images && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="flex items-center gap-3">
                  {editForm.logo_url && (
                    <img
                      src={editForm.logo_url}
                      alt="Logo"
                      className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && selectedVendor) {
                          handleImageUpload(file, 'vendor-assets', selectedVendor.id, 'logo_url');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                <div className="flex items-center gap-3">
                  {editForm.cover_url && (
                    <img
                      src={editForm.cover_url}
                      alt="Cover"
                      className="h-16 w-32 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Upload Cover
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && selectedVendor) {
                          handleImageUpload(file, 'vendor-assets', selectedVendor.id, 'cover_url');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Branding Section */}
          <button
            type="button"
            onClick={() => toggleSection('branding')}
            className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold text-gray-700 border-t border-gray-100 mt-4 pt-4"
          >
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Branding
            </span>
            {expandedSections.branding ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.branding && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.primary_color || '#000000'}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, primary_color: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editForm.primary_color}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, primary_color: e.target.value }))
                      }
                      className="input-field flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.secondary_color || '#000000'}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, secondary_color: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editForm.secondary_color}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, secondary_color: e.target.value }))
                      }
                      className="input-field flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.accent_color || '#000000'}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, accent_color: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editForm.accent_color}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, accent_color: e.target.value }))
                      }
                      className="input-field flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Logo URL
                </label>
                <input
                  type="text"
                  value={editForm.custom_logo_url}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, custom_logo_url: e.target.value }))
                  }
                  className="input-field"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hide_branding"
                  checked={editForm.hide_sponticoupon_branding}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      hide_sponticoupon_branding: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="hide_branding" className="text-sm font-medium text-gray-700">
                  Hide SpontiCoupon branding
                </label>
              </div>
            </div>
          )}

          {/* Social Links Section */}
          <button
            type="button"
            onClick={() => toggleSection('social')}
            className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold text-gray-700 border-t border-gray-100 mt-4 pt-4"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Social Links
            </span>
            {expandedSections.social ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.social && (
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  ['instagram', 'Instagram'],
                  ['facebook', 'Facebook'],
                  ['tiktok', 'TikTok'],
                  ['twitter', 'Twitter / X'],
                  ['yelp', 'Yelp'],
                  ['google_business', 'Google Business'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    value={editForm.social_links[key]}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        social_links: { ...f.social_links, [key]: e.target.value },
                      }))
                    }
                    className="input-field"
                    placeholder={`https://${key === 'google_business' ? 'g.page' : key + '.com'}/...`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Business Hours Section */}
          <button
            type="button"
            onClick={() => toggleSection('hours')}
            className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold text-gray-700 border-t border-gray-100 mt-4 pt-4"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Business Hours
            </span>
            {expandedSections.hours ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.hours && (
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-24 capitalize">{day}</span>
                  <input
                    type="time"
                    value={editForm.business_hours[day]?.open || '09:00'}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        business_hours: {
                          ...f.business_hours,
                          [day]: { ...f.business_hours[day], open: e.target.value },
                        },
                      }))
                    }
                    className="input-field w-32"
                    disabled={editForm.business_hours[day]?.closed}
                  />
                  <span className="text-sm text-gray-400">to</span>
                  <input
                    type="time"
                    value={editForm.business_hours[day]?.close || '17:00'}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        business_hours: {
                          ...f.business_hours,
                          [day]: { ...f.business_hours[day], close: e.target.value },
                        },
                      }))
                    }
                    className="input-field w-32"
                    disabled={editForm.business_hours[day]?.closed}
                  />
                  <label className="flex items-center gap-1.5 text-sm text-gray-500">
                    <input
                      type="checkbox"
                      checked={editForm.business_hours[day]?.closed || false}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          business_hours: {
                            ...f.business_hours,
                            [day]: { ...f.business_hours[day], closed: e.target.checked },
                          },
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                    Closed
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={showDeleteDialog}
        onConfirm={handleDeleteVendor}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedVendor(null);
        }}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${selectedVendor?.business_name}"? This will permanently remove the vendor account and cascade-delete all associated deals, claims, redemptions, reviews, and loyalty data. This action cannot be undone.`}
        confirmLabel="Delete Vendor"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

// --- Vendor Row Sub-component ---

interface VendorRowProps {
  vendor: VendorWithStats;
  expanded: boolean;
  onToggleExpand: () => void;
  onCollapse: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function VendorRow({
  vendor,
  expanded,
  onToggleExpand,
  onCollapse,
  onSuspend,
  onActivate,
  onEdit,
  onDelete,
}: VendorRowProps) {
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="p-4 font-medium text-secondary-500">{vendor.business_name}</td>
        <td className="p-4 text-sm text-gray-500">{vendor.email}</td>
        <td className="p-4">
          <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium capitalize">
            {vendor.subscription_tier || 'none'}
          </span>
        </td>
        <td className="p-4">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              vendor.subscription_status === 'active'
                ? 'bg-green-50 text-green-600'
                : vendor.subscription_status === 'canceled'
                ? 'bg-red-50 text-red-500'
                : vendor.subscription_status === 'past_due'
                ? 'bg-yellow-50 text-yellow-600'
                : vendor.subscription_status === 'trialing'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {vendor.subscription_status || 'inactive'}
          </span>
        </td>
        <td className="p-4 text-sm text-gray-500">
          {vendor.city ? `${vendor.city}, ${vendor.state}` : '--'}
        </td>
        <td className="p-4 text-sm text-secondary-500 font-medium text-center">
          {vendor.deal_count || 0}
        </td>
        <td className="p-4 text-sm text-secondary-500 font-medium text-center">
          {vendor.total_claims || 0}
        </td>
        <td className="p-4">
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleExpand}
              className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
              title="View Details"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={onEdit}
              className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
              title="Edit Vendor"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {vendor.subscription_status === 'active' ? (
              <button
                onClick={onSuspend}
                className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                title="Suspend"
              >
                <Ban className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onActivate}
                className="text-gray-500 hover:text-green-500 hover:bg-green-50 p-2 rounded-lg transition-colors"
                title="Activate"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
              title="Delete Vendor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {/* Expanded detail row */}
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-gray-50 p-6 border-t border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-secondary-500">
                  {vendor.business_name} Details
                </h3>
                <button
                  onClick={onCollapse}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{vendor.email}</span>
                </div>
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{vendor.phone}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {vendor.address}, {vendor.city}, {vendor.state} {vendor.zip}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    Joined {new Date(vendor.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {vendor.deal_count || 0} deals created
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <QrCode className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {vendor.total_claims || 0} total claims
                  </span>
                </div>
                {vendor.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Category: {vendor.category}</span>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
