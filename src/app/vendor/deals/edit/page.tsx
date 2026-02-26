'use client';

import { useState, useEffect, useRef, Suspense, useCallback, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { formatPercentage, formatCurrency, calculateDiscount } from '@/lib/utils';
import {
  ArrowLeft, Save, Loader2, AlertCircle, Tag, Lock, X, ChevronDown,
  Image as ImageIcon, Upload, CheckCircle2, FileText, DollarSign,
  Link as LinkIcon, Wand2, Video, MapPin, Globe, Star, ClipboardList,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import MediaPicker from '@/components/vendor/MediaPicker';
import type { Deal, VendorLocation } from '@/lib/types/database';

export default function EditDealPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>}>
      <EditDealPageInner />
    </Suspense>
  );
}

// Collapsible bento section card
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
    purple: { bg: 'bg-white', iconBg: 'bg-purple-50 text-purple-600', border: 'border-purple-200', ring: 'ring-purple-300' },
    amber: { bg: 'bg-white', iconBg: 'bg-amber-50 text-amber-600', border: 'border-amber-200', ring: 'ring-amber-300' },
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
          <h3 className="font-bold text-secondary-500 text-sm">{title}</h3>
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

function EditDealPageInner() {
  const { user } = useAuth();
  const { canAccess } = useVendorTier();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'ai' | 'library'>('url');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAdditionalMediaPicker, setShowAdditionalMediaPicker] = useState(false);
  const [additionalImageUrl, setAdditionalImageUrl] = useState('');
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiVideoLoading, setAiVideoLoading] = useState(false);
  const [videoSourceImage, setVideoSourceImage] = useState<string>('');
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Bento sections open state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ content: true });
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Array state for list fields
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [generatingTags, setGeneratingTags] = useState(false);

  // Location state
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<'all' | 'specific' | 'none' | 'website'>('all');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    original_price: '',
    deal_price: '',
    deposit_amount: '',
    max_claims: '',
    image_url: '',
    terms_and_conditions: '',
    how_it_works: '',
    fine_print: '',
  });

  useEffect(() => {
    if (!dealId || !user) return;

    async function fetchDeal() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('vendor_id', user!.id)
        .single();

      if (error || !data) {
        setError('Deal not found or you do not have permission to edit it.');
        setLoading(false);
        return;
      }

      setDeal(data);
      setForm({
        title: data.title || '',
        description: data.description || '',
        original_price: data.original_price.toString(),
        deal_price: data.deal_price.toString(),
        deposit_amount: data.deposit_amount?.toString() || '',
        max_claims: data.max_claims?.toString() || '',
        image_url: data.image_url || '',
        terms_and_conditions: data.terms_and_conditions || '',
        how_it_works: data.how_it_works || '',
        fine_print: data.fine_print || '',
      });

      setAdditionalImages(data.image_urls || []);
      setVideoUrls(data.video_urls || []);
      setHighlights(data.highlights || []);
      setAmenities(data.amenities || []);
      setSearchTags(data.search_tags || []);
      setWebsiteUrl(data.website_url || '');

      if (data.website_url) {
        setLocationMode('website');
      } else if (data.location_ids === null) {
        setLocationMode('all');
      } else if (data.location_ids && data.location_ids.length > 0) {
        setLocationMode('specific');
        setSelectedLocationIds(data.location_ids);
      } else {
        setLocationMode('none');
      }

      if (data.image_url) setImageMode('url');
      setLoading(false);
    }

    const supabase = createClient();
    supabase
      .from('vendor_locations')
      .select('*')
      .eq('vendor_id', user.id)
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) setLocations(data);
      });

    fetchDeal();
  }, [dealId, user]);

  const discount = form.original_price && form.deal_price
    ? calculateDiscount(parseFloat(form.original_price), parseFloat(form.deal_price))
    : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) { setError('Invalid file type.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return; }
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); setUploadPreview(null); setUploading(false); return; }
      setForm(prev => ({ ...prev, image_url: data.url }));
    } catch { setError('Upload failed.'); setUploadPreview(null); }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileUpload(file); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(true); }, []);
  const handleDragLeave = useCallback(() => { setDragActive(false); }, []);
  const removeImage = () => { setForm(prev => ({ ...prev, image_url: '' })); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleAdditionalFileUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) { setError('Invalid file type.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return; }
    setUploadingAdditional(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); setUploadingAdditional(false); return; }
      setAdditionalImages(prev => [...prev, data.url]);
    } catch { setError('Upload failed.'); }
    setUploadingAdditional(false);
  };

  const handleAiImageGenerate = async () => {
    if (!form.title) { setError('Enter a deal title first.'); return; }
    setAiImageLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, description: form.description, custom_prompt: customImagePrompt || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate image'); setAiImageLoading(false); return; }
      setForm(prev => ({ ...prev, image_url: data.url }));
      setUploadPreview(null);
    } catch { setError('Failed to generate image.'); }
    setAiImageLoading(false);
  };

  // All available images (main + additional) for video source selection
  const allDealImages = [form.image_url, ...additionalImages].filter(Boolean);

  const handleAiVideoGenerate = async () => {
    const sourceImage = videoSourceImage || form.image_url;
    if (!sourceImage) { setError('Add a deal image first so Ava can turn it into a video.'); return; }
    setAiVideoLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: sourceImage, title: form.title, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate video'); setAiVideoLoading(false); return; }
      setVideoUrls(prev => [...prev, data.url]);
    } catch { setError('Failed to generate video.'); }
    setAiVideoLoading(false);
  };

  const generateSearchTags = async () => {
    if (!form.title.trim()) { setError('Enter a deal title first.'); return; }
    setGeneratingTags(true);
    try {
      const res = await fetch('/api/vendor/generate-tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, description: form.description, deal_type: deal?.deal_type || 'regular', original_price: form.original_price ? parseFloat(form.original_price) : null, deal_price: form.deal_price ? parseFloat(form.deal_price) : null }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to generate tags');
      else setSearchTags(data.tags || []);
    } catch { setError('Failed to generate tags.'); }
    setGeneratingTags(false);
  };

  const displayImage = uploadPreview || form.image_url;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !user) return;
    setError(''); setSuccess(''); setSaving(true);
    const supabase = createClient();
    const originalPrice = parseFloat(form.original_price);
    const dealPrice = parseFloat(form.deal_price);
    const discountPercentage = calculateDiscount(originalPrice, dealPrice);

    let locationIds: string[] | null = null;
    if (locationMode === 'specific' && selectedLocationIds.length > 0) locationIds = selectedLocationIds;
    else if (locationMode === 'none' || locationMode === 'website') locationIds = [];

    const updates: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      original_price: originalPrice,
      deal_price: dealPrice,
      discount_percentage: discountPercentage,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      max_claims: form.max_claims ? parseInt(form.max_claims) : null,
      image_url: form.image_url || null,
      image_urls: additionalImages,
      video_urls: videoUrls,
      terms_and_conditions: form.terms_and_conditions || null,
      how_it_works: form.how_it_works || null,
      fine_print: form.fine_print || null,
      highlights,
      amenities,
      search_tags: searchTags,
      location_ids: locationIds,
      website_url: locationMode === 'website' && websiteUrl ? websiteUrl : null,
    };

    const { error: updateError } = await supabase.from('deals').update(updates).eq('id', deal.id).eq('vendor_id', user.id);
    if (updateError) setError('Failed to save: ' + updateError.message);
    else { setSuccess('Deal updated successfully!'); setTimeout(() => router.push('/vendor/deals/calendar'), 1500); }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;
  }

  if (!deal) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Deals</Link>
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-secondary-500">Deal Not Found</h2>
          <p className="text-gray-500 mt-2">{error || 'The deal you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const isLocked = deal.claims_count > 0;
  if (isLocked) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Deals</Link>
        <div className="card p-8 text-center">
          <Lock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-secondary-500">Deal Locked</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">This deal has <strong>{deal.claims_count} claim{deal.claims_count > 1 ? 's' : ''}</strong> and can no longer be edited.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/vendor/deals/calendar" className="btn-outline">Back to Deals</Link>
            <Link href="/vendor/deals/new" className="btn-primary">Create New Deal</Link>
          </div>
        </div>
      </div>
    );
  }

  // Summaries for bento cards
  const contentSummary = form.title || 'Add title and description';
  const pricingSummary = form.original_price && form.deal_price
    ? `${formatCurrency(parseFloat(form.deal_price))} (${formatPercentage(discount)} off)`
    : 'Set your prices';
  const mediaCount = (form.image_url ? 1 : 0) + additionalImages.length;
  const mediaSummary = `${mediaCount} image${mediaCount !== 1 ? 's' : ''}${videoUrls.length > 0 ? `, ${videoUrls.length} video${videoUrls.length > 1 ? 's' : ''}` : ''}`;
  const detailsSummary = `${highlights.length} highlights, ${amenities.length} amenities, ${searchTags.length} tags`;
  const locationSummary = locationMode === 'all' ? 'All locations' : locationMode === 'specific' ? `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''}` : locationMode === 'website' ? 'Online' : 'No location';
  const termsSummary = [form.terms_and_conditions, form.how_it_works, form.fine_print].filter(Boolean).length > 0
    ? `${[form.terms_and_conditions, form.how_it_works, form.fine_print].filter(Boolean).length} section${[form.terms_and_conditions, form.how_it_works, form.fine_print].filter(Boolean).length > 1 ? 's' : ''} filled`
    : 'Add terms, how it works, fine print';

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-100'}`}>
            {deal.deal_type === 'sponti_coupon' ? <SpontiIcon className="w-6 h-6 text-primary-500" /> : <Tag className="w-6 h-6 text-secondary-500" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Edit Deal</h1>
            <p className="text-xs text-gray-500">
              {deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'} &middot;
              <span className={`font-medium ml-1 ${deal.status === 'active' ? 'text-green-600' : deal.status === 'draft' ? 'text-amber-600' : 'text-gray-500'}`}>{deal.status}</span>
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl border border-green-200 mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200 mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          {/* Content */}
          <BentoCard icon={<FileText className="w-5 h-5" />} title="Content" summary={contentSummary} color="orange"
            open={!!openSections.content} onToggle={() => toggleSection('content')}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <AIAssistButton type="deal_title" context={{ current_text: form.title, deal_type: deal.deal_type, description: form.description }} onResult={(text) => setForm(prev => ({ ...prev, title: text }))} label="Ava Rewrite" />
              </div>
              <input name="title" value={form.title} onChange={handleChange} className="input-field" placeholder="Deal title" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <AIAssistButton type="deal_description" context={{ current_text: form.description, deal_type: deal.deal_type, title: form.title }} onResult={(text) => setForm(prev => ({ ...prev, description: text }))} label="Ava Rewrite" />
              </div>
              <textarea name="description" value={form.description} onChange={handleChange} className="input-field min-h-[80px]" placeholder="Describe your deal..." />
            </div>
          </BentoCard>

          {/* Pricing */}
          <BentoCard icon={<DollarSign className="w-5 h-5" />} title="Pricing" summary={pricingSummary} color="green"
            open={!!openSections.pricing} onToggle={() => toggleSection('pricing')}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Original Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input name="original_price" type="number" step="0.01" min="0" value={form.original_price} onChange={handleChange} className="input-field pl-7 text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deal Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input name="deal_price" type="number" step="0.01" min="0" value={form.deal_price} onChange={handleChange} className="input-field pl-7 text-sm" required />
                </div>
              </div>
            </div>
            {discount > 0 && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Discount:</span>
                <span className="text-lg font-bold text-green-600">{formatPercentage(discount)} OFF</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Deposit {deal.deal_type === 'sponti_coupon' ? '*' : '(optional)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                <input name="deposit_amount" type="number" step="0.01" min={deal.deal_type === 'sponti_coupon' ? '1' : '0'}
                  value={form.deposit_amount} onChange={handleChange} className="input-field pl-7 text-sm"
                  placeholder={deal.deal_type === 'sponti_coupon' ? '10.00' : '0.00'}
                  required={deal.deal_type === 'sponti_coupon'} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Claims</label>
              <input name="max_claims" type="number" min="1" value={form.max_claims} onChange={handleChange} className="input-field text-sm" placeholder="Unlimited" />
            </div>
          </BentoCard>

          {/* Media */}
          <BentoCard icon={<ImageIcon className="w-5 h-5" />} title="Media" summary={mediaSummary} color="blue"
            open={!!openSections.media} onToggle={() => toggleSection('media')}>

            {/* Image mode tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button type="button" onClick={() => setImageMode('upload')} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                <Upload className="w-3 h-3" /> Upload
              </button>
              <button type="button" onClick={() => setImageMode('url')} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                <LinkIcon className="w-3 h-3" /> URL
              </button>
              {canAccess('ai_deal_assistant') && (
                <button type="button" onClick={() => setImageMode('ai')} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'ai' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full" /> Ava
                </button>
              )}
              <button type="button" onClick={() => setImageMode('library')} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'library' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                <ImageIcon className="w-3 h-3" /> Library
              </button>
            </div>

            {imageMode === 'upload' && !displayImage && (
              <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
                <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <p className="text-xs font-medium text-gray-600">{dragActive ? 'Drop here' : 'Click or drag & drop'}</p>
                <p className="text-[10px] text-gray-400">JPG, PNG, WebP, GIF - Max 5MB</p>
              </div>
            )}
            {imageMode === 'url' && (
              <input name="image_url" value={form.image_url} onChange={handleChange} className="input-field text-sm" placeholder="https://..." />
            )}
            {imageMode === 'library' && (
              <button type="button" onClick={() => setShowMediaPicker(true)} className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-sm text-blue-600 font-medium hover:bg-blue-100 transition-colors">
                Browse Media Library
              </button>
            )}
            {imageMode === 'ai' && !displayImage && (
              <div className="text-center">
                <input value={customImagePrompt} onChange={e => setCustomImagePrompt(e.target.value)} className="input-field text-sm mb-2" placeholder="Describe the image..." />
                <button type="button" onClick={handleAiImageGenerate} disabled={aiImageLoading || (!form.title && !customImagePrompt)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 mx-auto">
                  {aiImageLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate</>}
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />

            {displayImage && (
              <div className="relative inline-block">
                <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayImage} alt="Deal" className="w-full h-full object-cover" />
                </div>
                {uploading && <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Additional images */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Additional ({additionalImages.length}/10)</p>
              {additionalImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {additionalImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {additionalImages.length < 10 && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => additionalFileInputRef.current?.click()} disabled={uploadingAdditional}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
                    {uploadingAdditional ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
                  </button>
                  <button type="button" onClick={() => setShowAdditionalMediaPicker(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                    <ImageIcon className="w-3 h-3" /> Library
                  </button>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input value={additionalImageUrl} onChange={e => setAdditionalImageUrl(e.target.value)} className="input-field flex-1 text-xs py-1.5" placeholder="Paste image URL..."
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (additionalImageUrl.trim()) { setAdditionalImages(prev => [...prev, additionalImageUrl.trim()]); setAdditionalImageUrl(''); } } }} />
                    <button type="button" onClick={() => { if (additionalImageUrl.trim()) { setAdditionalImages(prev => [...prev, additionalImageUrl.trim()]); setAdditionalImageUrl(''); } }}
                      disabled={!additionalImageUrl.trim()}
                      className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium disabled:opacity-50 transition-colors">Add</button>
                  </div>
                </div>
              )}
              <input ref={additionalFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) handleAdditionalFileUpload(file); if (additionalFileInputRef.current) additionalFileInputRef.current.value = ''; }} />
            </div>

            {/* Videos */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Videos ({videoUrls.length})</p>
              {videoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {videoUrls.map((url, i) => {
                    const isDirectVideo = url.match(/\.(mp4|webm|mov)(\?|$)/i) || url.includes('supabase');
                    return (
                      <div key={i} className="relative group">
                        {isDirectVideo ? (
                          <div className="w-32 h-20 rounded-lg overflow-hidden border border-gray-200 bg-black">
                            <video src={url} className="w-full h-full object-cover" muted playsInline
                              onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                              onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                          </div>
                        ) : (
                          <div className="w-32 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center">
                            <Video className="w-6 h-6 text-gray-400" />
                            <span className="absolute bottom-1 left-1 right-1 text-[8px] text-white truncate">{url}</span>
                          </div>
                        )}
                        <button type="button" onClick={() => setVideoUrls(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} className="input-field flex-1 text-sm" placeholder="Video URL (YouTube, Vimeo, or direct link)..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newVideoUrl.trim()) { setVideoUrls(prev => [...prev, newVideoUrl.trim()]); setNewVideoUrl(''); } } }} />
                <button type="button" onClick={() => { if (newVideoUrl.trim()) { setVideoUrls(prev => [...prev, newVideoUrl.trim()]); setNewVideoUrl(''); } }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium">Add</button>
              </div>
              {canAccess('ai_deal_assistant') && (
                <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">Ava Video Studio</p>
                      <p className="text-[10px] text-emerald-600">Pick an image &rarr; Ava turns it into a cinematic promo video</p>
                    </div>
                  </div>
                  {allDealImages.length === 0 ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Add a deal image first so Ava can generate a video from it
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {/* Image picker */}
                      <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">Choose source image</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {allDealImages.map((img, i) => {
                          const isSelected = (videoSourceImage || form.image_url) === img;
                          return (
                            <button key={i} type="button" onClick={() => setVideoSourceImage(img)}
                              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-300 shadow-md' : 'border-gray-200 hover:border-emerald-300'}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt={`Source ${i + 1}`} className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 drop-shadow" />
                                </div>
                              )}
                              {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">Main</span>}
                            </button>
                          );
                        })}
                      </div>
                      {/* Generate button */}
                      <button type="button" onClick={handleAiVideoGenerate} disabled={aiVideoLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm">
                        {aiVideoLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ava is creating your video...</> : <><Video className="w-3.5 h-3.5" /> Generate Video from Selected Image</>}
                      </button>
                      {aiVideoLoading && (
                        <p className="text-[10px] text-emerald-600 text-center animate-pulse">This takes 1–3 minutes. You can keep editing while Ava works.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </BentoCard>

          {/* Details */}
          <BentoCard icon={<Star className="w-5 h-5" />} title="Details" summary={detailsSummary} color="purple"
            open={!!openSections.details} onToggle={() => toggleSection('details')}>

            {/* Highlights */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Highlights</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {highlights.map((h, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-200">
                    {h} <button type="button" onClick={() => setHighlights(prev => prev.filter((_, idx) => idx !== i))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={newHighlight} onChange={e => setNewHighlight(e.target.value)} className="input-field flex-1 text-sm" placeholder="e.g., Best Seller..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newHighlight.trim()) { setHighlights(prev => [...prev, newHighlight.trim()]); setNewHighlight(''); } } }} />
                <button type="button" onClick={() => { if (newHighlight.trim()) { setHighlights(prev => [...prev, newHighlight.trim()]); setNewHighlight(''); } }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium">Add</button>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amenities</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {amenities.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200">
                    {a} <button type="button" onClick={() => setAmenities(prev => prev.filter((_, idx) => idx !== i))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} className="input-field flex-1 text-sm" placeholder="e.g., Free Parking..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity(''); } } }} />
                <button type="button" onClick={() => { if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity(''); } }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium">Add</button>
              </div>
            </div>

            {/* Search Tags */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Search Tags</label>
                <button type="button" onClick={generateSearchTags} disabled={generatingTags || !form.title.trim()}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[10px] font-medium rounded-md hover:bg-emerald-600 disabled:opacity-50 transition-all">
                  {generatingTags ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ava.png" alt="" className="w-3 h-3 rounded-full" /></>} Ava Tags
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {searchTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-full border border-purple-200">
                    {tag} <button type="button" onClick={() => setSearchTags(prev => prev.filter((_, idx) => idx !== i))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} className="input-field flex-1 text-sm" placeholder="Custom tag..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTag.trim() && !searchTags.includes(newTag.trim().toLowerCase())) { setSearchTags(prev => [...prev, newTag.trim().toLowerCase()]); setNewTag(''); } } }} />
                <button type="button" onClick={() => { if (newTag.trim() && !searchTags.includes(newTag.trim().toLowerCase())) { setSearchTags(prev => [...prev, newTag.trim().toLowerCase()]); setNewTag(''); } }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium">Add</button>
              </div>
            </div>
          </BentoCard>

          {/* Location */}
          <BentoCard icon={<MapPin className="w-5 h-5" />} title="Location" summary={locationSummary} color="amber"
            open={!!openSections.location} onToggle={() => toggleSection('location')}>
            <div className="relative">
              <select value={locationMode} onChange={(e) => {
                const mode = e.target.value as typeof locationMode;
                setLocationMode(mode);
                if (mode !== 'specific') setSelectedLocationIds([]);
                if (mode !== 'website') setWebsiteUrl('');
              }} className="input-field appearance-none pr-10 text-sm">
                {locations.length > 0 && <option value="all">All Locations</option>}
                {locations.length > 0 && <option value="specific">Specific Locations</option>}
                <option value="website">Online / Website</option>
                <option value="none">No Location (General)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {locationMode === 'specific' && locations.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {locations.map(loc => {
                  const isSelected = selectedLocationIds.includes(loc.id);
                  return (
                    <label key={loc.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => setSelectedLocationIds(prev => isSelected ? prev.filter(id => id !== loc.id) : [...prev, loc.id])}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-secondary-500 truncate">{loc.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{loc.address}, {loc.city}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {locationMode === 'website' && (
              <div className="relative">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="input-field pl-10 text-sm" placeholder="https://yoursite.com/product" />
              </div>
            )}
          </BentoCard>

          {/* Terms & Legal */}
          <BentoCard icon={<ClipboardList className="w-5 h-5" />} title="Terms & Legal" summary={termsSummary} color="gray"
            open={!!openSections.terms} onToggle={() => toggleSection('terms')}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">How It Works</label>
              <textarea name="how_it_works" value={form.how_it_works} onChange={handleChange} className="input-field min-h-[60px] text-sm"
                placeholder="1. Claim the deal 2. Show QR code 3. Enjoy!" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea name="terms_and_conditions" value={form.terms_and_conditions} onChange={handleChange} className="input-field min-h-[60px] text-sm"
                placeholder="Valid for dine-in only..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fine Print</label>
              <textarea name="fine_print" value={form.fine_print} onChange={handleChange} className="input-field min-h-[50px] text-sm"
                placeholder="Must be 18+. Subject to availability." />
            </div>
          </BentoCard>
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-600 mb-6">
          <strong className="text-blue-700">Note:</strong> Deal type ({deal.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}) and expiration cannot be changed. Claims: {deal.claims_count}
        </div>

        {/* Save button */}
        <button type="submit" disabled={saving}
          className={`w-full text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
            deal.deal_type === 'sponti_coupon'
              ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25'
              : 'bg-secondary-500 hover:bg-secondary-600 shadow-lg shadow-secondary-500/25'
          }`}>
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </form>

      <MediaPicker open={showMediaPicker} onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => { setForm(prev => ({ ...prev, image_url: url })); setUploadPreview(null); setShowMediaPicker(false); }} type="image" />

      <MediaPicker open={showAdditionalMediaPicker} onClose={() => setShowAdditionalMediaPicker(false)}
        multiple onSelect={(url) => { setAdditionalImages(prev => prev.length < 10 ? [...prev, url] : prev); setShowAdditionalMediaPicker(false); }}
        onSelectMultiple={(urls) => { setAdditionalImages(prev => { const remaining = 10 - prev.length; return [...prev, ...urls.slice(0, remaining)]; }); setShowAdditionalMediaPicker(false); }} type="image" />
    </div>
  );
}
