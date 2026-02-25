'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { Deal, DealStatus } from '@/lib/types/database';
import {
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  X,
  Eye,
  Users,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Star,
  Copy,
  Check,
  Loader2,
  ImageIcon,
  Clock,
  Video,
  Plus,
} from 'lucide-react';

// ---------- Types ----------

interface Analytics {
  timeline: { date: string; claims: number; redemptions: number; views: number }[];
  total_claims: number;
  total_redemptions: number;
  total_views: number;
  conversion_rate: number;
  recent_claims: { id: string; customer_email: string; created_at: string }[];
}

interface CategoryOption {
  id: string;
  name: string;
}

// ---------- Helpers ----------

function toLocalDatetimeValue(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

const statusColors: Record<DealStatus, { dot: string; bg: string; text: string }> = {
  active: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  draft: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  paused: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  expired: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500' },
};

// ---------- Animated Counter Hook ----------

function useAnimatedCounter(target: number, duration = 500): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ---------- Sub-components ----------

function AnimatedStat({ icon: Icon, value, label, suffix = '', color }: {
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  color: string;
}) {
  const animatedValue = useAnimatedCounter(value);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-1 hover:shadow-md transition-all duration-300">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xl font-bold text-secondary-500">
        {animatedValue}{suffix}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function ArrayEditor({ items, onChange, placeholder }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    onChange([...items, '']);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="text-red-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-primary-500 text-sm font-medium hover:text-primary-600 transition-colors"
      >
        + Add item
      </button>
    </div>
  );
}

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

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-up-fade">
      <div className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl shadow-lg">
        <Check className="w-4 h-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

// ---------- Main Page Component ----------

export default function AdminDealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const dealId = params.id as string;

  // Data state
  const [deal, setDeal] = useState<Deal | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  // ---------- Build form data from deal ----------
  const buildFormData = useCallback((d: Deal) => {
    return {
      title: d.title,
      description: d.description || '',
      deal_type: d.deal_type,
      status: d.status,
      category_id: d.category_id || '',
      original_price: d.original_price,
      deal_price: d.deal_price,
      discount_percentage: d.discount_percentage,
      deposit_amount: d.deposit_amount ?? '',
      max_claims: d.max_claims ?? '',
      starts_at: toLocalDatetimeValue(d.starts_at),
      expires_at: toLocalDatetimeValue(d.expires_at),
      timezone: d.timezone || '',
      image_url: d.image_url || '',
      image_urls: d.image_urls || [],
      website_url: d.website_url || '',
      how_it_works: d.how_it_works || '',
      highlights: d.highlights || [],
      amenities: d.amenities || [],
      fine_print: d.fine_print || '',
      terms_and_conditions: d.terms_and_conditions || '',
      video_urls: d.video_urls || [],
    };
  }, []);

  // ---------- Fetch data ----------
  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'admin') return;

    const fetchData = async () => {
      try {
        // Fetch deals list and find the one we need
        const [dealsRes, catRes] = await Promise.all([
          fetch('/api/admin/deals'),
          fetch('/api/admin/categories'),
        ]);

        if (!dealsRes.ok) throw new Error('Failed to fetch deals');
        const dealsData = await dealsRes.json();
        const foundDeal = (dealsData.deals || []).find((d: Deal) => d.id === dealId);
        if (!foundDeal) { setError('Deal not found'); setLoading(false); return; }

        setDeal(foundDeal);
        const fd = buildFormData(foundDeal);
        setFormData(fd);
        setOriginalData(fd);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        // Fetch analytics (may not exist)
        try {
          const analyticsRes = await fetch(`/api/admin/deals/${dealId}/analytics`);
          if (analyticsRes.ok) {
            const analyticsData = await analyticsRes.json();
            setAnalytics(analyticsData);
          }
        } catch {
          // Analytics endpoint may not exist — silently skip
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load deal');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, role, authLoading, dealId, buildFormData]);

  // ---------- Track changes ----------
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  // ---------- Form field updaters ----------
  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      updateField(name, value === '' ? '' : Number(value));
    } else {
      updateField(name, value);
    }
  };

  // ---------- Image upload ----------
  const handleImageUpload = async (file: File) => {
    if (!deal) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'deal-images');
      fd.append('user_id', deal.vendor_id);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      updateField('image_url', data.url);
    } catch {
      setToast('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // ---------- Gallery image upload ----------
  const handleGalleryImageUpload = async (file: File) => {
    if (!deal) return;
    setUploadingGallery(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'deal-images');
      fd.append('user_id', deal.vendor_id);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const currentUrls = (formData.image_urls as string[]) || [];
      updateField('image_urls', [...currentUrls, data.url]);
      setToast('Gallery image added');
    } catch {
      setToast('Failed to upload gallery image');
    } finally {
      setUploadingGallery(false);
    }
  };

  // ---------- Remove gallery image ----------
  const removeGalleryImage = (index: number) => {
    const currentUrls = [...(formData.image_urls as string[])];
    currentUrls.splice(index, 1);
    updateField('image_urls', currentUrls);
  };

  // ---------- Video upload ----------
  const handleVideoUpload = async (file: File) => {
    if (!deal) return;
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'deal-videos');
      fd.append('user_id', deal.vendor_id);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const currentUrls = (formData.video_urls as string[]) || [];
      updateField('video_urls', [...currentUrls, data.url]);
      setToast('Video uploaded successfully');
    } catch {
      setToast('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  // ---------- Remove video ----------
  const removeVideo = (index: number) => {
    const currentUrls = [...(formData.video_urls as string[])];
    currentUrls.splice(index, 1);
    updateField('video_urls', currentUrls);
  };

  // ---------- Save ----------
  const handleSave = async () => {
    if (!deal || !hasChanges) return;
    setSaving(true);
    try {
      // Build only changed fields
      const changedFields: Record<string, unknown> = {};
      for (const key of Object.keys(formData)) {
        if (JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
          let val = formData[key];
          // Convert date fields to ISO
          if ((key === 'starts_at' || key === 'expires_at') && typeof val === 'string' && val) {
            val = new Date(val).toISOString();
          }
          // Convert empty strings to null for nullable fields
          if (val === '' && ['deposit_amount', 'max_claims', 'category_id', 'description', 'how_it_works', 'fine_print', 'terms_and_conditions', 'website_url', 'image_url'].includes(key)) {
            val = null;
          }
          changedFields[key] = val;
        }
      }

      const res = await fetch(`/api/admin/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedFields),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update deal');
      }

      const { deal: updatedDeal } = await res.json();
      setDeal(updatedDeal);
      const fd = buildFormData(updatedDeal);
      setFormData(fd);
      setOriginalData(fd);
      setToast('Deal updated successfully');
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async () => {
    if (!deal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/deals/${deal.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete deal');
      }
      router.push('/admin/deals');
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ---------- Copy ID ----------
  const copyDealId = () => {
    navigator.clipboard.writeText(dealId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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
            <SkeletonCard className="h-72" />
            <SkeletonCard />
            <SkeletonCard />
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

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Link href="/admin/deals" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-secondary-500 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-lg">{error || 'Deal not found'}</p>
          <Link href="/admin/deals" className="mt-4 inline-block text-primary-500 hover:text-primary-600 font-medium text-sm">
            Return to deals list
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Derived ----------
  const savings = (formData.original_price as number) - (formData.deal_price as number);
  const currentStatus = formData.status as DealStatus;
  const statusStyle = statusColors[currentStatus] || statusColors.draft;

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto p-6">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-lg font-bold text-secondary-500 mb-2">Delete Deal</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete &quot;{deal.title}&quot;? This will permanently remove the deal and all associated claims. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]">
        <Link
          href="/admin/deals"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-secondary-500 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Deals
        </Link>
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

          {/* 1. Hero Image Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.1s_forwards]"
          >
            <div className="relative">
              {formData.image_url ? (
                <>
                  <img
                    src={formData.image_url as string}
                    alt={formData.title as string}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImage ? 'Uploading...' : 'Change Image'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => updateField('image_url', '')}
                      className="p-1.5 text-white bg-black/50 backdrop-blur-sm rounded-lg hover:bg-red-500/80 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer block">
                  <div className="h-64 bg-gradient-to-br from-primary-500 to-secondary-500 flex flex-col items-center justify-center gap-3 group">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      {uploadingImage ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <span className="text-white/90 text-sm font-medium">
                      {uploadingImage ? 'Uploading...' : 'Upload Deal Image'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Gallery images */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gallery Images</span>
                <span className="text-xs text-gray-400">({(formData.image_urls as string[]).length})</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(formData.image_urls as string[]).map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`Gallery ${i + 1}`}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-gray-100 group-hover:border-primary-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Upload button */}
                <label className="cursor-pointer">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary-400 flex flex-col items-center justify-center gap-1 transition-colors">
                    {uploadingGallery ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-gray-400" />
                        <span className="text-[10px] text-gray-400">Add</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingGallery}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGalleryImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 2. Title & Description Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.2s_forwards]">
            <div className="mb-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-300" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Title & Description</span>
              </div>
            </div>
            <input
              type="text"
              name="title"
              value={formData.title as string}
              onChange={handleInputChange}
              className="w-full text-2xl font-bold text-secondary-500 border-0 border-b-2 border-transparent focus:border-primary-500 bg-transparent px-0 py-2 outline-none transition-all duration-200 placeholder:text-gray-300"
              placeholder="Deal title..."
            />
            <textarea
              name="description"
              value={formData.description as string}
              onChange={handleInputChange}
              rows={4}
              className="w-full mt-3 px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
              placeholder="Describe this deal..."
            />
          </div>

          {/* 3. Deal Details Card (Collapsible) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.3s_forwards]">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-gradient-to-r from-accent-500 to-accent-300" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Details</span>
              </div>
              {detailsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {detailsExpanded && (
              <div className="px-6 pb-6 space-y-5 border-t border-gray-50 pt-4">
                {/* How It Works */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">How It Works</label>
                  <textarea
                    name="how_it_works"
                    value={formData.how_it_works as string}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                    placeholder="Explain how the deal works..."
                  />
                </div>

                {/* Highlights */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Highlights</label>
                  <ArrayEditor
                    items={formData.highlights as string[]}
                    onChange={(items) => updateField('highlights', items)}
                    placeholder="Add a highlight..."
                  />
                </div>

                {/* Amenities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amenities</label>
                  <ArrayEditor
                    items={formData.amenities as string[]}
                    onChange={(items) => updateField('amenities', items)}
                    placeholder="Add an amenity..."
                  />
                </div>

                {/* Fine Print */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fine Print</label>
                  <textarea
                    name="fine_print"
                    value={formData.fine_print as string}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                    placeholder="Fine print details..."
                  />
                </div>

                {/* Terms & Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
                  <textarea
                    name="terms_and_conditions"
                    value={formData.terms_and_conditions as string}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                    placeholder="Terms and conditions..."
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
                  <input
                    type="url"
                    name="website_url"
                    value={formData.website_url as string}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                {/* Videos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Videos</label>
                  <div className="space-y-2">
                    {(formData.video_urls as string[]).map((url, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                        <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate flex-1" title={url}>
                          {url.split('/').pop() || url}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVideo(i)}
                          className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-500 hover:text-primary-600 border border-dashed border-gray-200 hover:border-primary-400 rounded-lg transition-colors">
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading video...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Video
                        </>
                      )}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                        className="hidden"
                        disabled={uploadingVideo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="text-xs text-gray-400">MP4, WebM, MOV, or AVI. Max 100MB.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="space-y-6">

          {/* 4. Status & Settings Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.15s_forwards]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-300" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status & Settings</span>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${statusStyle.dot} animate-pulse`} />
                  <select
                    name="status"
                    value={formData.status as string}
                    onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Deal Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Deal Type</label>
                <select
                  name="deal_type"
                  value={formData.deal_type as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="regular">Steady</option>
                  <option value="sponti_coupon">Sponti Coupon</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-medium text-gray-500">Featured</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/deals/${deal.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_featured: true }),
                      });
                      if (res.ok) setToast('Featured status updated');
                    } catch { /* silent */ }
                  }}
                  className="p-2 rounded-lg text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors"
                >
                  <Star className="w-5 h-5 fill-yellow-400" />
                </button>
              </div>

              {/* Vendor */}
              {deal.vendor && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Vendor</label>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-50 text-secondary-500 rounded-lg text-sm font-medium">
                    {deal.vendor.business_name}
                  </div>
                </div>
              )}

              {/* Deal ID */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Deal ID</label>
                <button
                  onClick={copyDealId}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-mono bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {dealId.slice(0, 8)}...
                  {copiedId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* 5. Pricing Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.25s_forwards]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-green-500 to-green-300" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pricing</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Original Price</label>
                <input
                  type="number"
                  name="original_price"
                  value={formData.original_price as number}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Deal Price</label>
                <input
                  type="number"
                  name="deal_price"
                  value={formData.deal_price as number}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Discount %</label>
                <input
                  type="number"
                  name="discount_percentage"
                  value={formData.discount_percentage as number}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Deposit Amount</label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={formData.deposit_amount as number | ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Optional"
                />
              </div>

              {/* Savings */}
              {savings > 0 && (
                <div className="mt-2 p-3 bg-green-50 rounded-xl text-center">
                  <span className="text-green-700 text-sm font-semibold">
                    {formatCurrency(savings)} off ({String(formData.discount_percentage || 0)}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 6. Limits & Schedule Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.35s_forwards]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-300" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Limits & Schedule</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Claims</label>
                <input
                  type="number"
                  name="max_claims"
                  value={formData.max_claims as number | ''}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Claims Count</label>
                <div className="text-xl font-bold text-secondary-500 px-1">
                  {deal.claims_count}
                  {deal.max_claims != null && (
                    <span className="text-gray-400 text-sm font-normal"> / {deal.max_claims}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  name="starts_at"
                  value={formData.starts_at as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Expires At</label>
                <input
                  type="datetime-local"
                  name="expires_at"
                  value={formData.expires_at as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
                <input
                  type="text"
                  name="timezone"
                  value={formData.timezone as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="America/New_York"
                />
              </div>
            </div>
          </div>

          {/* 7. Performance Stats Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.45s_forwards]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-300" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AnimatedStat
                icon={Eye}
                value={analytics?.total_views ?? 0}
                label="Total Views"
                color="bg-blue-50 text-blue-600"
              />
              <AnimatedStat
                icon={Users}
                value={analytics?.total_claims ?? 0}
                label="Total Claims"
                color="bg-primary-50 text-primary-600"
              />
              <AnimatedStat
                icon={CheckCircle}
                value={analytics?.total_redemptions ?? 0}
                label="Redemptions"
                color="bg-green-50 text-green-600"
              />
              <AnimatedStat
                icon={TrendingUp}
                value={analytics?.conversion_rate ? Math.round(analytics.conversion_rate * 100) : 0}
                label="Conversion"
                suffix="%"
                color="bg-purple-50 text-purple-600"
              />
            </div>
          </div>

          {/* 8. Performance Chart Card */}
          {analytics && analytics.timeline.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.55s_forwards]">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary-500 to-green-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trends</span>
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="claimsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E8632B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E8632B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="redemptionsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="claims"
                      stroke="#E8632B"
                      strokeWidth={2}
                      fill="url(#claimsFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="redemptions"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#redemptionsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-xs text-gray-500">Claims</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">Redemptions</span>
                </div>
              </div>
            </div>
          )}

          {/* 9. Recent Activity Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_0.65s_forwards]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-300" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Activity</span>
            </div>

            {analytics && analytics.recent_claims.length > 0 ? (
              <div className="space-y-3">
                {analytics.recent_claims.slice(0, 5).map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-primary-500" />
                      </div>
                      <span className="text-sm text-gray-700 truncate max-w-[180px]">{claim.customer_email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {relativeTime(claim.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No claims yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
