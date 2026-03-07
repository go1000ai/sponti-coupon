'use client';

import { useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
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
import type { Deal, DealStatus, VendorLocation } from '@/lib/types/database';
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
  Star,
  Copy,
  Check,
  Loader2,
  ImageIcon,
  Clock,
  Video,
  Plus,
  Wand2,
  Info,
  Sparkles,
  DollarSign,
  FileText,
  MapPin,
  Calendar,
  ClipboardList,
  Globe,
} from 'lucide-react';
import ImagePickerModal from '@/components/vendor/ImagePickerModal';
import type { SelectedImage } from '@/components/vendor/ImagePickerModal';

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

function BentoCard({
  icon,
  title,
  summary,
  open,
  onToggle,
  color = 'gray',
  children,
}: {
  icon: ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  color?: string;
  children: ReactNode;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; border: string; ring: string }> = {
    gray: { bg: 'bg-white', iconBg: 'bg-gray-100 text-gray-600', border: 'border-gray-200', ring: 'ring-gray-300' },
    orange: { bg: 'bg-white', iconBg: 'bg-primary-50 text-primary-600', border: 'border-primary-200', ring: 'ring-primary-300' },
    blue: { bg: 'bg-white', iconBg: 'bg-blue-50 text-blue-600', border: 'border-blue-200', ring: 'ring-blue-300' },
    green: { bg: 'bg-white', iconBg: 'bg-green-50 text-green-600', border: 'border-green-200', ring: 'ring-green-300' },
    amber: { bg: 'bg-white', iconBg: 'bg-amber-50 text-amber-600', border: 'border-amber-200', ring: 'ring-amber-300' },
    emerald: { bg: 'bg-white', iconBg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-300' },
  };
  const c = colorMap[color] || colorMap.gray;

  return (
    <div className={`${c.bg} rounded-2xl border ${open ? c.border + ' ring-2 ' + c.ring : 'border-gray-200'} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 truncate">{summary}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t border-gray-100 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

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
      <span className="text-xl font-bold text-gray-900">
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
  const { t, locale } = useLanguage();
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

  // Bento sections open state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ content: true });
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Media library & AI state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [showAddImageMenu, setShowAddImageMenu] = useState(false);
  const [showAiImageInput, setShowAiImageInput] = useState(false);

  // Close the add-image dropdown when clicking outside
  useEffect(() => {
    if (!showAddImageMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-add-image-menu]')) setShowAddImageMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddImageMenu]);
  const [aiVideoLoading, setAiVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoElapsed, setVideoElapsed] = useState(0);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoSourceImage, setVideoSourceImage] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [originalTags, setOriginalTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [generatingTags, setGeneratingTags] = useState(false);
  const [avaLoading, setAvaLoading] = useState(false);
  const [generatingAmenities, setGeneratingAmenities] = useState(false);
  const [suggestedAmenities, setSuggestedAmenities] = useState<string[]>([]);
  const [suggestedHighlights, setSuggestedHighlights] = useState<string[]>([]);

  // Ava terms assistant state
  const [avaTermsPrompt, setAvaTermsPrompt] = useState('');
  const [avaTermsField, setAvaTermsField] = useState<'how_it_works' | 'terms_and_conditions' | 'fine_print'>('how_it_works');
  const [avaTermsLoading, setAvaTermsLoading] = useState(false);

  // Location state
  const [locationMode, setLocationMode] = useState<'all' | 'specific' | 'none' | 'website'>('all');
  const [vendorLocations, setVendorLocations] = useState<VendorLocation[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', city: '', state: '', zip: '' });

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
      search_tags: d.search_tags || [],
    };
  }, []);

  // ---------- Fetch data ----------
  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'admin') return;

    const fetchData = async () => {
      try {
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
        setOriginalData({ ...fd });
        setSearchTags(foundDeal.search_tags || []);
        setOriginalTags(foundDeal.search_tags || []);

        // Initialize location mode from deal data
        if (foundDeal.website_url) {
          setLocationMode('website');
        } else if (foundDeal.location_ids === null) {
          setLocationMode('all');
        } else if (foundDeal.location_ids && foundDeal.location_ids.length > 0) {
          setLocationMode('specific');
          setSelectedLocationIds(foundDeal.location_ids);
        } else {
          setLocationMode('none');
        }

        // Fetch vendor's locations for the location picker
        try {
          const locRes = await fetch(`/api/admin/vendors/${foundDeal.vendor_id}/locations`);
          if (locRes.ok) {
            const locData = await locRes.json();
            setVendorLocations(locData.locations || []);
          }
        } catch {
          // Vendor locations endpoint may not exist — silently skip
        }

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

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
    const formChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
    const tagsChanged = JSON.stringify(searchTags) !== JSON.stringify(originalTags);
    setHasChanges(formChanged || tagsChanged);
  }, [formData, originalData, searchTags, originalTags]);

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

  // ---------- Video progress animation ----------
  useEffect(() => {
    if (!aiVideoLoading) { setVideoProgress(0); setVideoElapsed(0); return; }
    const interval = setInterval(() => {
      setVideoElapsed(prev => prev + 1);
      setVideoProgress(prev => {
        if (prev >= 90) return 90;
        if (prev < 30) return prev + 2;
        if (prev < 60) return prev + 1;
        return prev + 0.3;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [aiVideoLoading]);

  // ---------- AI Image Generation ----------
  const handleAiImageGenerate = async () => {
    if (!deal) return;
    if (!formData.title && !customImagePrompt) { setError('Enter a deal title or describe the image you want.'); return; }
    setAiImageLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || customImagePrompt,
          description: formData.description,
          custom_prompt: customImagePrompt || undefined,
          vendor_id: deal.vendor_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate image'); setAiImageLoading(false); return; }
      updateField('image_url', data.url);
      setToast('AI image generated');
    } catch { setError('Failed to generate image.'); }
    setAiImageLoading(false);
  };

  // ---------- AI Video Generation ----------
  const handleAiVideoGenerate = async () => {
    if (!deal) return;
    const sourceImage = videoSourceImage || (formData.image_url as string);
    if (!sourceImage) { setError('Add a deal image first so Ava can turn it into a video.'); return; }
    setAiVideoLoading(true);
    setVideoProgress(0);
    setVideoElapsed(0);
    setError('');
    try {
      const startRes = await fetch('/api/vendor/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: sourceImage,
          title: formData.title,
          description: formData.description,
          video_prompt: videoPrompt || undefined,
          vendor_id: deal.vendor_id,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) { setError(startData.error || 'Failed to generate video'); setAiVideoLoading(false); return; }
      if (startData.status === 'done' && startData.url) {
        const currentUrls = (formData.video_urls as string[]) || [];
        updateField('video_urls', [...currentUrls, startData.url]);
        setAiVideoLoading(false);
        setToast('AI video generated');
        return;
      }

      let operationName = startData.operation_name;
      if (!operationName) { setError('Failed to start video generation'); setAiVideoLoading(false); return; }

      const maxPollTime = 5 * 60 * 1000;
      const pollInterval = 10_000;
      const pollStart = Date.now();
      while (Date.now() - pollStart < maxPollTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const pollRes = await fetch('/api/vendor/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation_name: operationName, vendor_id: deal.vendor_id }),
        });
        const pollData = await pollRes.json();
        if (!pollRes.ok) { setError(pollData.error || 'Video generation failed'); setAiVideoLoading(false); return; }
        if (pollData.retried && pollData.operation_name) { operationName = pollData.operation_name; continue; }
        if (pollData.status === 'done' && pollData.url) {
          const currentUrls = (formData.video_urls as string[]) || [];
          updateField('video_urls', [...currentUrls, pollData.url]);
          setAiVideoLoading(false);
          setToast('AI video generated');
          return;
        }
      }
      setError('Video generation timed out.');
    } catch { setError('Failed to generate video.'); }
    setAiVideoLoading(false);
  };

  // ---------- AI Tag Generation ----------
  const generateSearchTags = async () => {
    if (!deal) return;
    if (!(formData.title as string)?.trim()) { setError('Enter a deal title first.'); return; }
    setGeneratingTags(true);
    try {
      const res = await fetch('/api/vendor/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          deal_type: deal.deal_type || 'regular',
          original_price: formData.original_price ? Number(formData.original_price) : null,
          deal_price: formData.deal_price ? Number(formData.deal_price) : null,
          vendor_id: deal.vendor_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to generate tags');
      else setSearchTags(data.tags || []);
    } catch { setError('Failed to generate tags.'); }
    setGeneratingTags(false);
  };

  // ---------- AI Amenity/Highlight Suggestions ----------
  const generateAmenitySuggestions = async () => {
    if (!deal) return;
    if (!(formData.title as string)?.trim()) { setError('Enter a deal title first.'); return; }
    setGeneratingAmenities(true);
    setSuggestedAmenities([]);
    setSuggestedHighlights([]);
    try {
      const res = await fetch('/api/vendor/generate-amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: deal.category_id,
          existing_amenities: formData.amenities,
          existing_highlights: formData.highlights,
          vendor_id: deal.vendor_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to generate suggestions');
      else {
        setSuggestedAmenities(data.amenities || []);
        setSuggestedHighlights(data.highlights || []);
      }
    } catch { setError('Failed to generate suggestions.'); }
    setGeneratingAmenities(false);
  };

  const handleAvaTerms = async () => {
    if (!deal) return;
    if (!avaTermsPrompt.trim()) { setError('Tell Ava what you need.'); return; }
    setAvaTermsLoading(true);
    try {
      const res = await fetch('/api/vendor/generate-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          instruction: avaTermsPrompt,
          field: avaTermsField,
          current_value: formData[avaTermsField] || '',
          vendor_id: deal.vendor_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Ava could not generate text');
      else {
        setFormData(prev => ({ ...prev, [data.field]: data.text }));
        setAvaTermsPrompt('');
      }
    } catch { setError('Failed to generate text.'); }
    setAvaTermsLoading(false);
  };

  // ---------- Ava AI Enhance ----------
  const handleAvaEnhance = async () => {
    if (!deal) return;
    setAvaLoading(true);
    try {
      const res = await fetch('/api/vendor/ai-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: deal.vendor_id,
          deal_type: formData.deal_type,
          locale,
          prompt: `Improve this existing deal: "${formData.title}". Description: "${formData.description}". Category: ${deal.category_id || 'general'}. Original price: $${formData.original_price}, Deal price: $${formData.deal_price}.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || 'Ava could not enhance this deal');
      } else {
        const s = data.suggestion;
        setFormData(prev => ({
          ...prev,
          ...(s.title && { title: s.title }),
          ...(s.description && { description: s.description }),
          ...(s.how_it_works && { how_it_works: s.how_it_works }),
          ...(s.highlights?.length && { highlights: s.highlights }),
          ...(s.fine_print && { fine_print: s.fine_print }),
          ...(s.terms_and_conditions && { terms_and_conditions: s.terms_and_conditions }),
          ...(s.original_price && { original_price: s.original_price }),
          ...(s.deal_price && { deal_price: s.deal_price }),
        }));
        setHasChanges(true);
        setToast('Ava enhanced the deal! Review the changes below.');
      }
    } catch {
      setToast('Failed to connect to Ava.');
    }
    setAvaLoading(false);
  };

  // ---------- Save ----------
  const handleSave = async () => {
    if (!deal || !hasChanges) return;
    setSaving(true);
    try {
      formData.search_tags = searchTags;

      const changedFields: Record<string, unknown> = {};
      const skipFields = ['category_id'];
      for (const key of Object.keys(formData)) {
        if (skipFields.includes(key)) continue;
        if (JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
          let val = formData[key];
          if ((key === 'starts_at' || key === 'expires_at') && typeof val === 'string' && val) {
            val = new Date(val).toISOString();
          }
          if (val === '' && ['deposit_amount', 'max_claims', 'description', 'how_it_works', 'fine_print', 'terms_and_conditions', 'website_url', 'image_url'].includes(key)) {
            val = null;
          }
          changedFields[key] = val;
        }
      }

      // Always include location fields based on locationMode
      let locationIds: string[] | null = null;
      if (locationMode === 'specific' && selectedLocationIds.length > 0) locationIds = selectedLocationIds;
      else if (locationMode === 'none' || locationMode === 'website') locationIds = [];
      changedFields.location_ids = locationIds;
      changedFields.website_url = locationMode === 'website' && (formData.website_url as string) ? formData.website_url : null;

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
      setOriginalData({ ...fd });
      setSearchTags(updatedDeal.search_tags || []);
      setOriginalTags(updatedDeal.search_tags || []);
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
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-32" />
          </div>
          <div className="space-y-4">
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
        <Link href="/admin/deals" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> {t('admin.deals.backToDeals')}
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-lg">{error || t('admin.deals.notFound')}</p>
          <Link href="/admin/deals" className="mt-4 inline-block text-primary-500 hover:text-primary-600 font-medium text-sm">
            {t('admin.deals.returnToList')}
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Derived ----------
  const savings = (formData.original_price as number) - (formData.deal_price as number);
  const currentStatus = formData.status as DealStatus;
  const statusStyle = statusColors[currentStatus] || statusColors.draft;
  const allImages = [formData.image_url as string, ...((formData.image_urls as string[]) || [])].filter(Boolean);

  // Summaries for bento cards
  const contentSummary = (formData.title as string) || 'No title';
  const pricingSummary = `${formatCurrency(formData.deal_price as number)} (was ${formatCurrency(formData.original_price as number)})`;
  const mediaSummary = `${allImages.length} image${allImages.length !== 1 ? 's' : ''}, ${((formData.video_urls as string[]) || []).length} video${((formData.video_urls as string[]) || []).length !== 1 ? 's' : ''}`;
  const detailsSummary = `${((formData.highlights as string[]) || []).filter(Boolean).length} highlights, ${((formData.amenities as string[]) || []).filter(Boolean).length} amenities`;
  const locationSummary = locationMode === 'all' ? 'All locations' : locationMode === 'specific' ? `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''}` : locationMode === 'website' ? 'Online / Website' : 'Mobile / No fixed location';
  const schedulingSummary = (formData.starts_at as string) ? `${new Date(formData.starts_at as string).toLocaleDateString()} - ${new Date(formData.expires_at as string).toLocaleDateString()}` : 'Not scheduled';
  const termsSummary = [(formData.how_it_works as string) ? 'How It Works' : '', (formData.fine_print as string) ? 'Fine Print' : '', (formData.terms_and_conditions as string) ? 'T&C' : ''].filter(Boolean).join(', ') || 'None set';

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto p-6">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('admin.deals.deleteDeal')}</h3>
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

      {/* ImagePickerModal */}
      {deal && (
        <ImagePickerModal
          open={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          initialImages={[
            ...(formData.image_url ? [formData.image_url as string] : []),
            ...((formData.image_urls as string[]) || []),
          ]}
          initialMainImage={formData.image_url as string}
          maxImages={11}
          vendorId={deal.vendor_id}
          onConfirm={(images: SelectedImage[]) => {
            if (images.length === 0) {
              updateField('image_url', '');
              updateField('image_urls', []);
            } else {
              const mainImg = images.find(img => img.isMain)?.url || images[0].url;
              updateField('image_url', mainImg);
              updateField('image_urls', images.filter(img => img.url !== mainImg).map(img => img.url));
            }
            setShowImagePicker(false);
          }}
        />
      )}

      {/* Top Bar — sticky */}
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-6 px-6 py-3 flex items-center justify-between mb-6 border-b border-gray-200/50">
        <Link
          href="/admin/deals"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
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

      {/* Main Layout: Bento Cards + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ==================== LEFT: BENTO CARDS ==================== */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">

          {/* 1. Content */}
          <BentoCard
            icon={<FileText className="w-5 h-5" />}
            title="Content"
            summary={contentSummary}
            color="orange"
            open={!!openSections.content}
            onToggle={() => toggleSection('content')}
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title as string}
                onChange={handleInputChange}
                className="w-full text-lg font-bold text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 outline-none transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Deal title..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description as string}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                placeholder="Describe this deal..."
              />
            </div>
            <button
              type="button"
              onClick={handleAvaEnhance}
              disabled={avaLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-medium transition-all disabled:opacity-50 shadow-sm"
            >
              {avaLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('admin.deals.avaWorking')}</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {t('admin.deals.avaEnhance')}</>
              )}
            </button>
            <p className="text-xs text-gray-400">{t('admin.deals.avaDescription')}</p>
          </BentoCard>

          {/* 2. Pricing */}
          <BentoCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Pricing"
            summary={pricingSummary}
            color="green"
            open={!!openSections.pricing}
            onToggle={() => toggleSection('pricing')}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Original Price</label>
                <input
                  type="number"
                  name="original_price"
                  value={formData.original_price as number}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Claims</label>
              <input
                type="number"
                name="max_claims"
                value={formData.max_claims as number | ''}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="Unlimited"
              />
            </div>
            {savings > 0 && (
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <span className="text-green-700 text-sm font-semibold">
                  {formatCurrency(savings)} off ({String(formData.discount_percentage || 0)}%)
                </span>
              </div>
            )}
          </BentoCard>

          {/* 3. Media (full width) */}
          <div className="md:col-span-2">
          <BentoCard
            icon={<ImageIcon className="w-5 h-5" />}
            title="Media"
            summary={mediaSummary}
            color="blue"
            open={!!openSections.media}
            onToggle={() => toggleSection('media')}
          >
            {/* Hero preview */}
            {!!(formData.image_url as string) && (
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.image_url as string}
                  alt={formData.title as string}
                  className="w-full h-56 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    const gallery = (formData.image_urls as string[]) || [];
                    if (gallery.length > 0) {
                      updateField('image_url', gallery[0]);
                      updateField('image_urls', gallery.slice(1));
                    } else {
                      updateField('image_url', '');
                    }
                  }}
                  className="absolute top-3 right-3 p-1.5 text-white bg-black/50 backdrop-blur-sm rounded-lg hover:bg-red-500/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Image grid + Add button */}
            {allImages.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {allImages.map((url, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={i === 0 ? 'Main image' : `Image ${i + 1}`}
                      className={`w-20 h-20 rounded-lg object-cover border-2 transition-colors ${
                        i === 0 ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-100 group-hover:border-primary-300'
                      }`}
                    />
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-primary-500/90 text-white text-[9px] text-center py-0.5 rounded-b-md font-medium">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (i === 0) {
                          const gallery = (formData.image_urls as string[]) || [];
                          if (gallery.length > 0) {
                            updateField('image_url', gallery[0]);
                            updateField('image_urls', gallery.slice(1));
                          } else {
                            updateField('image_url', '');
                          }
                        } else {
                          removeGalleryImage(i - 1);
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {allImages.length < 11 && (
                  <div className="relative" data-add-image-menu>
                    <button
                      type="button"
                      onClick={() => setShowAddImageMenu(p => !p)}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary-400 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      {(uploadingImage || uploadingGallery || aiImageLoading) ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] text-gray-400">Add</span>
                        </>
                      )}
                    </button>
                    {showAddImageMenu && (
                      <div className="absolute bottom-full left-0 mb-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                        <label className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-gray-500" />
                          Upload from Device
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={uploadingImage || uploadingGallery}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (!formData.image_url) handleImageUpload(file);
                                else handleGalleryImageUpload(file);
                              }
                              e.target.value = '';
                              setShowAddImageMenu(false);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => { setShowImagePicker(true); setShowAddImageMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                          Browse Library
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAiImageInput(true); setShowAddImageMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
                          Generate with AI
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                data-add-image-menu
                onClick={() => setShowAddImageMenu(p => !p)}
                className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200 cursor-pointer hover:border-primary-300 transition-colors"
              >
                {(uploadingImage || aiImageLoading) ? (
                  <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-gray-300" />
                    <span className="text-gray-400 text-sm">Add an image</span>
                    <span className="text-gray-300 text-xs">Upload, library, or AI</span>
                  </>
                )}
                {showAddImageMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                    <label className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-gray-500" />
                      Upload from Device
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = '';
                          setShowAddImageMenu(false);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowImagePicker(true); setShowAddImageMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                      Browse Library
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowAiImageInput(true); setShowAddImageMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
                      Generate with AI
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Image Generation Input */}
            {showAiImageInput && (
              <div className="flex items-center gap-2">
                <input
                  value={customImagePrompt}
                  onChange={e => setCustomImagePrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!aiImageLoading) handleAiImageGenerate(); } }}
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
                  placeholder="Describe the image you want (or leave blank for auto)..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAiImageGenerate}
                  disabled={aiImageLoading || (!(formData.title as string) && !customImagePrompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-all"
                >
                  {aiImageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiImageInput(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Videos Section */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Videos</label>
              <div className="space-y-2">
                {(formData.video_urls as string[]).map((url, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg overflow-hidden group">
                    <video src={url} controls preload="metadata" className="w-full max-h-48 rounded-t-lg bg-black" />
                    <div className="flex items-center gap-2 p-2">
                      <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate flex-1" title={url}>
                        {url.split('/').pop() || url}
                      </span>
                      <button type="button" onClick={() => removeVideo(i)} className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-500 hover:text-primary-600 border border-dashed border-gray-200 hover:border-primary-400 rounded-lg transition-colors">
                  {uploadingVideo ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading video...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload Video</>
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
              </div>
            </div>

            {/* Ava Video Studio */}
            {(() => {
              const dealImages = [formData.image_url as string, ...((formData.image_urls as string[]) || [])].filter(Boolean);
              return (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-800">Ava&apos;s Video Studio</h4>
                      <p className="text-xs text-emerald-500">Pick an image &rarr; Ava turns it into a cinematic promo video</p>
                    </div>
                  </div>

                  {dealImages.length === 0 ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> Add a deal image first so Ava can generate a video from it
                    </p>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider mb-1.5">Choose source image</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {dealImages.map((img, i) => {
                            const isSelected = (videoSourceImage || (formData.image_url as string)) === img;
                            return (
                              <button key={i} type="button" onClick={() => setVideoSourceImage(img)}
                                className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-300 shadow-md' : 'border-gray-200 hover:border-emerald-300'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt={`Source ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.svg'; }} />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-emerald-600 drop-shadow" />
                                  </div>
                                )}
                                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">Main</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Describe your video (optional)</p>
                        <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)}
                          className="w-full text-sm border border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 resize-none placeholder:text-emerald-400 outline-none"
                          rows={2} placeholder="e.g., Slow zoom into the product with warm lighting..." />
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button" onClick={handleAiVideoGenerate} disabled={aiVideoLoading}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-emerald-500/20">
                          {aiVideoLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Ava is creating the video...</>
                          ) : (
                            <><Video className="w-4 h-4" /> Generate Video</>
                          )}
                        </button>
                        <div className="relative group">
                          <button type="button" className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" aria-label="Video guidelines">
                            <Info className="w-5 h-5" />
                          </button>
                          <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <p className="font-semibold mb-1.5">Video Generation Tips</p>
                            <p className="text-gray-300 mb-2">Google&apos;s AI has content guidelines. For best results:</p>
                            <ul className="space-y-1 text-gray-300">
                              <li className="flex gap-1.5"><span className="text-green-400 shrink-0">&#10003;</span> Use product/service photos without people</li>
                              <li className="flex gap-1.5"><span className="text-green-400 shrink-0">&#10003;</span> Clean images without text or logos</li>
                              <li className="flex gap-1.5"><span className="text-green-400 shrink-0">&#10003;</span> Simple, descriptive video prompts</li>
                              <li className="flex gap-1.5"><span className="text-red-400 shrink-0">&#10007;</span> No photos with children</li>
                              <li className="flex gap-1.5"><span className="text-red-400 shrink-0">&#10007;</span> No copyrighted or branded content</li>
                              <li className="flex gap-1.5"><span className="text-red-400 shrink-0">&#10007;</span> No violent or explicit imagery</li>
                            </ul>
                            <p className="text-gray-400 mt-2 text-[10px]">If an image is blocked, Ava will auto-retry with a generic video.</p>
                            <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                          </div>
                        </div>
                      </div>

                      {aiVideoLoading && (
                        <div className="space-y-2">
                          <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.round(videoProgress)}%` }} />
                          </div>
                          <div className="flex justify-between items-center text-xs text-emerald-600">
                            <span>{Math.round(videoProgress)}% — {videoElapsed < 60 ? `${videoElapsed}s` : `${Math.floor(videoElapsed / 60)}m ${videoElapsed % 60}s`} elapsed</span>
                            <span className="animate-pulse">{videoElapsed < 60 ? 'Est. 1-3 min' : videoElapsed < 120 ? 'Almost there...' : 'Finishing up...'}</span>
                          </div>
                          <p className="text-[10px] text-emerald-500 text-center">You can keep editing while Ava works.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
            <p className="text-xs text-gray-400">MP4, WebM, MOV, or AVI. Max 100MB.</p>
          </BentoCard>
          </div>

          {/* 4. Details */}
          <BentoCard
            icon={<ClipboardList className="w-5 h-5" />}
            title="Details"
            summary={detailsSummary}
            color="amber"
            open={!!openSections.details}
            onToggle={() => toggleSection('details')}
          >
            {/* Ava AI Suggest Button */}
            <button
              type="button"
              onClick={generateAmenitySuggestions}
              disabled={generatingAmenities || !(formData.title as string)?.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50 shadow-sm"
            >
              {generatingAmenities ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ava is thinking...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Ava: Suggest Highlights & Amenities</>
              )}
            </button>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Highlights</label>
              {/* AI suggested highlights */}
              {suggestedHighlights.filter(s => !(formData.highlights as string[]).includes(s)).length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-emerald-600 mb-1 font-medium">Ava&apos;s suggestions — tap to add</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedHighlights.filter(s => !(formData.highlights as string[]).includes(s)).map(h => (
                      <button key={h} type="button" onClick={() => { updateField('highlights', [...(formData.highlights as string[]), h]); setSuggestedHighlights(prev => prev.filter(x => x !== h)); }}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors">
                        <Plus className="w-2.5 h-2.5" /> {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ArrayEditor
                items={formData.highlights as string[]}
                onChange={(items) => updateField('highlights', items)}
                placeholder="Add a highlight..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Features / Amenities</label>
              {/* AI suggested amenities */}
              {suggestedAmenities.filter(s => !(formData.amenities as string[]).includes(s)).length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-emerald-600 mb-1 font-medium">Ava&apos;s suggestions — tap to add</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedAmenities.filter(s => !(formData.amenities as string[]).includes(s)).map(feature => (
                      <button key={feature} type="button" onClick={() => { updateField('amenities', [...(formData.amenities as string[]), feature]); setSuggestedAmenities(prev => prev.filter(x => x !== feature)); }}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors">
                        <Plus className="w-2.5 h-2.5" /> {feature}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ArrayEditor
                items={formData.amenities as string[]}
                onChange={(items) => updateField('amenities', items)}
                placeholder="Add an amenity..."
              />
            </div>

            {/* Search Tags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-500">Search Tags</label>
                <button
                  type="button"
                  onClick={generateSearchTags}
                  disabled={generatingTags || !(formData.title as string)?.trim()}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[10px] font-medium rounded-md hover:bg-emerald-600 disabled:opacity-50 transition-all"
                >
                  {generatingTags ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <img src="/ava.png" alt="" className="w-3 h-3 rounded-full" />
                  )}
                  Ava Tags
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {searchTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200">
                    {tag}
                    <button type="button" onClick={() => setSearchTags(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Custom tag..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTag.trim() && !searchTags.includes(newTag.trim().toLowerCase())) {
                        setSearchTags(prev => [...prev, newTag.trim().toLowerCase()]);
                        setNewTag('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTag.trim() && !searchTags.includes(newTag.trim().toLowerCase())) {
                      setSearchTags(prev => [...prev, newTag.trim().toLowerCase()]);
                      setNewTag('');
                    }
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </BentoCard>

          {/* 5. Location */}
          <BentoCard
            icon={<MapPin className="w-5 h-5" />}
            title="Location"
            summary={locationSummary}
            color="gray"
            open={!!openSections.location}
            onToggle={() => toggleSection('location')}
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location Mode</label>
              <div className="relative">
                <select
                  value={locationMode}
                  onChange={(e) => {
                    const mode = e.target.value as typeof locationMode;
                    setLocationMode(mode);
                    if (mode !== 'specific') setSelectedLocationIds([]);
                    if (mode !== 'website') updateField('website_url', '');
                    setHasChanges(true);
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white pr-10"
                >
                  <option value="all">All Locations</option>
                  <option value="specific">Specific Locations</option>
                  <option value="website">Online / Website</option>
                  <option value="none">Mobile / No Fixed Location</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {(locationMode === 'all' || locationMode === 'specific') && (
              <div className="space-y-2">
                {vendorLocations.length > 0 ? (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {vendorLocations.map(loc => {
                      const isSelected = locationMode === 'all' || selectedLocationIds.includes(loc.id);
                      return (
                        <div key={loc.id} className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                          {locationMode === 'specific' && (
                            <input
                              type="checkbox"
                              checked={selectedLocationIds.includes(loc.id)}
                              onChange={() => {
                                setSelectedLocationIds(prev => selectedLocationIds.includes(loc.id) ? prev.filter(id => id !== loc.id) : [...prev, loc.id]);
                                setHasChanges(true);
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900 truncate">{loc.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!deal || !confirm(`Delete "${loc.name}"?`)) return;
                              setDeletingLocationId(loc.id);
                              try {
                                const res = await fetch(`/api/admin/vendors/${deal.vendor_id}/locations?location_id=${loc.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  setVendorLocations(prev => prev.filter(l => l.id !== loc.id));
                                  setSelectedLocationIds(prev => prev.filter(id => id !== loc.id));
                                  setToast('Location deleted');
                                } else {
                                  setToast('Failed to delete location');
                                }
                              } catch { setToast('Failed to delete location'); }
                              setDeletingLocationId(null);
                            }}
                            disabled={deletingLocationId === loc.id}
                            className="p-1 text-red-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          >
                            {deletingLocationId === loc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">This vendor has no locations yet.</p>
                )}

                {/* Add new location */}
                {!showAddLocation ? (
                  <button
                    type="button"
                    onClick={() => setShowAddLocation(true)}
                    className="text-primary-500 text-xs font-medium hover:text-primary-600 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Location
                  </button>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                    <p className="text-xs font-medium text-gray-700">New Location</p>
                    <input
                      value={newLocation.name}
                      onChange={e => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                      placeholder="Location name (e.g. Downtown Store)"
                    />
                    <input
                      value={newLocation.address}
                      onChange={e => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                      placeholder="Street address"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={newLocation.city}
                        onChange={e => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                        className="px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                        placeholder="City"
                      />
                      <input
                        value={newLocation.state}
                        onChange={e => setNewLocation(prev => ({ ...prev, state: e.target.value }))}
                        className="px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                        placeholder="State"
                      />
                      <input
                        value={newLocation.zip}
                        onChange={e => setNewLocation(prev => ({ ...prev, zip: e.target.value }))}
                        className="px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                        placeholder="ZIP"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={addingLocation || !newLocation.name || !newLocation.address || !newLocation.city || !newLocation.state || !newLocation.zip}
                        onClick={async () => {
                          if (!deal) return;
                          setAddingLocation(true);
                          try {
                            const res = await fetch(`/api/admin/vendors/${deal.vendor_id}/locations`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(newLocation),
                            });
                            const data = await res.json();
                            if (res.ok && data.location) {
                              setVendorLocations(prev => [...prev, data.location]);
                              setNewLocation({ name: '', address: '', city: '', state: '', zip: '' });
                              setShowAddLocation(false);
                              setToast('Location added');
                            } else {
                              setToast(data.error || 'Failed to add location');
                            }
                          } catch { setToast('Failed to add location'); }
                          setAddingLocation(false);
                        }}
                        className="px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center gap-1"
                      >
                        {addingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddLocation(false); setNewLocation({ name: '', address: '', city: '', state: '', zip: '' }); }}
                        className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {locationMode === 'website' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="website_url"
                    value={formData.website_url as string}
                    onChange={handleInputChange}
                    onBlur={() => {
                      const url = formData.website_url as string;
                      if (url && !url.match(/^https?:\/\//)) updateField('website_url', 'https://' + url);
                    }}
                    className="w-full pl-10 px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="www.yoursite.com/product"
                  />
                </div>
              </div>
            )}
          </BentoCard>

          {/* 6. Scheduling */}
          <BentoCard
            icon={<Calendar className="w-5 h-5" />}
            title="Scheduling"
            summary={schedulingSummary}
            color="blue"
            open={!!openSections.scheduling}
            onToggle={() => toggleSection('scheduling')}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  name="starts_at"
                  value={formData.starts_at as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Expires At</label>
                <input
                  type="datetime-local"
                  name="expires_at"
                  value={formData.expires_at as string}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
              <input
                type="text"
                name="timezone"
                value={formData.timezone as string}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="America/New_York"
              />
            </div>
            <div className="flex items-center gap-4 pt-1">
              <div className="text-xs font-medium text-gray-500">Claims</div>
              <div className="text-lg font-bold text-gray-900">
                {deal.claims_count}
                {deal.max_claims != null && (
                  <span className="text-gray-400 text-sm font-normal"> / {deal.max_claims}</span>
                )}
              </div>
            </div>
          </BentoCard>

          {/* 7. Terms & Legal */}
          <BentoCard
            icon={<FileText className="w-5 h-5" />}
            title="Terms & Legal"
            summary={termsSummary}
            color="gray"
            open={!!openSections.terms}
            onToggle={() => toggleSection('terms')}
          >
            {/* Ava Terms Assistant */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Ask Ava to write or edit a section
              </div>
              <div className="flex gap-2">
                <select value={avaTermsField} onChange={e => setAvaTermsField(e.target.value as 'how_it_works' | 'terms_and_conditions' | 'fine_print')}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
                  <option value="how_it_works">How It Works</option>
                  <option value="terms_and_conditions">Terms & Conditions</option>
                  <option value="fine_print">Fine Print</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" value={avaTermsPrompt} onChange={e => setAvaTermsPrompt(e.target.value)}
                  placeholder='e.g. "add a no-refund policy" or "write steps for a spa visit"'
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAvaTerms(); } }} />
                <button type="button" onClick={handleAvaTerms} disabled={avaTermsLoading || !avaTermsPrompt.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap">
                  {avaTermsLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Writing...</> : <><Sparkles className="w-3 h-3" /> Ask Ava</>}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">How It Works</label>
              <textarea
                name="how_it_works"
                value={formData.how_it_works as string}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                placeholder="Explain how the deal works..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fine Print</label>
              <textarea
                name="fine_print"
                value={formData.fine_print as string}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                placeholder="Fine print details..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Terms & Conditions</label>
              <textarea
                name="terms_and_conditions"
                value={formData.terms_and_conditions as string}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                placeholder="Terms and conditions..."
              />
            </div>
          </BentoCard>
        </div>

        {/* ==================== RIGHT: ADMIN SIDEBAR ==================== */}
        <div className="space-y-6">

          {/* Admin Controls Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-300" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin Controls</span>
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
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl transition-all focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between py-1">
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

              <div className="border-t border-gray-100 pt-3 space-y-3">
                {/* Vendor */}
                {deal.vendor && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-900 rounded-lg text-sm font-medium">
                      {deal.vendor.business_name}
                    </div>
                  </div>
                )}

                {/* Deal ID */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Deal ID</label>
                  <button
                    onClick={copyDealId}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-mono bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {dealId.slice(0, 8)}...
                    {copiedId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Claims Progress */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Claims</label>
                  <div className="text-lg font-bold text-gray-900">
                    {deal.claims_count}
                    {deal.max_claims != null && (
                      <span className="text-gray-400 text-sm font-normal"> / {deal.max_claims}</span>
                    )}
                  </div>
                  {deal.max_claims != null && deal.max_claims > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                      <div
                        className="bg-primary-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== ANALYTICS SECTION (Full Width) ==================== */}
      <div className="mt-8 space-y-6">
        {/* Performance Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatedStat icon={Eye} value={analytics?.total_views ?? 0} label="Total Views" color="bg-blue-50 text-blue-600" />
            <AnimatedStat icon={Users} value={analytics?.total_claims ?? 0} label="Total Claims" color="bg-primary-50 text-primary-600" />
            <AnimatedStat icon={CheckCircle} value={analytics?.total_redemptions ?? 0} label="Redemptions" color="bg-green-50 text-green-600" />
            <AnimatedStat icon={TrendingUp} value={analytics?.conversion_rate ? Math.round(analytics.conversion_rate * 100) : 0} label="Conversion" suffix="%" color="bg-blue-50 text-blue-600" />
          </div>
        </div>

        {/* Trends Chart */}
        {analytics && analytics.timeline.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                  <Area type="monotone" dataKey="claims" stroke="#E8632B" strokeWidth={2} fill="url(#claimsFill)" />
                  <Area type="monotone" dataKey="redemptions" stroke="#22c55e" strokeWidth={2} fill="url(#redemptionsFill)" />
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

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Activity</span>
          </div>
          {analytics && analytics.recent_claims.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analytics.recent_claims.slice(0, 6).map((claim) => (
                <div key={claim.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
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

      {/* Bottom Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm -mx-6 px-6 py-4 border-t border-gray-200 flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">You have unsaved changes</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
