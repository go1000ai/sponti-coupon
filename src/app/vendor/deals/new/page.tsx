'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';
import { formatCurrency, formatPercentage, calculateDiscount } from '@/lib/utils';
import {
  Tag, AlertCircle, ArrowLeft, Info, Image as ImageIcon,
  Sparkles, Upload, X, Loader2, CheckCircle2, Link as LinkIcon,
  Calendar, Clock, Lock, MapPin, Check, Globe, ChevronDown,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import Link from 'next/link';
import type { Deal, VendorLocation } from '@/lib/types/database';

export default function NewDealPage() {
  const { user } = useAuth();
  const { canAccess } = useVendorTier();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dealType, setDealType] = useState<'regular' | 'sponti_coupon'>('regular');
  const [regularDeal, setRegularDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSource, setAiSource] = useState<'ai' | 'template' | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
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
    duration_hours: '24',
    duration_days: '7',
    image_url: '',
    scheduled_date: '',
    scheduled_time: '',
  });

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Fetch active regular deal for benchmark
    supabase
      .from('deals')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('deal_type', 'regular')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRegularDeal(data));

    // Fetch vendor locations (for multi-location support)
    supabase
      .from('vendor_locations')
      .select('*')
      .eq('vendor_id', user.id)
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLocations(data);
        }
      });
  }, [user]);

  const discount = form.original_price && form.deal_price
    ? calculateDiscount(parseFloat(form.original_price), parseFloat(form.deal_price))
    : 0;

  const regularDiscount = regularDeal
    ? calculateDiscount(regularDeal.original_price, regularDeal.deal_price)
    : 0;

  const meetsMinDiscount = dealType === 'sponti_coupon'
    ? discount - regularDiscount >= 10
    : true;

  const requiredMinDiscount = regularDiscount + 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── AI Assist ──────────────────────────────────────────────
  const handleAiAssist = async () => {
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/ai-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_type: dealType,
          prompt: aiPrompt || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'AI assist failed');
        setAiLoading(false);
        return;
      }

      const s = data.suggestion;
      setForm(prev => ({
        ...prev,
        title: s.title || prev.title,
        description: s.description || prev.description,
        original_price: s.original_price?.toString() || prev.original_price,
        deal_price: s.deal_price?.toString() || prev.deal_price,
        deposit_amount: s.suggested_deposit?.toString() || prev.deposit_amount,
        max_claims: s.max_claims?.toString() || prev.max_claims,
      }));
      setAiSource(data.source);
    } catch {
      setError('Failed to get AI suggestions. Please try again.');
    }
    setAiLoading(false);
  };

  // ── Image Upload ───────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate on client side
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    // Show local preview immediately
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

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let startDate: Date;
    if (scheduleMode === 'scheduled' && form.scheduled_date && form.scheduled_time) {
      startDate = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
      if (startDate <= new Date()) {
        setError('Scheduled time must be in the future.');
        setLoading(false);
        return;
      }
    } else {
      startDate = new Date();
    }

    const startsAt = startDate.toISOString();
    let expiresAt: string;

    if (dealType === 'sponti_coupon') {
      const hours = parseInt(form.duration_hours) || 24;
      expiresAt = new Date(startDate.getTime() + hours * 60 * 60 * 1000).toISOString();
    } else {
      const days = parseInt(form.duration_days) || 7;
      expiresAt = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Determine location_ids based on mode
    let locationIds: string[] | null = null;
    if (locationMode === 'specific' && selectedLocationIds.length > 0) {
      locationIds = selectedLocationIds;
    } else if (locationMode === 'none' || locationMode === 'website') {
      locationIds = []; // empty array = no physical locations
    }
    // null = all locations (default)

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_type: dealType,
          title: form.title,
          description: form.description,
          original_price: parseFloat(form.original_price),
          deal_price: parseFloat(form.deal_price),
          deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
          max_claims: form.max_claims ? parseInt(form.max_claims) : null,
          starts_at: startsAt,
          expires_at: expiresAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          image_url: form.image_url || null,
          location_ids: locationIds,
          website_url: locationMode === 'website' && websiteUrl ? websiteUrl : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push('/vendor/deals/calendar');
    } catch {
      setError('Failed to create deal. Please try again.');
    }

    setLoading(false);
  };

  // Current image to display (upload preview or URL)
  const displayImage = uploadPreview || form.image_url;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <h1 className="text-3xl font-bold text-secondary-500 mb-8">Create New Deal</h1>

      {/* Deal Type Selector */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setDealType('regular')}
          className={`card p-6 text-left transition-all ${dealType === 'regular' ? 'ring-2 ring-secondary-500 shadow-lg' : 'hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gray-100 rounded-lg p-2">
              <Tag className="w-6 h-6 text-secondary-500" />
            </div>
            <h3 className="font-bold text-secondary-500">Steady Deal</h3>
          </div>
          <p className="text-sm text-gray-500">Standard discount lasting 1-30 days. Optional deposit available. Sets your baseline discount.</p>
        </button>

        <button
          type="button"
          onClick={() => setDealType('sponti_coupon')}
          className={`card p-6 text-left transition-all ${dealType === 'sponti_coupon' ? 'ring-2 ring-primary-500 shadow-lg' : 'hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary-50 rounded-lg p-2">
              <SpontiIcon className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-bold text-primary-500">Sponti Coupon</h3>
          </div>
          <p className="text-sm text-gray-500">Flash deal up to 24 hours. Requires deposit. Must beat your Steady Deal by 10%+.</p>
        </button>
      </div>

      {/* Sponti Coupon Warning */}
      {dealType === 'sponti_coupon' && !regularDeal && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700">Active Steady Deal Required</p>
            <p className="text-sm text-amber-600 mt-1">
              You must have an active Steady Deal before posting a Sponti Coupon.
              <Link href="/vendor/deals/new" className="underline ml-1" onClick={() => setDealType('regular')}>
                Create a Steady Deal first
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Benchmark Info for Sponti */}
      {dealType === 'sponti_coupon' && regularDeal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-700">Benchmark: {regularDeal.title}</p>
            <p className="text-sm text-blue-600 mt-1">
              Your Steady Deal is {formatPercentage(regularDiscount)} off.
              Your Sponti Coupon must offer at least {formatPercentage(requiredMinDiscount)} off (10+ points better).
            </p>
          </div>
        </div>
      )}

      {/* ── AI Assist Panel ───────────────────────────────────── */}
      <GatedSection locked={!canAccess('ai_deal_assistant')} requiredTier="business" featureName="AI Deal Assistant" description="Let AI create compelling deal titles, descriptions, and pricing. Upgrade to Business.">
      <div className="card p-6 mb-6 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-violet-100 rounded-lg p-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-violet-800">AI Deal Assistant</h3>
            <p className="text-xs text-violet-500">Let AI create compelling deal content for you</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            className="input-field flex-1 bg-white/80 text-sm"
            placeholder="Optional: describe your deal idea (e.g., 'lunch special for office workers')"
            onKeyDown={e => e.key === 'Enter' && !aiLoading && handleAiAssist()}
          />
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {aiLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Deal</>
            )}
          </button>
        </div>

        {aiSource && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-700">
              {aiSource === 'ai' ? 'Generated by Claude AI' : 'Generated from smart templates'} — fields auto-filled below
            </span>
          </div>
        )}
      </div>
      </GatedSection>

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deal Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., 50% Off All Entrees Tonight Only!"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
            className="input-field min-h-[100px]"
            placeholder="Describe your deal..."
          />
        </div>

        {/* ── Image Upload / URL ─────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Deal Image</span>
          </label>

          {/* Tab toggle */}
          <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              type="button"
              onClick={() => setImageMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                imageMode === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => setImageMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                imageMode === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Paste URL
            </button>
          </div>

          {imageMode === 'upload' ? (
            <div>
              {/* Drop zone */}
              {!displayImage && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium text-gray-600">
                    {dragActive ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF • Max 5MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                className="input-field flex-1"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          )}

          {/* Image preview */}
          {displayImage && (
            <div className="relative mt-3 inline-block">
              <div className="w-full max-w-xs h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImage}
                  alt="Deal preview"
                  className="w-full h-full object-cover"
                />
              </div>
              {uploading && (
                <div className="absolute inset-0 max-w-xs bg-black/50 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-1.5">Upload a photo or paste a URL for your deal image (optional)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                name="original_price"
                type="number"
                step="0.01"
                min="0"
                value={form.original_price}
                onChange={handleChange}
                className="input-field pl-8"
                placeholder="100.00"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                name="deal_price"
                type="number"
                step="0.01"
                min="0"
                value={form.deal_price}
                onChange={handleChange}
                className="input-field pl-8"
                placeholder="50.00"
                required
              />
            </div>
          </div>
        </div>

        {/* Discount Preview */}
        {discount > 0 && (
          <div className={`p-4 rounded-lg ${
            dealType === 'sponti_coupon' && !meetsMinDiscount
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Calculated Discount:</span>
              <span className={`text-2xl font-bold ${
                dealType === 'sponti_coupon' && !meetsMinDiscount
                  ? 'text-red-500'
                  : 'text-green-600'
              }`}>
                {formatPercentage(discount)} OFF
              </span>
            </div>
            {dealType === 'sponti_coupon' && !meetsMinDiscount && (
              <p className="text-sm text-red-600 mt-2">
                Need at least {formatPercentage(requiredMinDiscount)} off.
                Savings: {formatCurrency(parseFloat(form.original_price) - parseFloat(form.deal_price))}
              </p>
            )}
          </div>
        )}

        {/* ── Deposit — available for BOTH deal types ──────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Deposit Amount {dealType === 'sponti_coupon' ? '*' : '(optional)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">$</span>
            <input
              name="deposit_amount"
              type="number"
              step="0.01"
              min={dealType === 'sponti_coupon' ? '1' : '0'}
              value={form.deposit_amount}
              onChange={handleChange}
              className="input-field pl-8"
              placeholder={dealType === 'sponti_coupon' ? '10.00' : '0.00 (optional)'}
              required={dealType === 'sponti_coupon'}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {dealType === 'sponti_coupon'
              ? 'Required for Sponti Coupons. Customer pays this upfront to lock in the deal. Non-refundable if not redeemed.'
              : 'Optional. Offer a deposit option so customers can lock in their deal with a small upfront payment.'}
          </p>

          {/* Vendor deposit control notice */}
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">You control the deposit</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              You decide whether to require a deposit, the full amount, or no payment upfront.
              Deposits help reduce no-shows and secure customer commitment.
              SpontiCoupon does not guarantee customer attendance — the deposit is your tool to protect against no-shows.
            </p>
          </div>
        </div>

        {/* ── Scheduling (Pro+ feature) ─────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">When should this deal start?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScheduleMode('now')}
              className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                scheduleMode === 'now'
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1.5" />
              Start Immediately
            </button>
            {canAccess('custom_scheduling') ? (
              <button
                type="button"
                onClick={() => setScheduleMode('scheduled')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                  scheduleMode === 'scheduled'
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1.5" />
                Schedule for Later
              </button>
            ) : (
              <div className="p-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed relative">
                <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                Schedule for Later
                <span className="block text-[10px] mt-0.5 text-gray-400">Pro plan required</span>
              </div>
            )}
          </div>

          {scheduleMode === 'scheduled' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={form.scheduled_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                <input
                  type="time"
                  name="scheduled_time"
                  value={form.scheduled_time}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Location Selector ────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Where is this deal available?</span>
          </label>

          <div className="relative">
            <select
              value={locationMode}
              onChange={(e) => {
                const mode = e.target.value as typeof locationMode;
                setLocationMode(mode);
                if (mode !== 'specific') setSelectedLocationIds([]);
                if (mode !== 'website') setWebsiteUrl('');
              }}
              className="input-field appearance-none pr-10"
            >
              {locations.length > 0 && <option value="all">All Locations</option>}
              {locations.length > 0 && <option value="specific">Specific Locations</option>}
              <option value="website">Online / Website</option>
              <option value="none">No Location (General)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Specific locations — multi-select list */}
          {locationMode === 'specific' && locations.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 mt-3">
              {locations.map(loc => {
                const isSelected = selectedLocationIds.includes(loc.id);
                return (
                  <label
                    key={loc.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedLocationIds(prev =>
                          isSelected
                            ? prev.filter(id => id !== loc.id)
                            : [...prev, loc.id]
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-secondary-500 truncate">{loc.name}</p>
                      <p className="text-xs text-gray-400 truncate">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                    </div>
                  </label>
                );
              })}
              {selectedLocationIds.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> Select at least one location
                </p>
              )}
            </div>
          )}

          {/* Website / Online Store URL */}
          {locationMode === 'website' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Website or Product Link</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="input-field pl-10"
                  placeholder="https://www.yourstore.com/product"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Link to your website or directly to the product page where customers can redeem this deal.
              </p>
            </div>
          )}

          {/* Helper text */}
          <p className="text-xs text-gray-400 mt-1.5">
            {locationMode === 'all' && 'This deal will be available at all your locations.'}
            {locationMode === 'specific' && 'Choose which locations offer this deal.'}
            {locationMode === 'website' && 'This deal is available online — customers will use the link to access it.'}
            {locationMode === 'none' && 'This deal is not tied to a specific location or website.'}
          </p>
        </div>

        {/* Duration fields */}
        {dealType === 'sponti_coupon' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours, 4-24)</label>
            <input
              name="duration_hours"
              type="number"
              min="4"
              max="24"
              value={form.duration_hours}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days, 1-30)</label>
            <input
              name="duration_days"
              type="number"
              min="1"
              max="30"
              value={form.duration_days}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Claims (optional)</label>
          <input
            name="max_claims"
            type="number"
            min="1"
            value={form.max_claims}
            onChange={handleChange}
            className="input-field"
            placeholder="Leave empty for unlimited"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (dealType === 'sponti_coupon' && (!regularDeal || !meetsMinDiscount))}
          className={`w-full text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 ${
            dealType === 'sponti_coupon'
              ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25'
              : 'bg-secondary-500 hover:bg-secondary-600 shadow-lg shadow-secondary-500/25'
          }`}
        >
          {loading ? 'Creating...' : dealType === 'sponti_coupon' ? 'Create Sponti Coupon' : 'Create Steady Deal'}
        </button>
      </form>
    </div>
  );
}
