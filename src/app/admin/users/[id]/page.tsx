'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import type {
  UserRole,
  SubscriptionTier,
  SubscriptionStatus,
  Vendor,
  Customer,
} from '@/lib/types/database';
import {
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Check,
  Loader2,
  Shield,
  Store,
  UserCircle,
  Ban,
  CheckCircle,
  Calendar,
  Clock,
  Tag,
  BarChart3,
  Ticket,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

// ---------- Types ----------

interface SupportTicketSummary {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

interface UserDetail {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  disabled: boolean;
  phone: string | null;
  vendor_data: Vendor | null;
  customer_data: Customer | null;
  deals_count: number;
  claims_count: number;
  support_tickets: SupportTicketSummary[];
}

interface FormState {
  email: string;
  role: UserRole;
  disabled: boolean;
  // Profile-level name (all roles)
  profile_first_name: string;
  profile_last_name: string;
  // Vendor fields
  business_name: string;
  vendor_phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  category: string;
  description: string;
  website: string;
  subscription_tier: SubscriptionTier | '';
  subscription_status: SubscriptionStatus | '';
  logo_url: string;
  cover_url: string;
  // Customer fields
  first_name: string;
  last_name: string;
  customer_phone: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  email_digest_opt_in: boolean;
  review_email_opt_out: boolean;
}

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const ticketStatusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-50', text: 'text-blue-600' },
  in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  resolved: { bg: 'bg-green-50', text: 'text-green-600' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

// ---------- Sub-components ----------

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-up-fade">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
        type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}>
        {type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  switch (role) {
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    case 'vendor':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
          <Store className="w-3 h-3" />
          Vendor
        </span>
      );
    case 'customer':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 font-medium">
          <UserCircle className="w-3 h-3" />
          Customer
        </span>
      );
    default:
      return (
        <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
          {role}
        </span>
      );
  }
}

function SectionHeader({ label, color = 'from-primary-500 to-primary-300' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${color}`} />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

// ---------- Main Page Component ----------

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: authUser, role: authRole, loading: authLoading } = useAuth();
  const userId = params.id as string;

  // Data state
  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState<FormState | null>(null);
  const [originalFormData, setOriginalFormData] = useState<FormState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ---------- Build form data from user ----------
  const buildFormData = useCallback((u: UserDetail): FormState => {
    return {
      email: u.email,
      role: u.role,
      disabled: u.disabled,
      // Profile-level name (all roles)
      profile_first_name: u.first_name || '',
      profile_last_name: u.last_name || '',
      // Vendor fields
      business_name: u.vendor_data?.business_name || '',
      vendor_phone: u.vendor_data?.phone || '',
      address: u.vendor_data?.address || '',
      city: u.vendor_data?.city || '',
      state: u.vendor_data?.state || '',
      zip: u.vendor_data?.zip || '',
      category: u.vendor_data?.category || '',
      description: u.vendor_data?.description || '',
      website: u.vendor_data?.website || '',
      subscription_tier: u.vendor_data?.subscription_tier || '',
      subscription_status: u.vendor_data?.subscription_status || '',
      logo_url: u.vendor_data?.logo_url || '',
      cover_url: u.vendor_data?.cover_url || '',
      // Customer fields
      first_name: u.customer_data?.first_name || '',
      last_name: u.customer_data?.last_name || '',
      customer_phone: u.customer_data?.phone || '',
      customer_city: u.customer_data?.city || '',
      customer_state: u.customer_data?.state || '',
      customer_zip: u.customer_data?.zip || '',
      email_digest_opt_in: u.customer_data?.email_digest_opt_in ?? false,
      review_email_opt_out: u.customer_data?.review_email_opt_out ?? false,
    };
  }, []);

  // ---------- Fetch data ----------
  useEffect(() => {
    if (authLoading) return;
    if (!authUser || authRole !== 'admin') return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch user');
        }
        const data = await res.json();
        const u = data.user as UserDetail;
        setUserData(u);
        const fd = buildFormData(u);
        setFormData(fd);
        setOriginalFormData(fd);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser, authRole, authLoading, userId, buildFormData]);

  // ---------- Track changes ----------
  useEffect(() => {
    if (!formData || !originalFormData) {
      setHasChanges(false);
      return;
    }
    const changed = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    setHasChanges(changed);
  }, [formData, originalFormData]);

  // ---------- Form field updaters ----------
  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      updateField(name as keyof FormState, (e.target as HTMLInputElement).checked as never);
    } else {
      updateField(name as keyof FormState, value as never);
    }
  };

  // ---------- Save ----------
  const handleSave = async () => {
    if (!userData || !formData || !originalFormData || !hasChanges) return;
    setSaving(true);
    try {
      // Build the payload with only changed fields
      const payload: Record<string, unknown> = {};

      // Top-level fields
      if (formData.email !== originalFormData.email) {
        payload.email = formData.email;
      }
      if (formData.role !== originalFormData.role) {
        payload.role = formData.role;
      }
      if (formData.disabled !== originalFormData.disabled) {
        payload.disabled = formData.disabled;
      }

      // Profile-level names (all roles)
      if (formData.profile_first_name !== originalFormData.profile_first_name) {
        payload.first_name = formData.profile_first_name;
      }
      if (formData.profile_last_name !== originalFormData.profile_last_name) {
        payload.last_name = formData.profile_last_name;
      }

      // Vendor data (only if role is vendor)
      if (formData.role === 'vendor') {
        const vendorChanges: Record<string, unknown> = {};
        const vendorFields = [
          ['business_name', 'business_name'],
          ['vendor_phone', 'phone'],
          ['address', 'address'],
          ['city', 'city'],
          ['state', 'state'],
          ['zip', 'zip'],
          ['category', 'category'],
          ['description', 'description'],
          ['website', 'website'],
          ['subscription_tier', 'subscription_tier'],
          ['subscription_status', 'subscription_status'],
          ['logo_url', 'logo_url'],
          ['cover_url', 'cover_url'],
        ] as const;

        for (const [formKey, apiKey] of vendorFields) {
          if (formData[formKey] !== originalFormData[formKey]) {
            const val = formData[formKey];
            // Convert empty strings to null for nullable fields
            vendorChanges[apiKey] = val === '' ? null : val;
          }
        }

        if (Object.keys(vendorChanges).length > 0) {
          payload.vendor_data = vendorChanges;
        }
      }

      // Customer data (only if role is customer)
      if (formData.role === 'customer') {
        const customerChanges: Record<string, unknown> = {};
        const customerFields = [
          ['first_name', 'first_name'],
          ['last_name', 'last_name'],
          ['customer_phone', 'phone'],
          ['customer_city', 'city'],
          ['customer_state', 'state'],
          ['customer_zip', 'zip'],
          ['email_digest_opt_in', 'email_digest_opt_in'],
          ['review_email_opt_out', 'review_email_opt_out'],
        ] as const;

        for (const [formKey, apiKey] of customerFields) {
          if (formData[formKey] !== originalFormData[formKey]) {
            const val = formData[formKey];
            customerChanges[apiKey] = val === '' ? null : val;
          }
        }

        if (Object.keys(customerChanges).length > 0) {
          payload.customer_data = customerChanges;
        }
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update user');
      }

      // Re-fetch to get fresh data
      const refetchRes = await fetch(`/api/admin/users/${userId}`);
      if (refetchRes.ok) {
        const refetchData = await refetchRes.json();
        const u = refetchData.user as UserDetail;
        setUserData(u);
        const fd = buildFormData(u);
        setFormData(fd);
        setOriginalFormData(fd);
      }

      setToast({ message: 'User updated successfully', type: 'success' });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async () => {
    if (!userData) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete user');
      }
      router.push('/admin/users');
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete', type: 'error' });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ---------- Copy ID ----------
  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ---------- Toggle disabled ----------
  const toggleDisabled = () => {
    if (!formData) return;
    updateField('disabled', !formData.disabled);
  };

  // ---------- Reset Password ----------
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to reset password');
      }

      setNewPassword('');
      setShowPassword(false);
      setToast({ message: 'Password updated successfully', type: 'success' });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to reset password', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  // ---------- Loading / Error / Auth States ----------
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard className="h-56" />
            <SkeletonCard className="h-80" />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (!authUser || authRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (error || !userData || !formData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">{error || 'User not found'}</p>
          <Link href="/admin/users" className="mt-4 inline-block text-primary-500 hover:text-primary-600 font-medium text-sm">
            Return to users list
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete User"
        message={`Are you sure you want to delete "${userData.email}"? This will permanently remove the user account and all associated data. This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="danger"
        loading={deleting}
      />

      {/* Top Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        style={{ opacity: 0, animation: 'fadeIn 0.4s ease-out forwards' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Users
          </Link>
          <div className="hidden sm:block w-px h-6 bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-900 truncate max-w-md">
            {userData.email}
          </h1>
          <RoleBadge role={formData.role} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ==================== LEFT COLUMN ==================== */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Account Information Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
            style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.1s forwards' }}
          >
            <SectionHeader label="Account Information" color="from-primary-500 to-primary-300" />

            <div className="space-y-4">
              {/* Email */}
              <div>
                <FieldLabel>Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>First Name</FieldLabel>
                  <input
                    type="text"
                    name="profile_first_name"
                    value={formData.profile_first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <FieldLabel>Last Name</FieldLabel>
                  <input
                    type="text"
                    name="profile_last_name"
                    value={formData.profile_last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Role & Status row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Role</FieldLabel>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={formData.role} />
                    <span className="text-xs text-gray-400">(change in sidebar)</span>
                  </div>
                </div>
                <div>
                  <FieldLabel>Account Status</FieldLabel>
                  <button
                    type="button"
                    onClick={toggleDisabled}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
                      formData.disabled
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {formData.disabled ? (
                      <>
                        <ToggleLeft className="w-6 h-6" />
                        <span className="text-sm font-medium">Disabled</span>
                        <Ban className="w-4 h-4 ml-auto" />
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-6 h-6" />
                        <span className="text-sm font-medium">Active</span>
                        <CheckCircle className="w-4 h-4 ml-auto" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Read-only dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                <div>
                  <FieldLabel>Last Sign In</FieldLabel>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {userData.last_sign_in_at
                      ? formatDateTime(userData.last_sign_in_at)
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <FieldLabel>Account Created</FieldLabel>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(userData.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Vendor Profile Card (only if vendor) */}
          {formData.role === 'vendor' && (
            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
              style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.2s forwards' }}
            >
              <SectionHeader label="Vendor Profile" color="from-blue-500 to-blue-300" />

              <div className="space-y-4">
                {/* Business Name */}
                <div>
                  <FieldLabel>Business Name</FieldLabel>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="Business name"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="vendor_phone"
                      value={formData.vendor_phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                {/* Address grid */}
                <div>
                  <FieldLabel>Address</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="Street address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <FieldLabel>State</FieldLabel>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="FL"
                    />
                  </div>
                  <div>
                    <FieldLabel>ZIP</FieldLabel>
                    <input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="33101"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="e.g. Restaurant, Spa, Fitness"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                      placeholder="Business description..."
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <FieldLabel>Website URL</FieldLabel>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="https://www.example.com"
                    />
                  </div>
                </div>

                {/* Subscription Tier & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                  <div>
                    <FieldLabel>Subscription Tier</FieldLabel>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        name="subscription_tier"
                        value={formData.subscription_tier}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                      >
                        <option value="">None</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Subscription Status</FieldLabel>
                    <select
                      name="subscription_status"
                      value={formData.subscription_status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                    >
                      <option value="">None</option>
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                      <option value="past_due">Past Due</option>
                      <option value="canceled">Canceled</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                  </div>
                </div>

                {/* Logo & Cover URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Logo URL</FieldLabel>
                    <input
                      type="text"
                      name="logo_url"
                      value={formData.logo_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <FieldLabel>Cover URL</FieldLabel>
                    <input
                      type="text"
                      name="cover_url"
                      value={formData.cover_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Customer Profile Card (only if customer) */}
          {formData.role === 'customer' && (
            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
              style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.2s forwards' }}
            >
              <SectionHeader label="Customer Profile" color="from-green-500 to-green-300" />

              <div className="space-y-4">
                {/* Name grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>First Name</FieldLabel>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <FieldLabel>Last Name</FieldLabel>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <input
                      type="text"
                      name="customer_city"
                      value={formData.customer_city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <FieldLabel>State</FieldLabel>
                    <input
                      type="text"
                      name="customer_state"
                      value={formData.customer_state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="FL"
                    />
                  </div>
                  <div>
                    <FieldLabel>ZIP</FieldLabel>
                    <input
                      type="text"
                      name="customer_zip"
                      value={formData.customer_zip}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="33101"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="pt-3 border-t border-gray-50 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="email_digest_opt_in"
                      checked={formData.email_digest_opt_in}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500/20 transition-colors"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        Email Digest Opt In
                      </span>
                      <p className="text-xs text-gray-400">Receives weekly email digest of deals</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="review_email_opt_out"
                      checked={formData.review_email_opt_out}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500/20 transition-colors"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        Review Email Opt Out
                      </span>
                      <p className="text-xs text-gray-400">Opted out of review request emails</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="space-y-6">

          {/* 4. Quick Info Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
            style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.15s forwards' }}
          >
            <SectionHeader label="Quick Info" color="from-primary-500 to-primary-300" />

            <div className="space-y-4">
              {/* User ID */}
              <div>
                <FieldLabel>User ID</FieldLabel>
                <button
                  onClick={copyUserId}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-mono bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors w-full justify-between"
                >
                  <span className="truncate">{userId}</span>
                  {copiedId ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" /> : <Copy className="w-3 h-3 flex-shrink-0" />}
                </button>
              </div>

              {/* Role dropdown */}
              <div>
                <FieldLabel>Role</FieldLabel>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
                </select>
                {formData.role === 'admin' && formData.role !== originalFormData?.role && (
                  <p className="mt-1.5 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg">
                    Granting admin access gives full platform management privileges.
                  </p>
                )}
              </div>

              {/* Status toggle */}
              <div>
                <FieldLabel>Status</FieldLabel>
                <button
                  type="button"
                  onClick={toggleDisabled}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
                    formData.disabled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {formData.disabled ? (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span className="text-sm font-medium">Disabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span className="text-sm font-medium">Active</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dates */}
              <div className="pt-3 border-t border-gray-50 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Created</span>
                  <span className="text-gray-600 text-xs">{formatDate(userData.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last sign in</span>
                  <span className="text-gray-600 text-xs">
                    {userData.last_sign_in_at
                      ? relativeTime(userData.last_sign_in_at)
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Reset Password Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
            style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.2s forwards' }}
          >
            <SectionHeader label="Reset Password" color="from-amber-500 to-amber-300" />

            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="New password (min. 6 chars)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={savingPassword || !newPassword || newPassword.length < 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {savingPassword ? 'Updating...' : 'Reset Password'}
              </button>
            </div>
          </div>

          {/* 6. Stats Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
            style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.25s forwards' }}
          >
            <SectionHeader label="Stats" color="from-blue-500 to-blue-300" />

            <div className="grid grid-cols-2 gap-3">
              {formData.role === 'vendor' ? (
                <>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">{userData.deals_count}</span>
                    <p className="text-xs text-gray-500 mt-0.5">Deals</p>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center mx-auto mb-2">
                      <UserCircle className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">{userData.claims_count}</span>
                    <p className="text-xs text-gray-500 mt-0.5">Total Claims</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-primary-50 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center mx-auto mb-2">
                      <Tag className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">{userData.claims_count}</span>
                    <p className="text-xs text-gray-500 mt-0.5">Claims</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">{userData.deals_count}</span>
                    <p className="text-xs text-gray-500 mt-0.5">Redeemed</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 6. Recent Support Tickets Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
            style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.35s forwards' }}
          >
            <SectionHeader label="Recent Support Tickets" color="from-amber-500 to-amber-300" />

            {userData.support_tickets && userData.support_tickets.length > 0 ? (
              <div className="space-y-3">
                {userData.support_tickets.slice(0, 5).map((ticket) => {
                  const statusStyle = ticketStatusColors[ticket.status] || ticketStatusColors.open;
                  return (
                    <Link
                      key={ticket.id}
                      href={`/admin/support/${ticket.id}`}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors group -mx-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Ticket className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate max-w-[180px] group-hover:text-gray-900 transition-colors">
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-gray-400">
                            {relativeTime(ticket.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No support tickets</p>
              </div>
            )}
          </div>

          {/* 7. Danger Zone Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-6 hover:shadow-md transition-all duration-300"
            style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.45s forwards' }}
          >
            <SectionHeader label="Danger Zone" color="from-red-500 to-red-300" />

            <div className="space-y-3">
              <button
                type="button"
                onClick={toggleDisabled}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  formData.disabled
                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                    : 'text-red-600 bg-red-50 hover:bg-red-100'
                }`}
              >
                {formData.disabled ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Enable User
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Disable User
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete User Permanently
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global keyframe styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
