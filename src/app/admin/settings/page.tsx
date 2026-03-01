'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Settings,
  Globe,
  CreditCard,
  Star,
  Tag,
  Shield,
  Zap,
  Crown,
  Building2,
  Gem,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Pencil,
  X,
  Camera,
} from 'lucide-react';

// ─── Subscription tier display (read-only reference) ─────────────────────────

const SUBSCRIPTION_TIERS = [
  { name: 'Starter', price: '$49/mo', icon: Zap, color: 'bg-gray-100 text-gray-600', borderColor: 'border-gray-200' },
  { name: 'Pro', price: '$99/mo', icon: Crown, color: 'bg-primary-50 text-primary-600', borderColor: 'border-primary-200' },
  { name: 'Business', price: '$199/mo', icon: Building2, color: 'bg-accent-50 text-accent-600', borderColor: 'border-accent-200' },
  { name: 'Enterprise', price: '$499/mo', icon: Gem, color: 'bg-blue-50 text-blue-600', borderColor: 'border-blue-200' },
];

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-up-fade">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

// ─── Editable Settings Card ──────────────────────────────────────────────────

interface EditableCardProps {
  title: string;
  icon: React.ReactNode;
  settingKey: string;
  data: Record<string, string>;
  labels: Record<string, string>;
  onSave: (key: string, value: Record<string, string>) => Promise<void>;
}

function EditableSettingsCard({ title, icon, settingKey, data, labels, onSave }: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...data });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...data });
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settingKey, form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...data });
    setEditing(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(labels).map(([fieldKey, label]) => (
          <div key={fieldKey} className={`flex flex-col gap-1 p-3 rounded-lg ${editing ? 'bg-white border border-gray-200' : 'bg-gray-50'}`}>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
            {editing ? (
              <input
                type="text"
                value={form[fieldKey] || ''}
                onChange={(e) => setForm({ ...form, [fieldKey]: e.target.value })}
                className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-900">{data[fieldKey] || '--'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

// Default settings (fallback if API/DB unavailable)
const DEFAULTS: Record<string, Record<string, string>> = {
  sponti_points: {
    earning_rate: '25 points per claim',
    redemption_rate: '500 points = $5 off next deal',
    first_claim_bonus: '25 points (25 cents)',
    expiry_policy: '12 months of inactivity',
  },
  deal_config: {
    deal_types: 'Regular, SpontiCoupon (deposit-based)',
    max_claim_period: '7 days',
    qr_code_format: 'UUID-based',
  },
  system_limits: {
    max_image_size: '5 MB',
    supported_formats: 'JPEG, PNG, WebP',
    api_rate_limit: '100 requests/min',
  },
  platform_info: {
    name: 'SpontiCoupon',
    version: '1.0.0',
    environment: 'Production',
  },
};

export default function AdminSettingsPage() {
  const { user, firstName, lastName, avatarUrl, setAvatarUrl } = useAuth();

  // Platform settings from API/DB
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>(DEFAULTS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Profile form state
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({ first_name: '', last_name: '', email: '' });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Avatar state
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load profile data
  const loadProfile = useCallback(() => {
    if (user) {
      const data = { first_name: firstName || '', last_name: lastName || '', email: user.email || '' };
      setProfileForm(data);
      setOriginalProfile(data);
      setProfileLoaded(true);
    }
  }, [user, firstName, lastName]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Sync avatar
  useEffect(() => {
    if (avatarUrl) setCurrentAvatar(avatarUrl);
  }, [avatarUrl]);

  // Load platform settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings || DEFAULTS);
        }
      } catch {
        // Use defaults on error
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const profileHasChanges = profileLoaded && (
    profileForm.first_name !== originalProfile.first_name ||
    profileForm.last_name !== originalProfile.last_name ||
    profileForm.email !== originalProfile.email
  );

  // Save profile
  const handleSaveProfile = async () => {
    if (!profileHasChanges) return;
    setSavingProfile(true);
    try {
      const payload: Record<string, string> = {};
      if (profileForm.first_name !== originalProfile.first_name) payload.first_name = profileForm.first_name;
      if (profileForm.last_name !== originalProfile.last_name) payload.last_name = profileForm.last_name;
      if (profileForm.email !== originalProfile.email) payload.email = profileForm.email;

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }
      setOriginalProfile({ ...profileForm });
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to save', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update password');
      }
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setToast({ message: 'Password updated successfully', type: 'success' });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to reset password', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await res.json();
      setCurrentAvatar(data.url);
      setAvatarUrl(data.url); // Update sidebar avatar immediately
      setToast({ message: 'Profile picture updated', type: 'success' });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to upload', type: 'error' });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Save a platform setting
  const handleSaveSetting = async (key: string, value: Record<string, string>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save setting');
      }
      setSettings((prev) => ({ ...prev, [key]: value }));
      setToast({ message: 'Setting saved successfully', type: 'success' });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to save', type: 'error' });
      throw err;
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your profile and platform configuration</p>
        </div>
      </div>

      {/* ── My Profile + Password ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Profile Info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
          </div>
          <div className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center border-2 border-gray-200">
                    <span className="text-xl font-bold text-primary-500">
                      {profileForm.first_name?.[0]?.toUpperCase() || profileForm.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {[profileForm.first_name, profileForm.last_name].filter(Boolean).join(' ') || 'Admin'}
                </p>
                <p className="text-xs text-gray-400">Hover over the image to change</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={!profileHasChanges || savingProfile}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Re-enter new password"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
            <button
              onClick={handleResetPassword}
              disabled={savingPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Platform Info (editable) ──────────────────────────────────── */}
      <div className="mb-6">
        <EditableSettingsCard
          title="Platform Info"
          icon={<Globe className="w-5 h-5 text-primary-500" />}
          settingKey="platform_info"
          data={settingsLoading ? DEFAULTS.platform_info : settings.platform_info || DEFAULTS.platform_info}
          labels={{ name: 'App Name', version: 'Version', environment: 'Environment' }}
          onSave={handleSaveSetting}
        />
      </div>

      {/* ── Subscription Tiers (read-only reference) ──────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900">Subscription Tiers</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div key={tier.name} className={`card p-5 border-t-4 ${tier.borderColor}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${tier.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${tier.color}`}>
                    {tier.name}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{tier.price}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SpontiPoints Configuration (editable) ─────────────────────── */}
      <div className="mb-6">
        <EditableSettingsCard
          title="SpontiPoints Configuration"
          icon={<Star className="w-5 h-5 text-primary-500" />}
          settingKey="sponti_points"
          data={settingsLoading ? DEFAULTS.sponti_points : settings.sponti_points || DEFAULTS.sponti_points}
          labels={{
            earning_rate: 'Earning Rate',
            redemption_rate: 'Redemption Rate',
            first_claim_bonus: 'First Claim Bonus',
            expiry_policy: 'Expiry Policy',
          }}
          onSave={handleSaveSetting}
        />
      </div>

      {/* ── Deal Configuration (editable) ─────────────────────────────── */}
      <div className="mb-6">
        <EditableSettingsCard
          title="Deal Configuration"
          icon={<Tag className="w-5 h-5 text-primary-500" />}
          settingKey="deal_config"
          data={settingsLoading ? DEFAULTS.deal_config : settings.deal_config || DEFAULTS.deal_config}
          labels={{
            deal_types: 'Deal Types',
            max_claim_period: 'Max Claim Period',
            qr_code_format: 'QR Code Format',
          }}
          onSave={handleSaveSetting}
        />
      </div>

      {/* ── System Limits (editable) ──────────────────────────────────── */}
      <EditableSettingsCard
        title="System Limits"
        icon={<Shield className="w-5 h-5 text-primary-500" />}
        settingKey="system_limits"
        data={settingsLoading ? DEFAULTS.system_limits : settings.system_limits || DEFAULTS.system_limits}
        labels={{
          max_image_size: 'Max Deal Image Size',
          supported_formats: 'Supported Image Formats',
          api_rate_limit: 'API Rate Limit',
        }}
        onSave={handleSaveSetting}
      />
    </div>
  );
}
