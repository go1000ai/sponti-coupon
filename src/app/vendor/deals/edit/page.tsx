'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { formatPercentage, calculateDiscount } from '@/lib/utils';
import {
  ArrowLeft, Save, Loader2, AlertCircle, Tag, Lock, X,
  Image as ImageIcon, Upload, CheckCircle2,
  Link as LinkIcon, Wand2, Video, MapPin, Globe, ChevronDown,
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
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiVideoLoading, setAiVideoLoading] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [dragActive, setDragActive] = useState(false);

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

      // Populate array fields
      setAdditionalImages(data.image_urls || []);
      setVideoUrls(data.video_urls || []);
      setHighlights(data.highlights || []);
      setAmenities(data.amenities || []);
      setSearchTags(data.search_tags || []);
      setWebsiteUrl(data.website_url || '');

      // Determine location mode from data
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

      // Set image mode based on whether there's an image
      if (data.image_url) setImageMode('url');

      setLoading(false);
    }

    // Fetch vendor locations
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

  // Image upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        setUploadPreview(null);
        setUploading(false);
        return;
      }
      setForm(prev => ({ ...prev, image_url: data.url }));
    } catch {
      setError('Failed to upload image. Please try again.');
      setUploadPreview(null);
    }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const removeImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }));
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Additional image upload
  const handleAdditionalFileUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    setUploadingAdditional(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        setUploadingAdditional(false);
        return;
      }
      setAdditionalImages(prev => [...prev, data.url]);
    } catch {
      setError('Failed to upload image. Please try again.');
    }
    setUploadingAdditional(false);
  };

  // AI Image Generation
  const handleAiImageGenerate = async () => {
    if (!form.title) {
      setError('Please enter a deal title first so Ava can generate a relevant image.');
      return;
    }
    setAiImageLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          custom_prompt: customImagePrompt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate image');
        setAiImageLoading(false);
        return;
      }
      setForm(prev => ({ ...prev, image_url: data.url }));
      setUploadPreview(null);
    } catch {
      setError('Failed to generate image. Please try again.');
    }
    setAiImageLoading(false);
  };

  // AI Video Generation
  const handleAiVideoGenerate = async () => {
    const imageUrl = form.image_url;
    if (!imageUrl) {
      setError('Please add a deal image first so Ava can generate a video from it.');
      return;
    }
    setAiVideoLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          title: form.title,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate video');
        setAiVideoLoading(false);
        return;
      }
      setVideoUrls(prev => [...prev, data.url]);
    } catch {
      setError('Failed to generate video. Please try again.');
    }
    setAiVideoLoading(false);
  };

  // AI Search Tags
  const generateSearchTags = async () => {
    if (!form.title.trim()) {
      setError('Enter a deal title first so Ava can generate search tags.');
      return;
    }
    setGeneratingTags(true);
    try {
      const res = await fetch('/api/vendor/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          deal_type: deal?.deal_type || 'regular',
          original_price: form.original_price ? parseFloat(form.original_price) : null,
          deal_price: form.deal_price ? parseFloat(form.deal_price) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate tags');
      } else {
        setSearchTags(data.tags || []);
      }
    } catch {
      setError('Failed to generate search tags. Please try again.');
    }
    setGeneratingTags(false);
  };

  const displayImage = uploadPreview || form.image_url;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    const supabase = createClient();

    const originalPrice = parseFloat(form.original_price);
    const dealPrice = parseFloat(form.deal_price);
    const discountPercentage = calculateDiscount(originalPrice, dealPrice);

    // Determine location_ids based on mode
    let locationIds: string[] | null = null;
    if (locationMode === 'specific' && selectedLocationIds.length > 0) {
      locationIds = selectedLocationIds;
    } else if (locationMode === 'none' || locationMode === 'website') {
      locationIds = [];
    }

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

    const { error: updateError } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', deal.id)
      .eq('vendor_id', user.id);

    if (updateError) {
      setError('Failed to save changes: ' + updateError.message);
    } else {
      setSuccess('Deal updated successfully!');
      setTimeout(() => router.push('/vendor/deals/calendar'), 1500);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
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
        <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="card p-8 text-center">
          <Lock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-secondary-500">Deal Locked</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            This deal has <strong>{deal.claims_count} claim{deal.claims_count > 1 ? 's' : ''}</strong> and can no longer be edited to ensure fairness to customers who already claimed it.
          </p>
          <p className="text-gray-400 text-sm mt-3">
            You can pause or expire this deal from the deals list, then create a new one with updated details.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/vendor/deals/calendar" className="btn-outline">
              Back to Deals
            </Link>
            <Link href="/vendor/deals/new" className="btn-primary">
              Create New Deal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-100'}`}>
          {deal.deal_type === 'sponti_coupon' ? (
            <SpontiIcon className="w-6 h-6 text-primary-500" />
          ) : (
            <Tag className="w-6 h-6 text-secondary-500" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-secondary-500">Edit Deal</h1>
          <p className="text-sm text-gray-500">
            {deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'} &middot;
            Status: <span className={`font-medium ${deal.status === 'active' ? 'text-green-600' : deal.status === 'draft' ? 'text-amber-600' : 'text-gray-500'}`}>{deal.status}</span>
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg border border-green-200 mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-200 mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="card p-8 space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Deal Title *</label>
            <AIAssistButton
              type="deal_title"
              context={{
                current_text: form.title,
                deal_type: deal?.deal_type || 'regular',
                description: form.description,
              }}
              onResult={(text) => setForm(prev => ({ ...prev, title: text }))}
              label="Ava Rewrite"
            />
          </div>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., 50% Off All Entrees Tonight Only!"
            required
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <AIAssistButton
              type="deal_description"
              context={{
                current_text: form.description,
                deal_type: deal?.deal_type || 'regular',
                title: form.title,
                original_price: form.original_price,
                deal_price: form.deal_price,
              }}
              onResult={(text) => setForm(prev => ({ ...prev, description: text }))}
              label="Ava Rewrite"
            />
          </div>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input-field min-h-[100px]"
            placeholder="Describe your deal..."
          />
        </div>

        {/* Main Deal Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Deal Image</span>
          </label>

          <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
            <button type="button" onClick={() => setImageMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${imageMode === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            <button type="button" onClick={() => setImageMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${imageMode === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <LinkIcon className="w-3.5 h-3.5" /> URL
            </button>
            {canAccess('ai_deal_assistant') && (
              <button type="button" onClick={() => setImageMode('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${imageMode === 'ai' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' : 'text-emerald-600 hover:text-emerald-700'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ava.png" alt="Ava" className="w-4 h-4 rounded-full" /> Ava Generate
              </button>
            )}
            <button type="button" onClick={() => setImageMode('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${imageMode === 'library' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <ImageIcon className="w-3.5 h-3.5" /> Library
            </button>
          </div>

          {imageMode === 'upload' ? (
            <div>
              {!displayImage && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium text-gray-600">{dragActive ? 'Drop image here' : 'Click to upload or drag & drop'}</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF - Max 5MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
            </div>
          ) : imageMode === 'url' ? (
            <div className="flex gap-2">
              <input name="image_url" value={form.image_url} onChange={handleChange} className="input-field flex-1" placeholder="https://images.unsplash.com/..." />
            </div>
          ) : imageMode === 'library' ? (
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50/30">
              <ImageIcon className="w-10 h-10 text-blue-400 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-800 mb-1">Pick from Library</h4>
              <p className="text-sm text-blue-600 mb-4">Select from your previously uploaded or Ava-generated images</p>
              <button type="button" onClick={() => setShowMediaPicker(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all">
                Browse Library
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-emerald-200 rounded-xl p-6 text-center bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
              {!displayImage ? (
                <>
                  <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-semibold text-emerald-800 mb-1">Ava&apos;s Image Studio</h4>
                  <p className="text-sm text-emerald-600 mb-3">Tell me what you want and I&apos;ll generate a professional image.</p>
                  <input value={customImagePrompt} onChange={e => setCustomImagePrompt(e.target.value)}
                    className="w-full max-w-md mx-auto px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4"
                    placeholder="Describe the image you want..." />
                  <button type="button" onClick={handleAiImageGenerate}
                    disabled={aiImageLoading || (!form.title && !customImagePrompt)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 mx-auto disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                    {aiImageLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Wand2 className="w-5 h-5" /> Generate Image</>}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Ava created your image! You can see the preview below.</span>
                </div>
              )}
            </div>
          )}

          {/* Image preview */}
          {displayImage && (
            <div className="relative mt-3 inline-block">
              <div className="w-full max-w-xs h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayImage} alt="Deal preview" className="w-full h-full object-cover" />
              </div>
              {uploading && (
                <div className="absolute inset-0 max-w-xs bg-black/50 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <button type="button" onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Additional Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Images ({additionalImages.length}/10)</label>
          <div className="flex flex-wrap gap-3">
            {additionalImages.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Additional ${i + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {additionalImages.length < 10 && (
              <button type="button" onClick={() => additionalFileInputRef.current?.click()} disabled={uploadingAdditional}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 flex flex-col items-center justify-center text-gray-400 hover:text-primary-500 transition-colors">
                {uploadingAdditional ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[10px] mt-0.5">Add</span></>}
              </button>
            )}
          </div>
          <input ref={additionalFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
            onChange={e => { const file = e.target.files?.[0]; if (file) handleAdditionalFileUpload(file); if (additionalFileInputRef.current) additionalFileInputRef.current.value = ''; }} />
          <p className="text-xs text-gray-400 mt-1.5">Add multiple photos to showcase your deal</p>
        </div>

        {/* Videos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Videos (optional)</label>
          {videoUrls.length > 0 && (
            <div className="space-y-2 mb-3">
              {videoUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-600 truncate flex-1">{url}</span>
                  <button type="button" onClick={() => setVideoUrls(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} className="input-field flex-1"
              placeholder="Paste YouTube or Vimeo URL..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newVideoUrl.trim()) { setVideoUrls(prev => [...prev, newVideoUrl.trim()]); setNewVideoUrl(''); } } }} />
            <button type="button" onClick={() => { if (newVideoUrl.trim()) { setVideoUrls(prev => [...prev, newVideoUrl.trim()]); setNewVideoUrl(''); } }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Add</button>
          </div>

          {/* Ava Video Generation */}
          {canAccess('ai_deal_assistant') && (
            <div className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 shadow-sm shadow-emerald-500/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-800">Ava&apos;s Video Studio</h4>
                  <p className="text-xs text-emerald-500">I&apos;ll turn your deal image into an eye-catching promo video</p>
                </div>
              </div>
              {!form.image_url ? (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Add a deal image first so Ava can generate a video from it
                </p>
              ) : (
                <button type="button" onClick={handleAiVideoGenerate} disabled={aiVideoLoading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-emerald-500/20">
                  {aiVideoLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ava is creating your video...</> : <><Video className="w-4 h-4" /> Generate Video from Image</>}
                </button>
              )}
              {aiVideoLoading && <p className="text-xs text-emerald-500 mt-2 animate-pulse">Ava is working on your video — this takes 1-3 minutes...</p>}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input name="original_price" type="number" step="0.01" min="0" value={form.original_price} onChange={handleChange} className="input-field pl-8" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input name="deal_price" type="number" step="0.01" min="0" value={form.deal_price} onChange={handleChange} className="input-field pl-8" required />
            </div>
          </div>
        </div>

        {discount > 0 && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Calculated Discount:</span>
              <span className="text-2xl font-bold text-green-600">{formatPercentage(discount)} OFF</span>
            </div>
          </div>
        )}

        {/* Deposit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Deposit Amount {deal.deal_type === 'sponti_coupon' ? '*' : '(optional)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">$</span>
            <input name="deposit_amount" type="number" step="0.01" min={deal.deal_type === 'sponti_coupon' ? '1' : '0'}
              value={form.deposit_amount} onChange={handleChange} className="input-field pl-8"
              placeholder={deal.deal_type === 'sponti_coupon' ? '10.00' : '0.00 (optional)'}
              required={deal.deal_type === 'sponti_coupon'} />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {deal.deal_type === 'sponti_coupon'
              ? 'Required for Sponti Coupons. Customer pays this upfront to lock in the deal.'
              : 'Optional. Offer a deposit option so customers can lock in their deal.'}
          </p>
        </div>

        {/* Max Claims */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Claims</label>
          <input name="max_claims" type="number" min="1" value={form.max_claims} onChange={handleChange} className="input-field" placeholder="Leave empty for unlimited" />
        </div>

        {/* Highlights */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Highlights (optional)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {highlights.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full border border-green-200">
                {h}
                <button type="button" onClick={() => setHighlights(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newHighlight} onChange={e => setNewHighlight(e.target.value)} className="input-field flex-1"
              placeholder="e.g., Best Seller, Family Friendly..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newHighlight.trim()) { setHighlights(prev => [...prev, newHighlight.trim()]); setNewHighlight(''); } } }} />
            <button type="button" onClick={() => { if (newHighlight.trim()) { setHighlights(prev => [...prev, newHighlight.trim()]); setNewHighlight(''); } }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Add</button>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amenities (optional)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {amenities.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-full border border-blue-200">
                {a}
                <button type="button" onClick={() => setAmenities(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} className="input-field flex-1"
              placeholder="e.g., Free Parking, WiFi, Pet Friendly..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity(''); } } }} />
            <button type="button" onClick={() => { if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity(''); } }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Add</button>
          </div>
        </div>

        {/* Search Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Search Tags <span className="text-xs text-gray-400 ml-1">(keywords so customers can find your deal)</span>
            </label>
            <button type="button" onClick={generateSearchTags} disabled={generatingTags || !form.title.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all">
              {generatingTags ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full" /> Ava Generate Tags</>}
            </button>
          </div>
          {searchTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {searchTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-sm px-3 py-1.5 rounded-full border border-purple-200">
                  {tag}
                  <button type="button" onClick={() => setSearchTags(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={newTag} onChange={e => setNewTag(e.target.value)} className="input-field flex-1"
              placeholder="Add a custom tag (e.g. date night, family friendly)"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTag.trim() && !searchTags.includes(newTag.trim().toLowerCase())) { setSearchTags(prev => [...prev, newTag.trim().toLowerCase()]); setNewTag(''); } } }} />
            <button type="button" onClick={() => { if (newTag.trim() && !searchTags.includes(newTag.trim().toLowerCase())) { setSearchTags(prev => [...prev, newTag.trim().toLowerCase()]); setNewTag(''); } }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Add</button>
          </div>
        </div>

        {/* How It Works */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">How It Works (optional)</label>
          <textarea name="how_it_works" value={form.how_it_works} onChange={handleChange} className="input-field min-h-[80px]"
            placeholder="Step-by-step instructions: 1. Claim the deal 2. Show QR code at checkout 3. Enjoy your savings!" />
          <p className="text-xs text-gray-400 mt-1">Help customers understand exactly how to use this deal</p>
        </div>

        {/* Terms & Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions (optional)</label>
          <textarea name="terms_and_conditions" value={form.terms_and_conditions} onChange={handleChange} className="input-field min-h-[80px]"
            placeholder="e.g., Valid for dine-in only. Not combinable with other offers." />
        </div>

        {/* Fine Print */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fine Print (optional)</label>
          <textarea name="fine_print" value={form.fine_print} onChange={handleChange} className="input-field min-h-[60px]"
            placeholder="e.g., Must be 18+. Gratuity not included. Subject to availability." />
          <p className="text-xs text-gray-400 mt-1">Short restrictions or legal notes shown prominently to customers</p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Where is this deal available?</span>
          </label>
          <div className="relative">
            <select value={locationMode} onChange={(e) => {
              const mode = e.target.value as typeof locationMode;
              setLocationMode(mode);
              if (mode !== 'specific') setSelectedLocationIds([]);
              if (mode !== 'website') setWebsiteUrl('');
            }} className="input-field appearance-none pr-10">
              {locations.length > 0 && <option value="all">All Locations</option>}
              {locations.length > 0 && <option value="specific">Specific Locations</option>}
              <option value="website">Online / Website</option>
              <option value="none">No Location (General)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {locationMode === 'specific' && locations.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 mt-3">
              {locations.map(loc => {
                const isSelected = selectedLocationIds.includes(loc.id);
                return (
                  <label key={loc.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => {
                      setSelectedLocationIds(prev => isSelected ? prev.filter(id => id !== loc.id) : [...prev, loc.id]);
                    }} className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-secondary-500 truncate">{loc.name}</p>
                      <p className="text-xs text-gray-400 truncate">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {locationMode === 'website' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Website or Product Link</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="input-field pl-10" placeholder="https://www.yourstore.com/product" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Note:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>Deal type ({deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'}) cannot be changed after creation</li>
            <li>Expiration date cannot be changed after creation</li>
            <li>Current claims: {deal.claims_count}</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
            deal.deal_type === 'sponti_coupon'
              ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25'
              : 'bg-secondary-500 hover:bg-secondary-600 shadow-lg shadow-secondary-500/25'
          }`}
        >
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </form>

      {/* Media Picker Modal */}
      <MediaPicker
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          setForm(prev => ({ ...prev, image_url: url }));
          setUploadPreview(null);
          setShowMediaPicker(false);
        }}
        type="image"
      />
    </div>
  );
}
