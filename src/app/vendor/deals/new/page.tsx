'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';
import { formatCurrency, formatPercentage, calculateDiscount } from '@/lib/utils';
import {
  Tag, AlertCircle, ArrowLeft, Info, Image as ImageIcon,
  Sparkles, Upload, X, Loader2, CheckCircle2, Link as LinkIcon,
  Calendar, Clock, Lock, MapPin, Globe, ChevronDown, Wand2, Video, Save,
  FileEdit, Trash2, Plus,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import Link from 'next/link';
import type { Deal, DealVariant, VendorLocation } from '@/lib/types/database';
import MediaPicker from '@/components/vendor/MediaPicker';
import DealAdvisor from '@/components/vendor/DealAdvisor';

// Category-specific suggested features/perks
const CATEGORY_FEATURES: Record<string, string[]> = {
  'Restaurants': ['Free WiFi', 'Outdoor Seating', 'Parking Available', 'Wheelchair Accessible', 'Pet-Friendly Patio', 'Live Music', 'Happy Hour', 'Reservations', 'Takeout', 'Delivery', 'Catering'],
  'Food & Drink': ['Free WiFi', 'Outdoor Seating', 'Parking Available', 'Takeout', 'Delivery', 'Dine-In', 'Catering', 'Drive-Through'],
  'Beauty & Spa': ['Free WiFi', 'Parking Available', 'Private Rooms', 'Complimentary Drinks', 'Towel Service', 'Appointment Required', 'Walk-Ins Welcome', 'Gift Cards Available', 'Couples Packages'],
  'Health & Fitness': ['Free WiFi', 'Parking Available', 'Showers', 'Lockers', 'Personal Trainers', 'Group Classes', 'Equipment Included', 'First Session Free', 'Open 24/7'],
  'Wellness': ['Free WiFi', 'Parking Available', 'Private Rooms', 'Appointment Required', 'Walk-Ins Welcome', 'Complimentary Drinks', 'Relaxation Lounge'],
  'Entertainment': ['Free WiFi', 'Parking Available', 'Wheelchair Accessible', 'All Ages', '21+ Only', 'Live Performances', 'Food & Drinks Available', 'Group Discounts'],
  'Nightlife': ['Parking Available', 'VIP Area', 'Live DJ', 'Dance Floor', 'Full Bar', '21+ Only', 'Bottle Service', 'Coat Check'],
  'Shopping': ['Free WiFi', 'Parking Available', 'Wheelchair Accessible', 'Gift Wrapping', 'Returns Accepted', 'Loyalty Rewards', 'Fitting Rooms', 'Personal Shopper'],
  'Travel': ['Free WiFi', 'Airport Shuttle', 'Pool', 'Gym Access', 'Continental Breakfast', 'Room Service', 'Concierge', 'Pet-Friendly', 'Free Cancellation'],
  'Automotive': ['Free WiFi', 'Shuttle Service', 'Loaner Vehicles', 'Free Estimates', 'Same-Day Service', 'Appointment Required', 'Walk-Ins Welcome'],
  'Home Services': ['Free Estimates', 'Licensed & Insured', 'Same-Day Service', 'Weekend Availability', 'Senior Discount', 'Military Discount', 'Eco-Friendly Products'],
  'Education': ['Free WiFi', 'Parking Available', 'Online Classes', 'In-Person', 'Materials Included', 'Certificate Provided', 'Flexible Schedule', 'Group Rates'],
  'Technology': ['Free WiFi', 'Same-Day Service', 'Free Diagnostics', 'Warranty Included', 'Remote Support', 'On-Site Service', 'Pickup & Delivery'],
  'Pets': ['Free WiFi', 'Parking Available', 'Grooming', 'Boarding', 'Daycare', 'Vet On-Site', 'Outdoor Play Area', 'Webcam Access'],
  'Photography': ['Free WiFi', 'Indoor Studio', 'Outdoor Shoots', 'Props Included', 'Digital Files Included', 'Prints Available', 'Same-Day Delivery', 'Weekend Availability'],
};

// Universal features that apply to any category
const UNIVERSAL_FEATURES = ['Free WiFi', 'Parking Available', 'Wheelchair Accessible', 'Gift Cards Available'];

function VariantForm({ initial, onSave, onCancel, isEditing }: {
  initial: DealVariant | null;
  onSave: (v: DealVariant) => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [originalPrice, setOriginalPrice] = useState(initial?.original_price?.toString() || '');
  const [price, setPrice] = useState(initial?.price?.toString() || '');
  const [depositAmount, setDepositAmount] = useState(initial?.deposit_amount?.toString() || '');
  const [maxClaims, setMaxClaims] = useState(initial?.max_claims?.toString() || '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const variantFileRef = useRef<HTMLInputElement>(null);

  const handleVariantImageUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) setImageUrl(data.url);
    } catch { /* ignore */ }
    setUploadingImage(false);
  };

  const handleSave = () => {
    if (!name.trim() || !originalPrice || !price) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      original_price: parseFloat(originalPrice),
      price: parseFloat(price),
      deposit_amount: depositAmount ? parseFloat(depositAmount) : undefined,
      max_claims: maxClaims ? parseInt(maxClaims) : undefined,
      claims_count: initial?.claims_count || 0,
      image_url: imageUrl || undefined,
    });
    if (!isEditing) {
      setName(''); setDescription(''); setOriginalPrice(''); setPrice(''); setDepositAmount(''); setMaxClaims(''); setImageUrl('');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-dashed border-primary-300 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">{isEditing ? 'Edit Variation' : 'Add Variation'}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Variation name (e.g., Basic, Premium)" className="input-field text-sm" />
        </div>
        <div className="col-span-2">
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description (optional)" className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Original Price</label>
          <input type="number" step="0.01" min="0" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="0.00" className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Deal Price</label>
          <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Deposit (optional)</label>
          <input type="number" step="0.01" min="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Max Claims (optional)</label>
          <input type="number" min="1" value={maxClaims} onChange={e => setMaxClaims(e.target.value)} placeholder="Unlimited" className="input-field text-sm" />
        </div>
        {/* Variant Image */}
        <div className="col-span-2">
          <label className="block text-[11px] text-gray-500 mb-1">Variation Image (optional)</label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={name || 'Variant'} className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setImageUrl(''); if (variantFileRef.current) variantFileRef.current.value = ''; }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => variantFileRef.current?.click()}
                disabled={uploadingImage}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 flex items-center justify-center transition-colors shrink-0"
              >
                {uploadingImage ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <ImageIcon className="w-5 h-5 text-gray-400" />}
              </button>
            )}
            <input ref={variantFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleVariantImageUpload(f); }} />
            <p className="text-[11px] text-gray-400">When selected, this image shows in the gallery</p>
          </div>
        </div>
      </div>
      {originalPrice && price && parseFloat(price) < parseFloat(originalPrice) && (
        <p className="text-xs text-green-600 font-medium">
          {formatPercentage(((parseFloat(originalPrice) - parseFloat(price)) / parseFloat(originalPrice)) * 100)} OFF — Saves {formatCurrency(parseFloat(originalPrice) - parseFloat(price))}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSave} disabled={!name.trim() || !originalPrice || !price}
          className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {isEditing ? 'Update' : 'Add'}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-500 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewDealPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiSuggest = searchParams.get('ai_suggest') === 'true';
  const fromWebsite = searchParams.get('from_website') === 'true';
  const suggestedType = searchParams.get('deal_type') as 'regular' | 'sponti_coupon' | null;
  const suggestedDiscount = searchParams.get('discount');
  const [dealType, setDealType] = useState<'regular' | 'sponti_coupon'>(suggestedType || 'regular');
  const [regularDeal, setRegularDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'ai' | 'library'>('upload');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAdditionalMediaPicker, setShowAdditionalMediaPicker] = useState(false);
  const [additionalImageUrl, setAdditionalImageUrl] = useState('');
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiVideoLoading, setAiVideoLoading] = useState(false);
  const [videoSourceImage, setVideoSourceImage] = useState<string>('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSource, setAiSource] = useState<'ai' | 'template' | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<'all' | 'specific' | 'none' | 'website'>('all');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [vendorCategory, setVendorCategory] = useState<string | null>(null);
  const [requiresAppointment, setRequiresAppointment] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [generatingTags, setGeneratingTags] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'drafts'>('new');
  const [drafts, setDrafts] = useState<Deal[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [draftToast, setDraftToast] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<DealVariant[]>([]);
  const [editingVariant, setEditingVariant] = useState<DealVariant | null>(null);
  const [aiVariantsLoading, setAiVariantsLoading] = useState(false);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
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
    terms_and_conditions: '',
    how_it_works: '',
    fine_print: '',
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

    // Fetch vendor category and name for suggested features & fine print
    supabase
      .from('vendors')
      .select('category, business_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.category) setVendorCategory(data.category);
        if (data?.business_name) setVendorName(data.business_name);
      });

    // Fetch drafts
    fetchDrafts();
  }, [user]);

  // Pre-fill form when coming from Website Import
  const websiteTriggered = useRef(false);
  useEffect(() => {
    if (fromWebsite && !websiteTriggered.current) {
      websiteTriggered.current = true;
      const p = searchParams;
      setForm(prev => ({
        ...prev,
        title: p.get('title') || prev.title,
        description: p.get('description') || prev.description,
        original_price: p.get('original_price') || prev.original_price,
        deal_price: p.get('deal_price') || prev.deal_price,
        max_claims: p.get('max_claims') || prev.max_claims,
        image_url: p.get('image_url') || prev.image_url,
        terms_and_conditions: p.get('terms') || prev.terms_and_conditions,
        how_it_works: p.get('how_it_works') || prev.how_it_works,
        fine_print: p.get('fine_print') || prev.fine_print,
      }));
      if (p.get('image_url')) setImageMode('url');
      try {
        const imgUrlsRaw = p.get('image_urls');
        if (imgUrlsRaw) setAdditionalImages(JSON.parse(imgUrlsRaw));
      } catch { /* ignore */ }
      try {
        const hlRaw = p.get('highlights');
        if (hlRaw) setHighlights(JSON.parse(hlRaw));
      } catch { /* ignore */ }
      try {
        const amRaw = p.get('amenities');
        if (amRaw) setAmenities(JSON.parse(amRaw));
      } catch { /* ignore */ }
      if (p.get('deal_type') === 'sponti_coupon') setDealType('sponti_coupon');
      setAiSource('ai'); // Mark that this was AI-generated
    }
  }, [fromWebsite, searchParams]);

  // Auto-trigger full AI pipeline when coming from AI Deal Advisor
  const aiTriggered = useRef(false);
  const [aiPipelineStep, setAiPipelineStep] = useState<string | null>(null);
  useEffect(() => {
    if (aiSuggest && user && !aiTriggered.current) {
      aiTriggered.current = true;
      const hint = suggestedDiscount
        ? `Create a deal in the ${suggestedDiscount} discount range. Make it compelling and ready to publish.`
        : undefined;

      const runPipeline = async () => {
        let generatedTitle = '';
        let generatedDescription = '';

        // Step 1: Generate deal text (title, description, pricing)
        setAiPipelineStep('Ava is crafting your deal details...');
        setAiLoading(true);
        try {
          const res = await fetch('/api/vendor/ai-deal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deal_type: dealType, prompt: hint }),
          });
          const data = await res.json();
          if (res.ok && data.suggestion) {
            const s = data.suggestion;
            generatedTitle = s.title || '';
            generatedDescription = s.description || '';
            setForm(prev => ({
              ...prev,
              title: s.title || prev.title,
              description: s.description || prev.description,
              original_price: s.original_price?.toString() || prev.original_price,
              deal_price: s.deal_price?.toString() || prev.deal_price,
              deposit_amount: s.suggested_deposit?.toString() || prev.deposit_amount,
              max_claims: s.max_claims?.toString() || prev.max_claims,
              terms_and_conditions: s.terms_and_conditions || prev.terms_and_conditions,
              how_it_works: s.how_it_works || prev.how_it_works,
              fine_print: s.fine_print || prev.fine_print,
            }));
            if (s.highlights) setHighlights(s.highlights);
            if (s.amenities) setAmenities(s.amenities);
            setAiSource(data.source);
          }
        } catch { /* continue */ }
        setAiLoading(false);

        if (!generatedTitle) { setAiPipelineStep(null); return; }

        // Step 2: Generate image from the deal title/description
        setAiPipelineStep('Ava is creating your image...');
        setAiImageLoading(true);
        try {
          const res = await fetch('/api/vendor/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: generatedTitle, description: generatedDescription }),
          });
          const data = await res.json();
          if (res.ok && data.url) {
            setForm(prev => ({ ...prev, image_url: data.url }));
            setImageMode('ai');
          }
        } catch { /* continue */ }
        setAiImageLoading(false);

        // Step 3: Generate search tags
        setAiPipelineStep('Ava is picking search tags...');
        setGeneratingTags(true);
        try {
          const res = await fetch('/api/vendor/generate-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: generatedTitle,
              description: generatedDescription,
              deal_type: dealType,
            }),
          });
          const data = await res.json();
          if (res.ok && data.tags) {
            setSearchTags(data.tags);
          }
        } catch { /* continue */ }
        setGeneratingTags(false);

        setAiPipelineStep(null);
      };

      const timer = setTimeout(runPipeline, 500);
      return () => clearTimeout(timer);
    }
  }, [aiSuggest, user, dealType, suggestedDiscount]);

  const discount = form.original_price && form.deal_price
    ? calculateDiscount(parseFloat(form.original_price), parseFloat(form.deal_price))
    : 0;

  const regularDiscount = regularDeal
    ? calculateDiscount(regularDeal.original_price, regularDeal.deal_price)
    : 0;

  // Soft benchmark: if a Steady Deal exists, suggest 10+ points better
  const beatsSteadyDeal = regularDeal ? discount - regularDiscount >= 10 : true;
  const suggestedMinDiscount = regularDeal ? regularDiscount + 10 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Auto-generate fine print based on deal settings
  const generateFinePrint = useCallback(() => {
    const lines: string[] = [];
    lines.push('One per customer. Subject to availability. Cannot be combined with other offers.');

    const depositVal = parseFloat(form.deposit_amount);
    if (depositVal > 0) {
      if (dealType === 'sponti_coupon') {
        lines.push(`Deposit of $${depositVal.toFixed(2)} is non-refundable if not redeemed before expiration.`);
      } else {
        lines.push(`If not redeemed before expiration, your deposit of $${depositVal.toFixed(2)} converts to a credit with ${vendorName || 'this business'}. Credit never expires.`);
      }
    }

    if (requiresAppointment) {
      lines.push('This deal requires an appointment. The deal is honored as long as the appointment is scheduled before the deal expires — the appointment itself may be after the expiration date.');
    } else {
      lines.push('No appointment necessary. Walk-ins welcome.');
    }

    return lines.join('\n');
  }, [form.deposit_amount, dealType, requiresAppointment, vendorName]);

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
        setError(data.error || 'Ava couldn\'t generate that — try again!');
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
        terms_and_conditions: s.terms_and_conditions || prev.terms_and_conditions,
        how_it_works: s.how_it_works || prev.how_it_works,
        fine_print: s.fine_print || prev.fine_print,
      }));
      if (s.highlights) setHighlights(s.highlights);
      if (s.amenities) setAmenities(s.amenities);
      setAiSource(data.source);
    } catch {
      setError('Ava had trouble generating suggestions. Please try again.');
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

  // ── Additional Image Upload ────────────────────────────────
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

  // ── AI Image Generation ──────────────────────────────────
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

  // ── AI Video Generation ──────────────────────────────────
  const allDealImages = [form.image_url, ...additionalImages].filter(Boolean);

  const handleAiVideoGenerate = async () => {
    const sourceImage = videoSourceImage || form.image_url;
    if (!sourceImage) {
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
          image_url: sourceImage,
          title: form.title,
          description: form.description,
          video_prompt: videoPrompt || undefined,
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

  // ── AI Search Tags ────────────────────────────────────────
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
          deal_type: dealType,
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
          image_urls: additionalImages,
          location_ids: locationIds,
          website_url: locationMode === 'website' && websiteUrl ? websiteUrl : null,
          terms_and_conditions: form.terms_and_conditions || null,
          video_urls: videoUrls,
          amenities,
          how_it_works: form.how_it_works || null,
          highlights,
          fine_print: form.fine_print || null,
          requires_appointment: requiresAppointment,
          search_tags: searchTags,
          variants: dealType === 'regular' && hasVariants ? variants : [],
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

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    setDraftsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    setDrafts(data || []);
    setDraftsLoading(false);
  }, [user]);

  const handleDeleteDraft = async (id: string) => {
    setDeletingDraft(id);
    const supabase = createClient();
    await supabase.from('deals').delete().eq('id', id);
    setDrafts(prev => prev.filter(d => d.id !== id));
    setDeletingDraft(null);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');
    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          deal_type: dealType,
          title: form.title || undefined,
          description: form.description || undefined,
          original_price: form.original_price ? parseFloat(form.original_price) : undefined,
          deal_price: form.deal_price ? parseFloat(form.deal_price) : undefined,
          deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : undefined,
          max_claims: form.max_claims ? parseInt(form.max_claims) : undefined,
          image_url: form.image_url || undefined,
          image_urls: additionalImages.length > 0 ? additionalImages : undefined,
          video_urls: videoUrls.length > 0 ? videoUrls : undefined,
          terms_and_conditions: form.terms_and_conditions || undefined,
          how_it_works: form.how_it_works || undefined,
          highlights: highlights.length > 0 ? highlights : undefined,
          fine_print: form.fine_print || undefined,
          requires_appointment: requiresAppointment,
          amenities: amenities.length > 0 ? amenities : undefined,
          search_tags: searchTags.length > 0 ? searchTags : undefined,
          variants: dealType === 'regular' && hasVariants && variants.length > 0 ? variants : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save draft');
        setSavingDraft(false);
        return;
      }
      // Show toast, refresh drafts, switch to drafts tab
      setDraftToast(true);
      setTimeout(() => setDraftToast(false), 3000);
      await fetchDrafts();
      setActiveTab('drafts');
    } catch {
      setError('Failed to save draft. Please try again.');
    }
    setSavingDraft(false);
  };

  // Current image to display (upload preview or URL)
  const displayImage = uploadPreview || form.image_url;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Draft Saved Toast */}
      {draftToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-green-600/25 animate-in slide-in-from-top">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">Draft saved</span>
        </div>
      )}

      <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Deals</h1>

      {/* Tabs: New Deal / Drafts */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'new'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plus className="w-4 h-4" /> Create New Deal
        </button>
        <button
          onClick={() => { setActiveTab('drafts'); fetchDrafts(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'drafts'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileEdit className="w-4 h-4" /> Drafts
          {drafts.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {drafts.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════ DRAFTS TAB ═══════════════ */}
      {activeTab === 'drafts' && (
        <div>
          {draftsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="card p-12 text-center">
              <FileEdit className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No drafts yet</h3>
              <p className="text-sm text-gray-400 mb-6">
                Start creating a deal and save it as a draft to continue later.
              </p>
              <button
                onClick={() => setActiveTab('new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8632B] text-white rounded-xl font-medium text-sm hover:bg-[#D55A25] transition-all"
              >
                <Plus className="w-4 h-4" /> Create New Deal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map(draft => (
                <div
                  key={draft.id}
                  className="card overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                  onClick={() => router.push(`/vendor/deals/edit?id=${draft.id}`)}
                >
                  {/* Image or Placeholder */}
                  {draft.image_url ? (
                    <div className="aspect-[16/10] bg-gray-100">
                      <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                      <FileEdit className="w-10 h-10 text-amber-300" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 truncate">
                          {draft.title || 'Untitled Draft'}
                        </h3>
                        {draft.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{draft.description}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        draft.deal_type === 'sponti_coupon'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {draft.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}
                      </span>
                    </div>

                    {/* Pricing */}
                    {(draft.deal_price > 0 || draft.original_price > 0) && (
                      <div className="flex items-center gap-2 mt-3">
                        {draft.deal_price > 0 && (
                          <span className="text-lg font-bold text-primary-500">{formatCurrency(draft.deal_price)}</span>
                        )}
                        {draft.original_price > 0 && (
                          <span className="text-sm text-gray-400 line-through">{formatCurrency(draft.original_price)}</span>
                        )}
                        {draft.discount_percentage > 0 && (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            {Math.round(draft.discount_percentage)}% off
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        Saved {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/vendor/deals/edit?id=${draft.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit draft"
                        >
                          <FileEdit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.id); }}
                          disabled={deletingDraft === draft.id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete draft"
                        >
                          {deletingDraft === draft.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ NEW DEAL TAB ═══════════════ */}
      {activeTab === 'new' && <>
      {/* Ava Pipeline Progress Banner */}
      {aiPipelineStep && (
        <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-300 ring-offset-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700">Ava is building your deal...</p>
            <p className="text-xs text-emerald-500">{aiPipelineStep}</p>
          </div>
        </div>
      )}

      {/* Deal Type Selector */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setDealType('regular')}
          className={`card p-6 text-left transition-all ${dealType === 'regular' ? 'ring-2 ring-secondary-500 shadow-lg' : 'hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gray-100 rounded-lg p-2">
              <Tag className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="font-bold text-gray-900">Steady Deal</h3>
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
          <p className="text-sm text-gray-500">Sponti deal up to 24 hours. Requires deposit. Set your own discount — Ava can help!</p>
        </button>
      </div>

      {/* Benchmark Info for Sponti (soft suggestion, not a blocker) */}
      {dealType === 'sponti_coupon' && regularDeal && (
        <div className={`${beatsSteadyDeal ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 mb-6 flex items-start gap-3`}>
          <Info className={`w-5 h-5 ${beatsSteadyDeal ? 'text-blue-500' : 'text-amber-500'} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`font-semibold ${beatsSteadyDeal ? 'text-blue-700' : 'text-amber-700'}`}>
              {beatsSteadyDeal ? 'Great pricing!' : 'Pricing tip'}
            </p>
            <p className={`text-sm ${beatsSteadyDeal ? 'text-blue-600' : 'text-amber-600'} mt-1`}>
              Your Steady Deal &quot;{regularDeal.title}&quot; is {formatPercentage(regularDiscount)} off.
              {beatsSteadyDeal
                ? ' Your Sponti Coupon beats it — customers will love the urgency!'
                : ` For maximum impact, consider offering ${formatPercentage(suggestedMinDiscount)}+ off (10+ points better than your Steady Deal).`
              }
            </p>
          </div>
        </div>
      )}

      {/* Ava Pricing Tip for Sponti deals without a benchmark */}
      {dealType === 'sponti_coupon' && !regularDeal && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5 shadow-md shadow-emerald-500/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-emerald-700">Set your own price!</p>
            <p className="text-sm text-emerald-600 mt-1">
              No minimum discount required. Ask <strong>Ava</strong> below to get a smart pricing suggestion based on your category and market.
            </p>
          </div>
        </div>
      )}

      {/* ── Ava — Deal Content Generator ──────────────────────── */}
      <GatedSection loading={tierLoading} locked={!canAccess('ai_deal_assistant')} requiredTier="business" featureName="Ava — AI Deal Strategist" description="Let Ava create compelling deal titles, descriptions, and pricing. Upgrade to Business.">
      <div className="card p-6 mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md shadow-emerald-500/20 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-800 flex items-center gap-1.5">
              Ava <span className="text-[10px] font-normal text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded-full">Deal Generator</span>
            </h3>
            <p className="text-xs text-emerald-500">Tell me your deal idea and I&apos;ll write compelling content for you</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            className="input-field flex-1 bg-white/80 text-sm"
            placeholder="Describe your deal idea (e.g., 'lunch special for office workers')"
            onKeyDown={e => e.key === 'Enter' && !aiLoading && handleAiAssist()}
          />
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
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
              {aiSource === 'ai' ? 'Generated by Ava' : 'Generated from smart templates'} — fields auto-filled below
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
            {canAccess('ai_deal_assistant') && (
              <button
                type="button"
                onClick={() => setImageMode('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  imageMode === 'ai' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' : 'text-emerald-600 hover:text-emerald-700'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ava.png" alt="Ava" className="w-4 h-4 rounded-full" /> Ava Generate
              </button>
            )}
            <button
              type="button"
              onClick={() => setImageMode('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                imageMode === 'library' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Library
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
          ) : imageMode === 'url' ? (
            <div className="flex gap-2">
              <input
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                className="input-field flex-1"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          ) : imageMode === 'library' ? (
            /* Library mode */
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50/30">
              <ImageIcon className="w-10 h-10 text-blue-400 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-800 mb-1">Pick from Library</h4>
              <p className="text-sm text-blue-600 mb-4">Select from your previously uploaded or Ava-generated images</p>
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all"
              >
                Browse Library
              </button>
            </div>
          ) : (
            /* Ava Image Generate mode */
            <div className="border-2 border-dashed border-emerald-200 rounded-xl p-6 text-center bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
              {!displayImage ? (
                <>
                  <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-semibold text-emerald-800 mb-1">Ava&apos;s Image Studio</h4>
                  <p className="text-sm text-emerald-600 mb-3">
                    Tell me what you want and I&apos;ll generate a professional image for your deal.
                  </p>
                  <input
                    value={customImagePrompt}
                    onChange={e => setCustomImagePrompt(e.target.value)}
                    className="w-full max-w-md mx-auto px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4"
                    placeholder="Describe the image (e.g., 'a cozy Italian restaurant with warm lighting')"
                  />
                  {!form.title && !customImagePrompt && (
                    <p className="text-xs text-amber-600 mb-3 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Enter a deal title or image description
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (customImagePrompt) {
                        // Use custom prompt
                        setAiImageLoading(true);
                        setError('');
                        fetch('/api/vendor/generate-image', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: form.title || customImagePrompt,
                            description: form.description,
                            custom_prompt: customImagePrompt,
                          }),
                        })
                          .then(r => r.json())
                          .then(data => {
                            if (data.url) {
                              setForm(prev => ({ ...prev, image_url: data.url }));
                              setUploadPreview(null);
                            } else {
                              setError(data.error || 'Failed to generate image');
                            }
                          })
                          .catch(() => setError('Failed to generate image.'))
                          .finally(() => setAiImageLoading(false));
                      } else {
                        handleAiImageGenerate();
                      }
                    }}
                    disabled={aiImageLoading || (!form.title && !customImagePrompt)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 mx-auto disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                  >
                    {aiImageLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Ava is creating your image...</>
                    ) : (
                      <><Wand2 className="w-5 h-5" /> Generate Image</>
                    )}
                  </button>
                  {aiImageLoading && (
                    <p className="text-xs text-emerald-500 mt-3 animate-pulse">
                      This may take 10-15 seconds...
                    </p>
                  )}
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

          <p className="text-xs text-gray-400 mt-1.5">Upload a photo or paste a URL for your main deal image (optional)</p>
        </div>

        {/* ── Additional Images ─────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Images ({additionalImages.length}/10)
          </label>
          {additionalImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {additionalImages.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Additional ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
          <input
            ref={additionalFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleAdditionalFileUpload(file);
              if (additionalFileInputRef.current) additionalFileInputRef.current.value = '';
            }}
          />
          <p className="text-xs text-gray-400 mt-1.5">Add multiple photos to showcase your deal — customers can scroll through them</p>
        </div>

        {/* ── Video URLs ───────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Videos ({videoUrls.length})</label>
          {videoUrls.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {videoUrls.map((url, i) => {
                const isDirectVideo = url.match(/\.(mp4|webm|mov)(\?|$)/i) || url.includes('supabase');
                return (
                  <div key={i} className="relative group">
                    {isDirectVideo ? (
                      <div className="w-40 h-24 rounded-xl overflow-hidden border border-gray-200 bg-black">
                        <video src={url} className="w-full h-full object-cover" muted playsInline
                          onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                      </div>
                    ) : (
                      <div className="w-40 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center relative">
                        <Video className="w-8 h-8 text-gray-400" />
                        <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white truncate">{url}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => setVideoUrls(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"><X className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newVideoUrl}
              onChange={e => setNewVideoUrl(e.target.value)}
              className="input-field flex-1"
              placeholder="Video URL (YouTube, Vimeo, or direct link)..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newVideoUrl.trim()) {
                    setVideoUrls(prev => [...prev, newVideoUrl.trim()]);
                    setNewVideoUrl('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newVideoUrl.trim()) {
                  setVideoUrls(prev => [...prev, newVideoUrl.trim()]);
                  setNewVideoUrl('');
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Add video links to show off your product or service</p>

          {/* Ava Video Generation */}
          {canAccess('ai_deal_assistant') && (
            <div className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 shadow-sm shadow-emerald-500/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-800">Ava&apos;s Video Studio</h4>
                  <p className="text-xs text-emerald-500">Pick an image &rarr; Ava turns it into a cinematic promo video</p>
                </div>
              </div>
              {allDealImages.length === 0 ? (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Add a deal image first so Ava can generate a video from it
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {/* Image picker */}
                  <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">Choose source image</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allDealImages.map((img, i) => {
                      const isSelected = (videoSourceImage || form.image_url) === img;
                      return (
                        <button key={i} type="button" onClick={() => setVideoSourceImage(img)}
                          className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-300 shadow-md' : 'border-gray-200 hover:border-emerald-300'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt={`Source ${i + 1}`} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-emerald-600 drop-shadow" />
                            </div>
                          )}
                          {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">Main</span>}
                        </button>
                      );
                    })}
                  </div>
                  {/* Video prompt */}
                  <div>
                    <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Describe your video (optional)</p>
                    <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)}
                      className="w-full text-sm border border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 resize-none placeholder:text-emerald-400"
                      rows={2} placeholder="e.g., Slow zoom into the product with warm lighting, then pan to show the details..." />
                  </div>
                  {/* Generate button */}
                  <button type="button" onClick={handleAiVideoGenerate} disabled={aiVideoLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-emerald-500/20">
                    {aiVideoLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Ava is creating your video...</>
                    ) : (
                      <><Video className="w-4 h-4" /> Generate Video</>
                    )}
                  </button>
                  {aiVideoLoading && (
                    <p className="text-xs text-emerald-500 text-center animate-pulse">
                      This takes 1–3 minutes. You can keep editing while Ava works.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Deal Variations (Steady deals only) ──────────── */}
        {dealType === 'regular' && (
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Deal Variations</label>
                <p className="text-xs text-gray-500 mt-0.5">Offer multiple options at different price points</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHasVariants(!hasVariants);
                  if (hasVariants) setVariants([]);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${hasVariants ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${hasVariants ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {hasVariants && (
              <div className="space-y-3 mt-4">
                {/* Ask Ava to suggest variations */}
                {variants.length === 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      setAiVariantsLoading(true);
                      try {
                        const res = await fetch('/api/vendor/ai-assist', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'suggest_variants',
                            context: {
                              title: form.title,
                              description: form.description,
                              original_price: form.original_price,
                              deal_price: form.deal_price,
                            },
                          }),
                        });
                        const data = await res.json();
                        if (data.text) {
                          const parsed = JSON.parse(data.text);
                          if (Array.isArray(parsed)) {
                            const newVariants: DealVariant[] = parsed.map((v: { name: string; description?: string; original_price: number; price: number }) => ({
                              id: crypto.randomUUID(),
                              name: v.name,
                              description: v.description || undefined,
                              original_price: v.original_price,
                              price: v.price,
                              claims_count: 0,
                            }));
                            setVariants(newVariants);
                          }
                        }
                      } catch { /* ignore */ }
                      setAiVariantsLoading(false);
                    }}
                    disabled={aiVariantsLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-primary-500 hover:from-purple-600 hover:to-primary-600 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {aiVariantsLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Ava is suggesting variations...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Ask Ava to Suggest Variations</>
                    )}
                  </button>
                )}

                {/* Existing variants */}
                {variants.map((v) => (
                  <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-3">
                    {v.image_url && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                      {v.description && <p className="text-xs text-gray-500 truncate">{v.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 line-through">{formatCurrency(v.original_price)}</span>
                        <span className="text-sm font-bold text-primary-500">{formatCurrency(v.price)}</span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          {formatPercentage(((v.original_price - v.price) / v.original_price) * 100)} OFF
                        </span>
                        {v.deposit_amount != null && v.deposit_amount > 0 && (
                          <span className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{formatCurrency(v.deposit_amount)} deposit</span>
                        )}
                        {v.max_claims != null && (
                          <span className="text-xs text-gray-500">Max: {v.max_claims}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditingVariant(v)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <FileEdit className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button type="button" onClick={() => setVariants(prev => prev.filter(vr => vr.id !== v.id))} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add / Edit variant form */}
                {(editingVariant !== null || variants.length < 10) && (
                  <VariantForm
                    initial={editingVariant}
                    onSave={(v) => {
                      if (editingVariant) {
                        setVariants(prev => prev.map(vr => vr.id === v.id ? v : vr));
                      } else {
                        setVariants(prev => [...prev, v]);
                      }
                      setEditingVariant(null);
                    }}
                    onCancel={() => setEditingVariant(null)}
                    isEditing={editingVariant !== null}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Highlights ───────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Highlights (optional)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {highlights.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full border border-green-200">
                {h}
                <button type="button" onClick={() => setHighlights(prev => prev.filter((_, idx) => idx !== i))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newHighlight}
              onChange={e => setNewHighlight(e.target.value)}
              className="input-field flex-1"
              placeholder="e.g., Best Seller, Family Friendly, Award Winning..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newHighlight.trim()) {
                    setHighlights(prev => [...prev, newHighlight.trim()]);
                    setNewHighlight('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newHighlight.trim()) {
                  setHighlights(prev => [...prev, newHighlight.trim()]);
                  setNewHighlight('');
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Features & Perks ────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Features & Perks (optional)</label>
          <p className="text-xs text-gray-400 mb-3">Select what your business offers or type your own</p>

          {/* Selected features */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {amenities.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-full border border-primary-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {a}
                  <button type="button" onClick={() => setAmenities(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggested features based on vendor category */}
          {(() => {
            const suggestions = vendorCategory
              ? (CATEGORY_FEATURES[vendorCategory] || UNIVERSAL_FEATURES)
              : UNIVERSAL_FEATURES;
            const unselected = suggestions.filter(s => !amenities.includes(s));
            if (unselected.length === 0) return null;
            return (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {vendorCategory ? `Suggested for ${vendorCategory}` : 'Suggested features'} — tap to add
                </p>
                <div className="flex flex-wrap gap-2">
                  {unselected.map(feature => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => setAmenities(prev => [...prev, feature])}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 text-sm rounded-full border border-gray-200 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {feature}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Manual input */}
          <div className="flex gap-2">
            <input
              value={newAmenity}
              onChange={e => setNewAmenity(e.target.value)}
              className="input-field flex-1"
              placeholder="Add a custom feature..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newAmenity.trim()) {
                    setAmenities(prev => [...prev, newAmenity.trim()]);
                    setNewAmenity('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newAmenity.trim()) {
                  setAmenities(prev => [...prev, newAmenity.trim()]);
                  setNewAmenity('');
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* Search Tags (AI-generated keywords for discoverability) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Search Tags
              <span className="text-xs text-gray-400 ml-1">(keywords so customers can find your deal)</span>
            </label>
            <button
              type="button"
              onClick={generateSearchTags}
              disabled={generatingTags || !form.title.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all"
            >
              {generatingTags ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Ava is thinking...</>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full" /> Ava Generate Tags
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            These tags help customers discover your deal when searching. Ava will suggest tags based on your deal — you can add or remove any.
          </p>
          {searchTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {searchTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-full border border-blue-200">
                  {tag}
                  <button type="button" onClick={() => setSearchTags(prev => prev.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              className="input-field flex-1"
              placeholder="Add a custom tag (e.g. date night, family friendly)"
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
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Ava — AI Deal Strategist ──────────────────────── */}
        {canAccess('ai_deal_assistant') && (
          <DealAdvisor
            dealType={dealType}
            currentPricing={{
              original_price: form.original_price ? parseFloat(form.original_price) : undefined,
              deal_price: form.deal_price ? parseFloat(form.deal_price) : undefined,
              deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : undefined,
              title: form.title || undefined,
            }}
            onApplyPricing={(pricing) => {
              setForm(prev => ({
                ...prev,
                ...(pricing.original_price !== undefined ? { original_price: pricing.original_price.toString() } : {}),
                ...(pricing.deal_price !== undefined ? { deal_price: pricing.deal_price.toString() } : {}),
                ...(pricing.deposit_amount !== undefined ? { deposit_amount: pricing.deposit_amount.toString() } : {}),
              }));
            }}
          />
        )}

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
            dealType === 'sponti_coupon' && !beatsSteadyDeal
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Calculated Discount:</span>
              <span className={`text-2xl font-bold ${
                dealType === 'sponti_coupon' && !beatsSteadyDeal
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}>
                {formatPercentage(discount)} OFF
              </span>
            </div>
            {dealType === 'sponti_coupon' && !beatsSteadyDeal && regularDeal && (
              <p className="text-sm text-amber-600 mt-2">
                Tip: {formatPercentage(suggestedMinDiscount)}+ off would beat your Steady Deal by 10+ points.
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
                      <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
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

        {/* ── How It Works ─────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">How It Works (optional)</label>
          <textarea
            name="how_it_works"
            value={form.how_it_works}
            onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
            className="input-field min-h-[80px]"
            placeholder="Step-by-step instructions: 1. Claim the deal 2. Show QR code at checkout 3. Enjoy your savings!"
          />
          <p className="text-xs text-gray-400 mt-1">Help customers understand exactly how to use this deal</p>
        </div>

        {/* ── Terms & Conditions ───────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions (optional)</label>
          <textarea
            name="terms_and_conditions"
            value={form.terms_and_conditions}
            onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
            className="input-field min-h-[80px]"
            placeholder="e.g., Valid for dine-in only. Not combinable with other offers. One per customer per visit."
          />
        </div>

        {/* ── Appointment Required ──────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Does this deal require an appointment?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRequiresAppointment(false)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                !requiresAppointment
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              No — Walk-ins Welcome
            </button>
            <button
              type="button"
              onClick={() => setRequiresAppointment(true)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                requiresAppointment
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1.5" />
              Yes — Appointment Required
            </button>
          </div>
          {requiresAppointment && (
            <p className="text-xs text-primary-600 mt-2 bg-primary-50 px-3 py-2 rounded-lg">
              Customers must schedule their appointment before the deal expires. The appointment itself can be after the expiration date.
            </p>
          )}
        </div>

        {/* ── Fine Print ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Fine Print</label>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, fine_print: generateFinePrint() }))}
              className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Auto-generate
            </button>
          </div>
          <textarea
            name="fine_print"
            value={form.fine_print}
            onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
            className="input-field min-h-[80px]"
            placeholder="Click 'Auto-generate' to create fine print based on your deal settings, or write your own..."
          />
          <p className="text-xs text-gray-400 mt-1">Includes deposit policy, appointment requirements, and standard disclaimers. You can edit after generating.</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || loading}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all disabled:opacity-50"
          >
            {savingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {savingDraft ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="submit"
            disabled={loading || savingDraft}
            className={`flex-1 text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 ${
              dealType === 'sponti_coupon'
                ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                : 'bg-secondary-500 hover:bg-secondary-600 shadow-lg shadow-secondary-500/25'
            }`}
          >
            {loading ? 'Creating...' : dealType === 'sponti_coupon' ? 'Create Sponti Coupon' : 'Create Steady Deal'}
          </button>
        </div>
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

      <MediaPicker
        open={showAdditionalMediaPicker}
        onClose={() => setShowAdditionalMediaPicker(false)}
        multiple
        onSelect={(url) => {
          setAdditionalImages(prev => prev.length < 10 ? [...prev, url] : prev);
          setShowAdditionalMediaPicker(false);
        }}
        onSelectMultiple={(urls) => {
          setAdditionalImages(prev => { const remaining = 10 - prev.length; return [...prev, ...urls.slice(0, remaining)]; });
          setShowAdditionalMediaPicker(false);
        }}
        type="image"
      />
      </>}
    </div>
  );
}
