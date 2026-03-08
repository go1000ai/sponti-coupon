'use client';

import { useState, useEffect, useRef, Suspense, useCallback, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { useLanguage } from '@/lib/i18n';
import { formatPercentage, formatCurrency, calculateDiscount } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, Save, Loader2, AlertCircle, Tag, Lock, X, ChevronDown, Info,
  Image as ImageIcon, Upload, CheckCircle2, FileText, DollarSign,
  Link as LinkIcon, Wand2, Video, MapPin, Globe, Star, ClipboardList, Sparkles, Rocket, Pause, Calendar, Clock,
  Ticket, Download, Share2, Facebook, Instagram, Twitter, Send, Eye,
  Heart, MessageCircle, Bookmark, ThumbsUp, CalendarDays, RotateCcw,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import ImagePickerModal from '@/components/vendor/ImagePickerModal';
import type { SelectedImage } from '@/components/vendor/ImagePickerModal';
import type { Deal, VendorLocation } from '@/lib/types/database';
import { Plus } from 'lucide-react';
import { PromoCodeTutorial } from '@/components/vendor/PromoCodeTutorial';

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
const UNIVERSAL_FEATURES = ['Free WiFi', 'Parking Available', 'Wheelchair Accessible', 'Gift Cards Available'];

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
  locked,
  lockedMessage,
  children,
}: {
  icon: ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  color?: string;
  locked?: boolean;
  lockedMessage?: string;
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
    <div className={`${locked ? 'bg-gray-50' : c.bg} rounded-2xl border ${open ? c.border + ' ring-2 ' + c.ring : 'border-gray-200'} shadow-sm hover:shadow-md transition-all overflow-hidden relative`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-10 h-10 rounded-xl ${locked ? 'bg-gray-200 text-gray-400' : c.iconBg} flex items-center justify-center flex-shrink-0`}>
          {locked ? <Lock className="w-5 h-5" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm ${locked ? 'text-gray-400' : 'text-gray-900'}`}>{title}</h3>
          <p className="text-xs text-gray-400 truncate">{summary}</p>
        </div>
        {locked && (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full mr-1">Locked</span>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t border-gray-100 space-y-4 relative">
          {children}
          {locked && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-b-2xl">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-sm font-bold text-gray-700">Pricing Locked</p>
              <p className="text-xs text-gray-500 text-center max-w-[280px] leading-relaxed">{lockedMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditDealPageInner() {
  const { user, role } = useAuth();
  const { canAccess } = useVendorTier();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'ai' | 'library'>('url');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [additionalImageUrl, setAdditionalImageUrl] = useState('');
  const [imgDragIdx, setImgDragIdx] = useState<number | null>(null);
  const [imgDragOverIdx, setImgDragOverIdx] = useState<number | null>(null);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiVideoLoading, setAiVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoElapsed, setVideoElapsed] = useState(0);
  const [videoSourceImage, setVideoSourceImage] = useState<string>('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Bento sections open state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ content: true });
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Array state for list fields
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [vendorCategory, setVendorCategory] = useState<string | null>(null);
  const [vendorWebsite, setVendorWebsite] = useState('');
  const [requiresAppointment, setRequiresAppointment] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [generatingTags, setGeneratingTags] = useState(false);
  const [generatingAmenities, setGeneratingAmenities] = useState(false);
  const [suggestedAmenities, setSuggestedAmenities] = useState<string[]>([]);
  const [suggestedHighlights, setSuggestedHighlights] = useState<string[]>([]);

  // Ava terms assistant state
  const [avaTermsPrompt, setAvaTermsPrompt] = useState('');
  const [avaTermsField, setAvaTermsField] = useState<'how_it_works' | 'terms_and_conditions' | 'fine_print'>('how_it_works');
  const [avaTermsLoading, setAvaTermsLoading] = useState(false);

  // Location state
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<'all' | 'specific' | 'none' | 'website'>('all');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Promo code state (online deals)
  const [promoCodeMode, setPromoCodeMode] = useState<'generate' | 'upload'>('generate');
  const [promoCodeCount, setPromoCodeCount] = useState(25);
  const [uploadedCodes, setUploadedCodes] = useState('');
  const [promoStats, setPromoStats] = useState<{ total: number; available: number; claimed: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState('');

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
    starts_at: '',
    expires_at: '',
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
        starts_at: data.starts_at ? new Date(data.starts_at).toISOString().slice(0, 16) : '',
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString().slice(0, 16) : '',
      });

      setAdditionalImages(data.image_urls || []);
      setVideoUrls(data.video_urls || []);
      setHighlights(data.highlights || []);
      setAmenities(data.amenities || []);
      setRequiresAppointment(data.requires_appointment || false);
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

    // Fetch vendor category and name for suggested features & fine print
    supabase
      .from('vendors')
      .select('category, business_name, website')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.category) setVendorCategory(data.category);
        if (data?.business_name) setVendorName(data.business_name);
        if (data?.website) setVendorWebsite(data.website);
      });

    fetchDeal();
  }, [dealId, user]);

  // Fetch promo code stats for online deals
  const fetchPromoStats = useCallback(async () => {
    if (!dealId) return;
    setPromoLoading(true);
    try {
      const res = await fetch(`/api/vendor/promo-codes?deal_id=${dealId}`);
      if (res.ok) {
        const data = await res.json();
        setPromoStats({ total: data.total, available: data.available, claimed: data.claimed });
      }
    } catch { /* ignore */ }
    setPromoLoading(false);
  }, [dealId]);

  useEffect(() => {
    if (deal?.website_url) fetchPromoStats();
  }, [deal, fetchPromoStats]);

  const handleAddPromoCodes = async () => {
    if (!dealId) return;
    setPromoSaving(true);
    setPromoSuccess('');
    try {
      const body = promoCodeMode === 'generate'
        ? { deal_id: dealId, action: 'generate', count: promoCodeCount }
        : { deal_id: dealId, action: 'upload', codes: uploadedCodes.split('\n').map(c => c.trim()).filter(Boolean) };
      const res = await fetch('/api/vendor/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setPromoSuccess(`Added ${data.inserted} codes! Total: ${data.total}`);
        setUploadedCodes('');
        fetchPromoStats();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to add promo codes');
      }
    } catch { setError('Failed to add promo codes'); }
    setPromoSaving(false);
  };

  const discount = form.original_price && form.deal_price
    ? calculateDiscount(parseFloat(form.original_price), parseFloat(form.deal_price))
    : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Auto-generate fine print based on deal settings
  const generateFinePrint = useCallback(() => {
    const lines: string[] = [];
    lines.push('One per customer. Subject to availability. Cannot be combined with other offers.');
    const depositVal = parseFloat(form.deposit_amount);
    if (depositVal > 0) {
      if (deal?.deal_type === 'sponti_coupon') {
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
  }, [form.deposit_amount, deal?.deal_type, requiresAppointment, vendorName]);

  // Add image to gallery — first image becomes main, rest go to additional
  const addImageToGallery = (rawUrl: string) => {
    // Normalize bare URLs (e.g., "Www.example.com/img.jpg" → "https://www.example.com/img.jpg")
    let url = rawUrl;
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('data:')) {
      url = `https://${url}`;
    }
    if (!form.image_url) {
      setForm(prev => ({ ...prev, image_url: url }));
    } else {
      setAdditionalImages(prev => [...prev, url]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) { setError('Invalid file type.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return; }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); setUploading(false); return; }
      addImageToGallery(data.url);
    } catch { setError('Upload failed.'); }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileUpload(file); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(true); }, []);
  const handleDragLeave = useCallback(() => { setDragActive(false); }, []);

  const handleAiImageGenerate = async () => {
    if (!form.title && !customImagePrompt) { setError('Enter a deal title or describe the image you want.'); return; }
    setAiImageLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title || customImagePrompt, description: form.description, custom_prompt: customImagePrompt || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate image'); setAiImageLoading(false); return; }
      addImageToGallery(data.url);
    } catch { setError('Failed to generate image.'); }
    setAiImageLoading(false);
  };

  // All available images (main + additional) for video source selection
  const allDealImages = [form.image_url, ...additionalImages].filter(Boolean);

  // Video generation progress timer
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

  const handleAiVideoGenerate = async () => {
    const sourceImage = videoSourceImage || form.image_url;
    if (!sourceImage) { setError('Add a deal image first so Ava can turn it into a video.'); return; }
    setAiVideoLoading(true);
    setVideoProgress(0);
    setVideoElapsed(0);
    setError('');
    try {
      // Phase 1: Start
      const startRes = await fetch('/api/vendor/generate-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: sourceImage, title: form.title, description: form.description, video_prompt: videoPrompt || undefined }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) { setError(startData.error || 'Failed to generate video'); setAiVideoLoading(false); return; }
      if (startData.status === 'done' && startData.url) { setVideoUrls(prev => [...prev, startData.url]); setAiVideoLoading(false); return; }

      let operationName = startData.operation_name;
      if (!operationName) { setError('Failed to start video generation'); setAiVideoLoading(false); return; }

      // Phase 2: Poll until done
      const maxPollTime = 5 * 60 * 1000;
      const pollInterval = 10_000;
      const pollStart = Date.now();
      while (Date.now() - pollStart < maxPollTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const pollRes = await fetch('/api/vendor/generate-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation_name: operationName }),
        });
        const pollData = await pollRes.json();
        if (!pollRes.ok) { setError(pollData.error || 'Video generation failed'); setAiVideoLoading(false); return; }
        if (pollData.retried && pollData.operation_name) { operationName = pollData.operation_name; continue; }
        if (pollData.status === 'done' && pollData.url) { setVideoUrls(prev => [...prev, pollData.url]); setAiVideoLoading(false); return; }
      }
      setError('Video generation timed out. Please try again.');
    } catch { setError('Failed to generate video.'); }
    setAiVideoLoading(false);
  };

  const generateAmenitySuggestions = async () => {
    if (!form.title.trim()) { setError('Enter a deal title first.'); return; }
    setGeneratingAmenities(true);
    setSuggestedAmenities([]);
    setSuggestedHighlights([]);
    try {
      const res = await fetch('/api/vendor/generate-amenities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: vendorCategory,
          existing_amenities: amenities,
          existing_highlights: highlights,
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
    if (!avaTermsPrompt.trim()) { setError('Tell Ava what you need.'); return; }
    setAvaTermsLoading(true);
    try {
      const res = await fetch('/api/vendor/generate-terms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          instruction: avaTermsPrompt,
          field: avaTermsField,
          current_value: form[avaTermsField] || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Ava could not generate text');
      else {
        setForm(prev => ({ ...prev, [data.field]: data.text }));
        setAvaTermsPrompt('');
      }
    } catch { setError('Failed to generate text.'); }
    setAvaTermsLoading(false);
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


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !user) return;
    setError(''); setShowToast(false); setSaving(true);
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
      requires_appointment: requiresAppointment,
      highlights,
      amenities,
      search_tags: searchTags,
      location_ids: locationIds,
      website_url: locationMode === 'website' && websiteUrl ? websiteUrl : null,
      ...(form.starts_at ? { starts_at: new Date(form.starts_at).toISOString() } : {}),
      ...(form.expires_at ? { expires_at: new Date(form.expires_at).toISOString() } : {}),
    };

    const { error: updateError } = await supabase.from('deals').update(updates).eq('id', deal.id).eq('vendor_id', user.id);
    if (updateError) setError('Failed to save: ' + updateError.message);
    else { setShowToast(true); setTimeout(() => router.push('/vendor/deals/calendar'), 2000); }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: 'active' | 'draft' | 'paused') => {
    if (!deal || !user) return;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: statusError } = await supabase.from('deals').update({ status: newStatus }).eq('id', deal.id).eq('vendor_id', user.id);
    if (statusError) {
      setError('Failed to update status: ' + statusError.message);
    } else {
      setDeal(prev => prev ? { ...prev, status: newStatus } : prev);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
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
          <h2 className="text-xl font-bold text-gray-900">Deal Not Found</h2>
          <p className="text-gray-500 mt-2">{error || 'The deal you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';
  const hasClaims = deal.claims_count > 0 && !isAdmin;

  // Summaries for bento cards
  const contentSummary = form.title || 'Add title and description';
  const pricingSummary = form.original_price && form.deal_price
    ? `${formatCurrency(parseFloat(form.deal_price))} (${formatPercentage(discount)} off)`
    : 'Set your prices';
  const mediaCount = (form.image_url ? 1 : 0) + additionalImages.length;
  const mediaSummary = `${mediaCount} image${mediaCount !== 1 ? 's' : ''}${videoUrls.length > 0 ? `, ${videoUrls.length} video${videoUrls.length > 1 ? 's' : ''}` : ''}`;
  const detailsSummary = `${highlights.length} highlights, ${amenities.length} features, ${searchTags.length} tags`;
  const locationSummary = locationMode === 'all' ? 'All locations' : locationMode === 'specific' ? `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''}` : locationMode === 'website' ? 'Online' : 'Mobile / No fixed location';
  const promoSummary = promoStats && promoStats.total > 0
    ? `${promoStats.available} available, ${promoStats.claimed} claimed`
    : 'No codes yet';
  const termsSummary = [form.terms_and_conditions, form.how_it_works, form.fine_print].filter(Boolean).length > 0
    ? `${[form.terms_and_conditions, form.how_it_works, form.fine_print].filter(Boolean).length} section${[form.terms_and_conditions, form.how_it_works, form.fine_print].filter(Boolean).length > 1 ? 's' : ''} filled`
    : 'Add terms, how it works, fine print';

  // Scheduling summary + duration
  const scheduleSummary = (() => {
    if (!form.starts_at && !form.expires_at) return 'Set start and end dates';
    const parts: string[] = [];
    if (form.starts_at) parts.push(`Starts ${new Date(form.starts_at).toLocaleDateString()}`);
    if (form.expires_at) parts.push(`Ends ${new Date(form.expires_at).toLocaleDateString()}`);
    return parts.join(' — ');
  })();

  const dealDuration = (() => {
    if (!form.starts_at || !form.expires_at) return null;
    const start = new Date(form.starts_at);
    const end = new Date(form.expires_at);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 'Invalid dates';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0 && remainingHours > 0) return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  })();

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/vendor/deals/calendar" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-100'}`}>
            {deal.deal_type === 'sponti_coupon' ? <SpontiIcon className="w-6 h-6 text-primary-500" /> : <Tag className="w-6 h-6 text-gray-900" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Deal</h1>
            <p className="text-xs text-gray-500">
              {deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'} &middot;
              <span className={`font-medium ml-1 ${deal.status === 'active' ? 'text-green-600' : deal.status === 'draft' ? 'text-amber-600' : 'text-gray-500'}`}>{deal.status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Animated save toast */}
      {showToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-[toastPop_0.5s_ease-out_forwards] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-3">
            <div className="relative">
              <CheckCircle2 className="w-7 h-7 animate-[spin_0.5s_ease-out]" />
              <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-yellow-200 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-base">Saved!</p>
              <p className="text-emerald-100 text-xs">Your deal has been updated</p>
            </div>
          </div>
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
          <BentoCard icon={<DollarSign className="w-5 h-5" />} title="Pricing"
            summary={hasClaims ? `Locked — ${pricingSummary}` : pricingSummary} color="green"
            open={!!openSections.pricing} onToggle={() => toggleSection('pricing')}
            locked={hasClaims}
            lockedMessage={`${deal.claims_count} customer${deal.claims_count > 1 ? 's have' : ' has'} already claimed this deal. Pricing cannot be changed to protect existing claims. You can still edit all other sections.`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Original Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input name="original_price" type="number" step="0.01" min="0" value={form.original_price} onChange={handleChange} className={`input-field pl-7 text-sm ${hasClaims ? 'bg-gray-100 cursor-not-allowed' : ''}`} required disabled={hasClaims} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deal Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input name="deal_price" type="number" step="0.01" min="0" value={form.deal_price} onChange={handleChange} className={`input-field pl-7 text-sm ${hasClaims ? 'bg-gray-100 cursor-not-allowed' : ''}`} required disabled={hasClaims} />
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
                  value={form.deposit_amount} onChange={handleChange} className={`input-field pl-7 text-sm ${hasClaims ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder={deal.deal_type === 'sponti_coupon' ? '10.00' : '0.00'}
                  required={deal.deal_type === 'sponti_coupon'} disabled={hasClaims} />
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

            {/* Image gallery header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">Images ({allDealImages.length}/11)</p>
              <button type="button" onClick={() => setShowImagePicker(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#E8632B] text-white rounded-lg text-[10px] font-medium hover:bg-[#D55A25] transition-colors">
                <ImageIcon className="w-3 h-3" /> Browse Library
              </button>
            </div>

            {/* Image gallery grid */}
            {allDealImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {allDealImages.map((img, i) => {
                  const isMain = img === form.image_url && !!form.image_url;
                  const isDragging = imgDragIdx === i;
                  const isDragOver = imgDragOverIdx === i;
                  return (
                    <div
                      key={`${img}-${i}`}
                      draggable
                      onDragStart={() => setImgDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); setImgDragOverIdx(i); }}
                      onDrop={() => {
                        if (imgDragIdx !== null && imgDragIdx !== i) {
                          const all = [...allDealImages];
                          const [item] = all.splice(imgDragIdx, 1);
                          all.splice(i, 0, item);
                          setForm(prev => ({ ...prev, image_url: all[0] || '' }));
                          setAdditionalImages(all.slice(1));
                        }
                        setImgDragIdx(null); setImgDragOverIdx(null);
                      }}
                      onDragEnd={() => { setImgDragIdx(null); setImgDragOverIdx(null); }}
                      className={`relative rounded-lg overflow-hidden border-2 group cursor-grab active:cursor-grabbing transition-all ${
                        isDragging ? 'opacity-40 border-dashed border-gray-300' :
                        isDragOver ? 'border-[#E8632B] ring-1 ring-[#E8632B]/30 scale-105' :
                        isMain ? 'border-[#E8632B] ring-1 ring-[#E8632B]/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ width: '4.5rem', height: '4.5rem' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.svg'; }} />
                      {isMain && <span className="absolute top-0.5 left-0.5 text-[7px] px-1 py-0.5 rounded bg-[#E8632B] text-white font-bold">MAIN</span>}
                      {!isMain && (
                        <button type="button" onClick={(e) => {
                          e.stopPropagation();
                          const all = [...allDealImages];
                          const [item] = all.splice(i, 1);
                          all.unshift(item);
                          setForm(prev => ({ ...prev, image_url: item }));
                          setAdditionalImages(all.slice(1));
                        }} className="absolute top-0.5 left-0.5 text-[7px] px-1 py-0.5 rounded bg-black/60 text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Set Main
                        </button>
                      )}
                      <span className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full bg-black/50 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                      <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        if (i === 0 && form.image_url) {
                          const remaining = allDealImages.filter((_, idx) => idx !== 0);
                          setForm(prev => ({ ...prev, image_url: remaining[0] || '' }));
                          setAdditionalImages(remaining.slice(1));
                        } else {
                          setAdditionalImages(prev => prev.filter((_, idx) => idx !== (form.image_url ? i - 1 : i)));
                        }
                      }} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add images: tabs */}
            {allDealImages.length < 11 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                  <button type="button" onClick={() => setImageMode('upload')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                  <button type="button" onClick={() => setImageMode('url')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                    <LinkIcon className="w-3 h-3" /> URL
                  </button>
                  {canAccess('ai_deal_assistant') && (
                    <button type="button" onClick={() => setImageMode('ai')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${imageMode === 'ai' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full" /> Ava
                    </button>
                  )}
                  <button type="button" onClick={() => setShowImagePicker(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    <ImageIcon className="w-3 h-3" /> Library
                  </button>
                </div>

                {imageMode === 'upload' && (
                  <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${dragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
                    {uploading ? (
                      <Loader2 className="w-5 h-5 mx-auto text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                        <p className="text-xs font-medium text-gray-600">{dragActive ? 'Drop here' : 'Click or drag & drop'}</p>
                        <p className="text-[10px] text-gray-400">JPG, PNG, WebP, GIF - Max 5MB</p>
                      </>
                    )}
                  </div>
                )}
                {imageMode === 'url' && (
                  <div className="flex gap-2">
                    <input value={additionalImageUrl} onChange={e => setAdditionalImageUrl(e.target.value)}
                      className="input-field flex-1 text-sm" placeholder="https://..."
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (additionalImageUrl.trim()) { addImageToGallery(additionalImageUrl.trim()); setAdditionalImageUrl(''); } } }} />
                    <button type="button" onClick={() => { if (additionalImageUrl.trim()) { addImageToGallery(additionalImageUrl.trim()); setAdditionalImageUrl(''); } }}
                      disabled={!additionalImageUrl.trim()}
                      className="px-3 py-1.5 bg-[#E8632B] text-white rounded-lg text-xs font-medium hover:bg-[#D55A25] disabled:opacity-50 transition-colors">Add</button>
                  </div>
                )}
                {imageMode === 'ai' && (
                  <div className="text-center space-y-2">
                    <input value={customImagePrompt} onChange={e => setCustomImagePrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!aiImageLoading && (form.title || customImagePrompt)) handleAiImageGenerate(); } }} className="input-field text-sm" placeholder="Describe the image (optional)..." />
                    <button type="button" onClick={handleAiImageGenerate} disabled={aiImageLoading || (!form.title && !customImagePrompt)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 mx-auto">
                      {aiImageLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate</>}
                    </button>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
              </div>
            )}

            {allDealImages.length === 0 && <p className="text-xs text-gray-400">No images yet. Add via upload, URL, Ava, or library.</p>}
            {allDealImages.length > 1 && <p className="text-[10px] text-gray-400 mt-1">Drag to reorder. Hover to &quot;Set Main&quot; or remove.</p>}

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
                          <button type="button" onClick={() => setPreviewVideoUrl(url)}
                            className="w-40 h-24 rounded-xl overflow-hidden border border-gray-200 bg-black relative cursor-pointer">
                            <video src={`${url}#t=0.5`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-100 group-hover:bg-black/40 transition-all">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <span className="ml-0.5 border-l-[10px] border-l-gray-800 border-y-[6px] border-y-transparent" />
                              </div>
                            </div>
                          </button>
                        ) : (
                          <button type="button" onClick={() => setPreviewVideoUrl(url)}
                            className="w-40 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center relative cursor-pointer">
                            <Video className="w-8 h-8 text-gray-400" />
                            <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white truncate">{url}</span>
                          </button>
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setVideoUrls(prev => prev.filter((_, idx) => idx !== i)); }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"><X className="w-3 h-3" /></button>
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
                              <img src={img} alt={`Source ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.svg'; }} />
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
                      {/* Video prompt */}
                      <div>
                        <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Describe your video (optional)</p>
                        <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)}
                          className="w-full text-xs border border-emerald-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 resize-none placeholder:text-emerald-400"
                          rows={2} placeholder="e.g., Slow zoom into the product with warm lighting, then pan to show the details..." />
                      </div>
                      {/* Generate button + guidelines */}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={handleAiVideoGenerate} disabled={aiVideoLoading}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm">
                          {aiVideoLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ava is creating your video...</> : <><Video className="w-3.5 h-3.5" /> Generate Video</>}
                        </button>
                        <div className="relative group">
                          <button type="button" className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" aria-label="Video guidelines">
                            <Info className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <p className="font-semibold mb-1 text-xs">Video Generation Tips</p>
                            <p className="text-gray-300 mb-1.5">Google&apos;s AI has content guidelines:</p>
                            <ul className="space-y-0.5 text-gray-300">
                              <li className="flex gap-1"><span className="text-green-400 shrink-0">&#10003;</span> Product/service photos without people</li>
                              <li className="flex gap-1"><span className="text-green-400 shrink-0">&#10003;</span> Clean images without text or logos</li>
                              <li className="flex gap-1"><span className="text-red-400 shrink-0">&#10007;</span> No photos with children</li>
                              <li className="flex gap-1"><span className="text-red-400 shrink-0">&#10007;</span> No copyrighted/branded content</li>
                            </ul>
                            <p className="text-gray-400 mt-1.5">If blocked, Ava will auto-retry with a generic video.</p>
                            <div className="absolute bottom-0 right-3 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                          </div>
                        </div>
                      </div>
                      {aiVideoLoading && (
                        <div className="space-y-1.5">
                          <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.round(videoProgress)}%` }} />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-emerald-600">
                            <span>{Math.round(videoProgress)}% — {videoElapsed < 60 ? `${videoElapsed}s` : `${Math.floor(videoElapsed / 60)}m ${videoElapsed % 60}s`} elapsed</span>
                            <span className="animate-pulse">{videoElapsed < 60 ? 'Est. 1–3 min' : videoElapsed < 120 ? 'Almost there...' : 'Finishing up...'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </BentoCard>

          {/* Details */}
          <BentoCard icon={<Star className="w-5 h-5" />} title="Details" summary={detailsSummary} color="blue"
            open={!!openSections.details} onToggle={() => toggleSection('details')}>

            {/* Ava AI Suggest Button */}
            <button
              type="button"
              onClick={generateAmenitySuggestions}
              disabled={generatingAmenities || !form.title.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50 shadow-sm"
            >
              {generatingAmenities ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ava is thinking...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Ava: Suggest Highlights & Amenities</>
              )}
            </button>

            {/* Highlights */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Highlights</label>
              {/* AI suggested highlights */}
              {suggestedHighlights.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-emerald-600 mb-1 font-medium">Ava&apos;s suggestions — tap to add</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedHighlights.filter(s => !highlights.includes(s)).map(h => (
                      <button key={h} type="button" onClick={() => { setHighlights(prev => [...prev, h]); setSuggestedHighlights(prev => prev.filter(x => x !== h)); }}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors">
                        <Plus className="w-2.5 h-2.5" /> {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

            {/* Features & Perks */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Features & Perks</label>
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {amenities.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full border border-primary-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {a} <button type="button" onClick={() => setAmenities(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
              {/* AI suggested amenities */}
              {suggestedAmenities.filter(s => !amenities.includes(s)).length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-emerald-600 mb-1 font-medium">Ava&apos;s suggestions — tap to add</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedAmenities.filter(s => !amenities.includes(s)).map(feature => (
                      <button key={feature} type="button" onClick={() => { setAmenities(prev => [...prev, feature]); setSuggestedAmenities(prev => prev.filter(x => x !== feature)); }}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors">
                        <Plus className="w-2.5 h-2.5" /> {feature}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Category-based suggested features */}
              {(() => {
                const suggestions = vendorCategory ? (CATEGORY_FEATURES[vendorCategory] || UNIVERSAL_FEATURES) : UNIVERSAL_FEATURES;
                const unselected = suggestions.filter(s => !amenities.includes(s));
                if (unselected.length === 0) return null;
                return (
                  <div className="mb-2">
                    <p className="text-[10px] text-gray-400 mb-1">{vendorCategory ? `Suggested for ${vendorCategory}` : 'Suggested'} — tap to add</p>
                    <div className="flex flex-wrap gap-1.5">
                      {unselected.slice(0, 8).map(feature => (
                        <button key={feature} type="button" onClick={() => setAmenities(prev => [...prev, feature])}
                          className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors">
                          <Plus className="w-2.5 h-2.5" /> {feature}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex gap-1.5">
                <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} className="input-field flex-1 text-sm" placeholder="Add a custom feature..."
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
                  <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200">
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
                if (mode === 'website' && !websiteUrl && vendorWebsite) setWebsiteUrl(vendorWebsite);
                if (mode !== 'website') setWebsiteUrl('');
              }} className="input-field appearance-none pr-10 text-sm">
                {locations.length > 0 && <option value="all">All Locations</option>}
                {locations.length > 0 && <option value="specific">Specific Locations</option>}
                <option value="website">Online / Website</option>
                <option value="none">Mobile / No Fixed Location</option>
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
                        <p className="text-xs font-medium text-gray-900 truncate">{loc.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{loc.address}, {loc.city}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {locationMode === 'website' && (
              <div>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                    onBlur={() => { if (websiteUrl && !websiteUrl.match(/^https?:\/\//)) setWebsiteUrl('https://' + websiteUrl); }}
                    className="input-field pl-10 text-sm" placeholder="www.yoursite.com/product" />
                </div>
                {vendorWebsite && websiteUrl !== vendorWebsite && (
                  <button type="button" onClick={() => setWebsiteUrl(vendorWebsite)}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                    <Globe className="w-3 h-3" /> Use profile website: {vendorWebsite}
                  </button>
                )}
              </div>
            )}
          </BentoCard>

          {/* Scheduling */}
          <BentoCard icon={<Calendar className="w-5 h-5" />} title="Scheduling" summary={scheduleSummary} color="orange"
            open={!!openSections.schedule} onToggle={() => toggleSection('schedule')}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Start Date & Time
                </label>
                <input name="starts_at" type="datetime-local" value={form.starts_at} onChange={handleChange}
                  className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> End Date & Time
                </label>
                <input name="expires_at" type="datetime-local" value={form.expires_at} onChange={handleChange}
                  className="input-field text-sm" />
              </div>
            </div>
            {dealDuration && (
              <div className={`border rounded-lg p-3 flex items-center justify-between ${dealDuration === 'Invalid dates' ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-200'}`}>
                <span className="text-xs font-medium text-gray-600">Deal is good for:</span>
                <span className={`text-sm font-bold ${dealDuration === 'Invalid dates' ? 'text-red-600' : 'text-primary-600'}`}>{dealDuration}</span>
              </div>
            )}
            {deal.deal_type === 'sponti_coupon' && (
              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Sponti Coupons must last 4–24 hours
              </p>
            )}
            {deal.deal_type === 'regular' && (
              <p className="text-[10px] text-gray-500">Steady deals can last up to 30 days</p>
            )}
          </BentoCard>

          {/* Promo Codes — only for online deals */}
          {locationMode === 'website' && (
            <BentoCard icon={<Ticket className="w-5 h-5" />} title="Promo Codes" summary={promoSummary} color="emerald"
              open={!!openSections.promo} onToggle={() => toggleSection('promo')}>
              {/* Current stats */}
              {promoLoading ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading codes...
                </div>
              ) : promoStats && promoStats.total > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                    <p className="text-base font-bold text-emerald-700">{promoStats.total}</p>
                    <p className="text-[10px] text-emerald-600">Total</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                    <p className="text-base font-bold text-emerald-700">{promoStats.available}</p>
                    <p className="text-[10px] text-emerald-600">Available</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                    <p className="text-base font-bold text-gray-500">{promoStats.claimed}</p>
                    <p className="text-[10px] text-gray-500">Claimed</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  No promo codes yet. Add codes below so customers can claim this online deal.
                </p>
              )}

              {/* Download existing codes */}
              {promoStats && promoStats.total > 0 && (
                <a href={`/api/vendor/promo-codes/download?deal_id=${dealId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
                  <Download className="w-3.5 h-3.5" /> Download CSV ({promoStats.total} codes)
                </a>
              )}

              {/* Add more codes */}
              <div className="border-t border-gray-200 pt-3 space-y-3">
                <h4 className="text-xs font-semibold text-gray-800">
                  {promoStats && promoStats.total > 0 ? 'Add More Codes' : 'Add Promo Codes'}
                </h4>
                <p className="text-xs text-gray-600">
                  Each customer who claims this deal receives a unique promo code to use at checkout on your website.
                </p>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setPromoCodeMode('generate')}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${promoCodeMode === 'generate' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
                    Auto-Generate
                  </button>
                  <button type="button" onClick={() => setPromoCodeMode('upload')}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${promoCodeMode === 'upload' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
                    My Own Codes
                  </button>
                </div>

                {promoCodeMode === 'generate' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Number of Codes</label>
                    <select value={promoCodeCount} onChange={e => setPromoCodeCount(Number(e.target.value))}
                      className="input-field text-sm">
                      <option value={10}>10 codes</option>
                      <option value={25}>25 codes</option>
                      <option value={50}>50 codes</option>
                      <option value={100}>100 codes</option>
                      <option value={200}>200 codes</option>
                      <option value={500}>500 codes</option>
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      We&apos;ll generate {promoCodeCount} unique codes (e.g., SPONTI-A7X3K9). Download CSV to import into your store.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Paste Codes (one per line)</label>
                    <textarea
                      value={uploadedCodes}
                      onChange={e => setUploadedCodes(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 resize-none placeholder:text-gray-400"
                      rows={4}
                      placeholder={"SUMMER25OFF\nSAVE10NOW\nDEAL2026XY"}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {uploadedCodes.split('\n').filter(c => c.trim()).length} code{uploadedCodes.split('\n').filter(c => c.trim()).length !== 1 ? 's' : ''} entered.
                    </p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 leading-relaxed">
                  <strong>Disclaimer:</strong> SpontiCoupon distributes one unique code per customer but does not control your website&apos;s checkout. You are responsible for ensuring each code is configured as single-use on your e-commerce platform (Shopify, WooCommerce, etc.). SpontiCoupon is not liable for codes that are reused, shared, or misconfigured.
                </div>

                <button type="button" onClick={handleAddPromoCodes} disabled={promoSaving}
                  className="w-full py-2 rounded-lg font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {promoSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Ticket className="w-4 h-4" /> Add Codes</>}
                </button>

                {promoSuccess && (
                  <p className="text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {promoSuccess}
                  </p>
                )}

                {promoCodeMode === 'generate' && <PromoCodeTutorial />}
              </div>
            </BentoCard>
          )}

          {/* Terms & Legal */}
          <BentoCard icon={<ClipboardList className="w-5 h-5" />} title="Terms & Legal" summary={termsSummary} color="gray"
            open={!!openSections.terms} onToggle={() => toggleSection('terms')}>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">How It Works</label>
              <textarea name="how_it_works" value={form.how_it_works} onChange={handleChange} className="input-field min-h-[60px] text-sm"
                placeholder="1. Claim the deal 2. Show QR code 3. Enjoy!" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea name="terms_and_conditions" value={form.terms_and_conditions} onChange={handleChange} className="input-field min-h-[60px] text-sm"
                placeholder="Valid for dine-in only..." />
            </div>
            {/* Appointment toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Requires Appointment?</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRequiresAppointment(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${!requiresAppointment ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                  No — Walk-ins
                </button>
                <button type="button" onClick={() => setRequiresAppointment(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${requiresAppointment ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                  <Calendar className="w-3 h-3 inline mr-1" /> Appointment
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Fine Print</label>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, fine_print: generateFinePrint() }))}
                  className="text-[10px] text-primary-500 hover:text-primary-600 font-medium flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Auto-generate
                </button>
              </div>
              <textarea name="fine_print" value={form.fine_print} onChange={handleChange} className="input-field min-h-[50px] text-sm"
                placeholder="Click 'Auto-generate' or write your own..." />
            </div>
          </BentoCard>
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-600 mb-6">
          <strong className="text-blue-700">Note:</strong> Deal type ({deal.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}) cannot be changed.
          {hasClaims ? (
            <span> This deal has <strong>{deal.claims_count} claim{deal.claims_count > 1 ? 's' : ''}</strong>. You can still edit the title, description, images, media, details, scheduling, terms, and promo codes — but <strong>pricing (original price, deal price, and deposit) is locked</strong> to protect customers who already claimed.</span>
          ) : (
            <span> Claims: {deal.claims_count}</span>
          )}
        </div>

        {/* Save + Publish/Pause buttons */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className={`flex-1 text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              deal.deal_type === 'sponti_coupon'
                ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                : 'bg-secondary-500 hover:bg-secondary-600 shadow-lg shadow-secondary-500/25'
            }`}>
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
          {deal.status === 'draft' || deal.status === 'paused' ? (
            <button type="button" disabled={saving} onClick={() => handleStatusChange('active')}
              className="px-6 py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center gap-2 text-lg">
              <Rocket className="w-5 h-5" /> Go Live
            </button>
          ) : deal.status === 'active' ? (
            <button type="button" disabled={saving} onClick={() => handleStatusChange('paused')}
              className="px-6 py-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 flex items-center gap-2 text-lg">
              <Pause className="w-5 h-5" /> Pause
            </button>
          ) : null}
        </div>
      </form>

      {/* Social Media Posting */}
      {deal && deal.status === 'active' && (
        <DealSocialPost dealId={deal.id} dealTitle={deal.title} />
      )}

      {/* Unified Image Picker Modal */}
      <ImagePickerModal
        open={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        initialImages={allDealImages}
        initialMainImage={form.image_url}
        maxImages={11}
        onConfirm={(images: SelectedImage[]) => {
          if (images.length === 0) {
            setForm(prev => ({ ...prev, image_url: '' }));
            setAdditionalImages([]);
          } else {
            const mainImg = images.find(img => img.isMain)?.url || images[0].url;
            setForm(prev => ({ ...prev, image_url: mainImg }));
            setAdditionalImages(images.filter(img => img.url !== mainImg).map(img => img.url));
          }
          setShowImagePicker(false);
        }}
      />

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] px-4" onClick={() => setPreviewVideoUrl(null)}>
          <div className="relative max-w-3xl w-full animate-fade-up" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setPreviewVideoUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-2 text-sm font-medium">
              <X className="w-5 h-5" /> Close
            </button>
            {(previewVideoUrl.match(/\.(mp4|webm|mov)(\?|$)/i) || previewVideoUrl.includes('supabase')) ? (
              <video src={previewVideoUrl} controls autoPlay className="w-full rounded-xl shadow-2xl max-h-[80vh]" />
            ) : previewVideoUrl.includes('youtube.com') || previewVideoUrl.includes('youtu.be') ? (
              <iframe
                src={previewVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full aspect-video rounded-xl shadow-2xl"
                allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <div className="bg-gray-900 rounded-xl p-8 text-center">
                <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-white text-sm mb-2">External video link</p>
                <a href={previewVideoUrl} target="_blank" rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 text-sm underline">Open in new tab</a>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button type="button" onClick={() => setPreviewVideoUrl(null)}
                className="px-6 py-2.5 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors">
                Looks Good
              </button>
              <button type="button" onClick={() => { setVideoUrls(prev => prev.filter(u => u !== previewVideoUrl)); setPreviewVideoUrl(null); }}
                className="px-6 py-2.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg font-semibold text-sm hover:bg-red-500/30 transition-colors">
                Remove Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Social Post from Deal ─── */
const TikTokIconSmall = ({ className }: { className?: string }) => (
  <svg className={className || 'w-5 h-5'} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" />
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: <Facebook className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-500' },
  { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-5 h-5" />, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200', ring: 'ring-pink-500' },
  { key: 'twitter', label: 'X (Twitter)', icon: <Twitter className="w-5 h-5" />, color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200', ring: 'ring-gray-500' },
  { key: 'tiktok', label: 'TikTok', icon: <TikTokIconSmall className="w-5 h-5" />, color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200', ring: 'ring-gray-500' },
];

function DealSocialPost({ dealId, dealTitle }: { dealId: string; dealTitle?: string }) {
  const { locale: language } = useLanguage();
  const [connections, setConnections] = useState<{ platform: string; account_name: string | null }[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{
    captions: Record<string, string>;
    image_url: string;
    vendor?: { business_name: string };
    deal?: { deal_type: string; title?: string };
    media?: { images: string[]; videos: string[] };
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [scheduling, setScheduling] = useState(false);

  // Media editor state
  const [socialImageUrl, setSocialImageUrl] = useState('');
  const [socialVideoUrl, setSocialVideoUrl] = useState('');
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [avaPrompt, setAvaPrompt] = useState('');
  const [avaLoading, setAvaLoading] = useState(false);
  const [avaMessage, setAvaMessage] = useState('');
  const [avaSuggestion, setAvaSuggestion] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [socialStep, setSocialStep] = useState<'create' | 'review'>('create');

  useEffect(() => {
    fetch('/api/social/connections')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.vendor) {
          setConnections(data.vendor);
          const connected = new Set<string>(data.vendor.map((c: { platform: string }) => c.platform));
          setSelectedPlatforms(connected);
        }
      })
      .catch(() => {});
  }, []);

  const connectedSet = new Set(connections.map(c => c.platform));

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPlatforms(new Set(connections.map(c => c.platform)));
  };

  const generatePreview = async () => {
    setLoadingPreview(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await fetch('/api/social/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        setEditedCaptions({ ...data.captions });
        if (!socialImageUrl) setSocialImageUrl(data.image_url || '');
      } else {
        setResult({ type: 'error', text: 'Failed to generate preview' });
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const askAva = async () => {
    if (!avaPrompt.trim()) return;
    setAvaLoading(true);
    setAvaSuggestion('');
    setAvaMessage('');
    try {
      const res = await fetch('/api/vendor/ava-social-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: avaPrompt,
          deal_title: preview?.deal?.title || dealTitle || '',
          media_mode: mediaMode,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvaSuggestion(data.suggestion || '');
        setAvaMessage(data.message || '');
      } else {
        setAvaMessage('Ava couldn\'t process that. Try rephrasing your request.');
      }
    } finally {
      setAvaLoading(false);
    }
  };

  const generateAvaImage = async (prompt: string) => {
    setAvaLoading(true);
    setAvaMessage('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_prompt: prompt, title: preview?.deal?.title || '' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSocialImageUrl(data.url);
        setMediaMode('image');
        setSocialVideoUrl('');
        setAvaMessage('Image generated! It\'s now set as your social post image.');
        setShowMediaPicker(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setAvaMessage(err.error || 'Image generation failed.');
      }
    } finally {
      setAvaLoading(false);
    }
  };

  const generateAvaVideo = async (prompt: string) => {
    setAvaLoading(true);
    setAvaMessage('');
    try {
      // Phase 1: Start generation
      const startRes = await fetch('/api/vendor/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: socialImageUrl || preview?.image_url || '',
          title: preview?.deal?.title || '',
          video_prompt: prompt,
        }),
      });
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        setAvaMessage(err.error || 'Video generation failed to start.');
        setAvaLoading(false);
        return;
      }
      const { operation_name } = await startRes.json();
      setAvaMessage('Ava is creating your video... This may take 30-60 seconds.');

      // Phase 2: Poll for completion
      for (let i = 0; i < 24; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await fetch('/api/vendor/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation_name }),
        });
        if (pollRes.ok) {
          const data = await pollRes.json();
          if (data.url) {
            setSocialVideoUrl(data.url);
            setMediaMode('video');
            setAvaMessage('Video created! It\'s now set for your social post.');
            setShowMediaPicker(false);
            setAvaLoading(false);
            return;
          }
          if (data.operation_name) continue; // still processing
        }
      }
      setAvaMessage('Video generation timed out. Try again.');
    } catch {
      setAvaMessage('Video generation failed.');
    } finally {
      setAvaLoading(false);
    }
  };

  const handlePost = async () => {
    if (selectedPlatforms.size === 0) return;
    setPosting(true);
    setResult(null);
    try {
      const captions = preview ? editedCaptions : {};
      const payload: Record<string, unknown> = {
        deal_id: dealId,
        platforms: Array.from(selectedPlatforms),
        captions,
        action: 'post_now',
      };
      if (socialImageUrl && socialImageUrl !== preview?.image_url) payload.image_url = socialImageUrl;
      if (socialVideoUrl) payload.video_url = socialVideoUrl;
      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setResult({ type: 'success', text: `Posted to ${selectedPlatforms.size} platform${selectedPlatforms.size > 1 ? 's' : ''}!` });
        setPreview(null);
        setSocialStep('create');
      } else {
        const err = await res.json();
        setResult({ type: 'error', text: err.error || 'Failed to post' });
      }
    } finally {
      setPosting(false);
    }
  };

  const handleScheduleOrDraft = async (action: 'schedule' | 'draft') => {
    if (selectedPlatforms.size === 0) return;
    setScheduling(true);
    setResult(null);
    try {
      const captions = preview ? editedCaptions : {};
      const body: Record<string, unknown> = {
        deal_id: dealId,
        platforms: Array.from(selectedPlatforms),
        captions,
        action,
      };
      if (action === 'schedule' && scheduleDate) {
        body.scheduled_at = `${scheduleDate}T${scheduleTime || '12:00'}:00`;
      }
      if (socialImageUrl && socialImageUrl !== preview?.image_url) body.image_url = socialImageUrl;
      if (socialVideoUrl) body.video_url = socialVideoUrl;
      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const label = action === 'schedule' ? 'Scheduled' : 'Saved as draft';
        setResult({ type: 'success', text: `${label} for ${selectedPlatforms.size} platform${selectedPlatforms.size > 1 ? 's' : ''}!` });
        setPreview(null);
        setSocialStep('create');
      } else {
        const err = await res.json();
        setResult({ type: 'error', text: err.error || `Failed to ${action}` });
      }
    } finally {
      setScheduling(false);
    }
  };

  if (connections.length === 0) return null;

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-[#E8632B]" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Post to Social Media</h3>
          <p className="text-xs text-gray-500">Share this deal on your connected platforms</p>
        </div>
        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span className={`px-2 py-0.5 rounded-full font-medium ${socialStep === 'create' ? 'bg-orange-100 text-[#E8632B]' : 'bg-gray-100 text-gray-500'}`}>1. {language === 'es' ? 'Crear' : 'Create'}</span>
          <ArrowRight className="w-3 h-3" />
          <span className={`px-2 py-0.5 rounded-full font-medium ${socialStep === 'review' ? 'bg-orange-100 text-[#E8632B]' : 'bg-gray-100 text-gray-500'}`}>2. {language === 'es' ? 'Revisar' : 'Review'}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {result && (
          <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${result.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{result.text}</span>
            <button onClick={() => setResult(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ===== STEP 1: CREATE ===== */}
        {socialStep === 'create' && (
          <>
            {/* Platform selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{language === 'es' ? 'Seleccionar plataformas' : 'Select platforms'}</span>
                <button onClick={selectAll} className="text-xs text-[#E8632B] hover:text-orange-700 font-medium">{language === 'es' ? 'Seleccionar todas' : 'Select All'}</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SOCIAL_PLATFORMS.map(p => {
                  const isConnected = connectedSet.has(p.key);
                  const isSelected = selectedPlatforms.has(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => isConnected && togglePlatform(p.key)}
                      disabled={!isConnected}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                        !isConnected
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : isSelected
                            ? `${p.border} ${p.bg} ring-2 ${p.ring} ring-offset-1`
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className={isConnected ? p.color : 'text-gray-300'}>{p.icon}</span>
                      <div className="text-left">
                        <span className="text-sm font-medium text-gray-900 block leading-tight">{p.label}</span>
                        <span className="text-[10px] text-gray-400">
                          {isConnected ? (isSelected ? (language === 'es' ? 'Seleccionado' : 'Selected') : (language === 'es' ? 'Conectado' : 'Connected')) : (language === 'es' ? 'No conectado' : 'Not connected')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Preview button */}
            <button
              onClick={generatePreview}
              disabled={loadingPreview || selectedPlatforms.size === 0}
              className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {preview ? (language === 'es' ? 'Regenerar contenido' : 'Refresh Preview') : (language === 'es' ? 'Generar contenido' : 'Generate Preview')}
            </button>

            {/* Media Editor — only after preview loaded */}
            {preview && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{language === 'es' ? 'Multimedia' : 'Media'}</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setMediaMode('image')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mediaMode === 'image' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 inline mr-1" />{language === 'es' ? 'Imagen' : 'Image'}
                    </button>
                    <button
                      onClick={() => setMediaMode('video')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mediaMode === 'video' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Video className="w-3.5 h-3.5 inline mr-1" />{language === 'es' ? 'Video' : 'Video'}
                    </button>
                  </div>
                </div>

                {/* Current media thumbnail */}
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                    {mediaMode === 'video' && socialVideoUrl ? (
                      <video src={socialVideoUrl} className="w-full h-full object-cover" muted />
                    ) : (socialImageUrl || preview.image_url) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={socialImageUrl || preview.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">
                      {mediaMode === 'video'
                        ? (language === 'es' ? 'Video actual para publicación' : 'Current video for post')
                        : (language === 'es' ? 'Imagen actual para publicación' : 'Current image for post')}
                    </p>
                    <button
                      onClick={() => setShowMediaPicker(!showMediaPicker)}
                      className="text-xs text-[#E8632B] hover:text-orange-700 font-medium"
                    >
                      {showMediaPicker
                        ? (language === 'es' ? 'Ocultar biblioteca' : 'Hide library')
                        : (language === 'es' ? 'Elegir de la biblioteca' : 'Choose from library')}
                    </button>
                  </div>
                </div>

                {/* Library horizontal scroll */}
                {showMediaPicker && (
                  <div className="overflow-x-auto pb-1">
                    <div className="flex gap-2 min-w-min">
                      {mediaMode === 'image' ? (
                        (preview.media?.images || []).length > 0 ? (
                          (preview.media?.images || []).map((url, i) => (
                            <button
                              key={i}
                              onClick={() => { setSocialImageUrl(url); setSocialVideoUrl(''); setShowMediaPicker(false); }}
                              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${socialImageUrl === url ? 'border-[#E8632B] ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 py-2">{language === 'es' ? 'No hay imágenes en la biblioteca' : 'No images in library'}</p>
                        )
                      ) : (
                        (preview.media?.videos || []).length > 0 ? (
                          (preview.media?.videos || []).map((url, i) => (
                            <button
                              key={i}
                              onClick={() => { setSocialVideoUrl(url); setMediaMode('video'); setShowMediaPicker(false); }}
                              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all relative ${socialVideoUrl === url ? 'border-[#E8632B] ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <video src={url} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Video className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 py-2">{language === 'es' ? 'No hay videos en la biblioteca' : 'No videos in library'}</p>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Ava AI Assistant */}
                <div className="border border-emerald-200 rounded-xl bg-emerald-50/50 p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">
                      {language === 'es' ? 'Pregúntale a Ava' : 'Ask Ava'}
                    </span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={avaPrompt}
                      onChange={e => setAvaPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !avaLoading && askAva()}
                      placeholder={mediaMode === 'video'
                        ? (language === 'es' ? 'Describe el video que quieres crear...' : 'Describe the video you want to create...')
                        : (language === 'es' ? 'Describe la imagen que quieres crear...' : 'Describe the image you want to create...')}
                      className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-gray-400"
                    />
                    <button
                      onClick={askAva}
                      disabled={avaLoading || !avaPrompt.trim()}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0 inline-flex items-center gap-1.5"
                    >
                      {avaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {language === 'es' ? 'Preguntar' : 'Ask'}
                    </button>
                  </div>

                  {avaMessage && (
                    <div className="text-sm text-emerald-800 bg-emerald-100/60 rounded-lg p-2.5">
                      <span className="font-medium">Ava:</span> {avaMessage}
                    </div>
                  )}

                  {avaSuggestion && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 bg-white rounded-lg p-2.5 border border-emerald-100 font-mono">
                        {avaSuggestion}
                      </div>
                      <div className="flex gap-2">
                        {mediaMode === 'image' ? (
                          <button
                            onClick={() => generateAvaImage(avaSuggestion)}
                            disabled={avaLoading}
                            className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                          >
                            {avaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                            {language === 'es' ? 'Generar Imagen' : 'Generate Image'}
                          </button>
                        ) : (
                          <button
                            onClick={() => generateAvaVideo(avaSuggestion)}
                            disabled={avaLoading}
                            className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                          >
                            {avaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                            {language === 'es' ? 'Generar Video' : 'Generate Video'}
                          </button>
                        )}
                        <button
                          onClick={() => { setAvaSuggestion(''); setAvaMessage(''); }}
                          className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Tips */}
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium w-full"
                  >
                    <Info className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Tips para mejores resultados' : 'Tips for better results'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTips ? 'rotate-180' : ''}`} />
                  </button>

                  {showTips && (
                    <div className="text-xs text-gray-600 bg-white rounded-lg p-3 border border-emerald-100 space-y-2">
                      {mediaMode === 'video' ? (
                        <>
                          <p className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wide">{language === 'es' ? 'Tips para Videos' : 'Video Tips'}</p>
                          <ul className="space-y-1.5 list-disc pl-3.5">
                            <li>{language === 'es' ? 'Especifica la música: "música electrónica animada" o "guitarra acústica tranquila"' : 'Specify music: "upbeat electronic music" or "calm acoustic guitar"'}</li>
                            <li>{language === 'es' ? 'Describe el ritmo: "rápido con cortes rápidos" o "revelación cinematográfica lenta"' : 'Describe pacing: "fast-paced with quick cuts" or "slow cinematic reveal"'}</li>
                            <li>{language === 'es' ? 'Define el ambiente: "enérgico y divertido" o "profesional y limpio"' : 'Set the mood: "energetic and fun" or "professional and clean"'}</li>
                            <li>{language === 'es' ? 'Menciona transiciones: "zoom suave al producto" o "fundido entre escenas"' : 'Mention transitions: "smooth zoom-in on product" or "fade between scenes"'}</li>
                            <li>{language === 'es' ? 'Ángulos de cámara: "primer plano de la comida" o "toma amplia del local"' : 'Include camera angles: "close-up of food details" or "wide shot of venue"'}</li>
                            <li>{language === 'es' ? 'Referencia el estilo: "vertical tipo TikTok" o "comercial cinematográfico"' : 'Reference style: "TikTok-style vertical" or "cinematic commercial"'}</li>
                            <li className="font-medium text-emerald-700">{language === 'es' ? '¡Sé específico! Evita prompts vagos como "haz un video cool"' : 'Be specific! Avoid vague prompts like "make a cool video"'}</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wide">{language === 'es' ? 'Tips para Imágenes' : 'Image Tips'}</p>
                          <ul className="space-y-1.5 list-disc pl-3.5">
                            <li>{language === 'es' ? 'Describe la iluminación: "hora dorada cálida" o "iluminación de estudio brillante"' : 'Describe lighting: "warm golden hour" or "bright studio lighting"'}</li>
                            <li>{language === 'es' ? 'Composición: "vista cenital (flat-lay)" o "poca profundidad de campo"' : 'Set composition: "overhead flat-lay" or "eye-level with shallow depth of field"'}</li>
                            <li>{language === 'es' ? 'Estilo: "fondo blanco minimalista" o "fotografía callejera vibrante"' : 'Mention style: "minimalist with white background" or "vibrant street photography"'}</li>
                            <li>{language === 'es' ? 'Sin texto: Ava crea imágenes sin textos superpuestos' : 'No text: Ava generates images without text overlays'}</li>
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Caption text areas per platform */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{language === 'es' ? 'Leyendas' : 'Captions'}</span>
                  {Array.from(selectedPlatforms).filter(p => connectedSet.has(p)).map(platform => (
                    <div key={platform} className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                        {SOCIAL_PLATFORMS.find(sp => sp.key === platform)?.icon}
                        {SOCIAL_PLATFORMS.find(sp => sp.key === platform)?.label}
                      </label>
                      <textarea
                        value={editedCaptions[platform] || ''}
                        onChange={e => setEditedCaptions(prev => ({ ...prev, [platform]: e.target.value }))}
                        rows={3}
                        placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Write your message...'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Post button — advances to review step */}
            <button
              onClick={() => setSocialStep('review')}
              disabled={!preview || selectedPlatforms.size === 0}
              className="w-full px-4 py-3 bg-[#E8632B] text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              {language === 'es' ? 'Crear publicación' : 'Create Post'}
            </button>
          </>
        )}

        {/* ===== STEP 2: REVIEW & POST ===== */}
        {socialStep === 'review' && (
          <>
            {/* Back to Edit */}
            <button
              onClick={() => { setSocialStep('create'); setEditingPlatform(null); }}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'es' ? 'Volver a editar' : 'Back to Edit'}
            </button>

            {/* Platform Mockup Previews */}
            {preview && (() => {
              const displayImg = socialImageUrl || preview.image_url;
              const displayVid = socialVideoUrl;
              const isVideo = mediaMode === 'video' && displayVid;
              return (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{language === 'es' ? 'Vista previa' : 'Preview'}</span>
                </div>

                <div className="space-y-4">
                  {/* Facebook Mockup */}
                  {selectedPlatforms.has('facebook') && (
                    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto">
                      <div className="flex items-center gap-2.5 p-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {preview.vendor?.business_name?.charAt(0) || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{preview.vendor?.business_name || 'SpontiCoupon'}</p>
                          <p className="text-[11px] text-gray-500">Sponsored · <Globe className="w-3 h-3 inline" /></p>
                        </div>
                      </div>
                      <div className="px-3 pb-2">
                        {editingPlatform === 'facebook' ? (
                          <textarea
                            value={editedCaptions.facebook || ''}
                            onChange={e => setEditedCaptions(prev => ({ ...prev, facebook: e.target.value }))}
                            rows={4}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 whitespace-pre-line line-clamp-4">{editedCaptions.facebook || ''}</p>
                        )}
                        <button onClick={() => setEditingPlatform(editingPlatform === 'facebook' ? null : 'facebook')} className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium">
                          {editingPlatform === 'facebook' ? 'Done' : 'Edit caption'}
                        </button>
                      </div>
                      {(isVideo || displayImg) && (
                        <div className="aspect-video bg-gray-100 relative">
                          {isVideo ? (
                            <>
                              <video src={displayVid} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">VIDEO</div>
                              {/* Caption subtitle overlay for silent videos */}
                              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                <p className="text-white text-xs text-center font-medium line-clamp-2 drop-shadow-lg">
                                  {(editedCaptions.facebook || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').trim().substring(0, 100)}
                                </p>
                              </div>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={displayImg} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-around text-gray-500 text-xs">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Like</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Comment</span>
                        <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Share</span>
                      </div>
                    </div>
                  )}

                  {/* Instagram Mockup */}
                  {selectedPlatforms.has('instagram') && (
                    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-[2px] flex-shrink-0">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-900">
                              {preview.vendor?.business_name?.charAt(0) || 'S'}
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</p>
                        </div>
                        <span className="text-gray-400 tracking-widest font-bold">···</span>
                      </div>
                      {(isVideo || displayImg) && (
                        <div className="aspect-square bg-gray-100 relative">
                          {isVideo ? (
                            <>
                              <video src={displayVid} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><Video className="w-3 h-3" /> Reel</div>
                              {/* Caption subtitle overlay for silent videos */}
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                                <p className="text-white text-xs text-center font-medium line-clamp-2 drop-shadow-lg">
                                  {(editedCaptions.instagram || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').trim().substring(0, 100)}
                                </p>
                              </div>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={displayImg} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-4">
                          <Heart className="w-5 h-5 text-gray-800" />
                          <MessageCircle className="w-5 h-5 text-gray-800" />
                          <Send className="w-5 h-5 text-gray-800" />
                        </div>
                        <Bookmark className="w-5 h-5 text-gray-800" />
                      </div>
                      <div className="px-3 pb-3">
                        {editingPlatform === 'instagram' ? (
                          <textarea
                            value={editedCaptions.instagram || ''}
                            onChange={e => setEditedCaptions(prev => ({ ...prev, instagram: e.target.value }))}
                            rows={4}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</span>{' '}
                            <span className="whitespace-pre-line line-clamp-3">{editedCaptions.instagram || ''}</span>
                          </p>
                        )}
                        <button onClick={() => setEditingPlatform(editingPlatform === 'instagram' ? null : 'instagram')} className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium">
                          {editingPlatform === 'instagram' ? 'Done' : 'Edit caption'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* X/Twitter Mockup */}
                  {selectedPlatforms.has('twitter') && (
                    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto p-3">
                      <div className="flex gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {preview.vendor?.business_name?.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-gray-900 truncate">{preview.vendor?.business_name || 'SpontiCoupon'}</span>
                            <span className="text-sm text-gray-500 truncate">@{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</span>
                          </div>
                          {editingPlatform === 'twitter' ? (
                            <textarea
                              value={editedCaptions.twitter || ''}
                              onChange={e => setEditedCaptions(prev => ({ ...prev, twitter: e.target.value }))}
                              rows={3}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none mt-1"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 whitespace-pre-line mt-1 line-clamp-3">{editedCaptions.twitter || ''}</p>
                          )}
                          <button onClick={() => setEditingPlatform(editingPlatform === 'twitter' ? null : 'twitter')} className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium">
                            {editingPlatform === 'twitter' ? 'Done' : 'Edit'}
                          </button>
                          {(isVideo || displayImg) && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 relative">
                              {isVideo ? (
                                <video src={displayVid} className="w-full aspect-video object-cover" muted loop autoPlay playsInline />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={displayImg} alt="" className="w-full aspect-video object-cover" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2 text-gray-400">
                            <MessageCircle className="w-4 h-4" />
                            <RotateCcw className="w-4 h-4" />
                            <Heart className="w-4 h-4" />
                            <Share2 className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TikTok simple preview */}
                  {selectedPlatforms.has('tiktok') && (
                    <div className="border border-gray-300 rounded-lg bg-black overflow-hidden max-w-md mx-auto">
                      {(isVideo || displayImg) && (
                        <div className="aspect-[9/16] max-h-[300px] bg-gray-900 relative">
                          {isVideo ? (
                            <video src={displayVid} className="w-full h-full object-cover opacity-80" muted loop autoPlay playsInline />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={displayImg} alt="" className="w-full h-full object-cover opacity-80" />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-white text-sm font-semibold">@{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</span>
                            </div>
                            {editingPlatform === 'tiktok' ? (
                              <textarea
                                value={editedCaptions.tiktok || ''}
                                onChange={e => setEditedCaptions(prev => ({ ...prev, tiktok: e.target.value }))}
                                rows={3}
                                className="w-full bg-white/20 text-white rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#E8632B] resize-none placeholder-white/50"
                              />
                            ) : (
                              <p className="text-white text-xs line-clamp-2">{editedCaptions.tiktok || ''}</p>
                            )}
                            <button onClick={() => setEditingPlatform(editingPlatform === 'tiktok' ? null : 'tiktok')} className="text-xs text-orange-400 mt-1 font-medium">
                              {editingPlatform === 'tiktok' ? 'Done' : 'Edit caption'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* Action buttons — Post Now, Schedule, Save Draft */}
            <div className="space-y-2 pt-3">
              <button
                onClick={handlePost}
                disabled={posting || scheduling || selectedPlatforms.size === 0}
                className="w-full px-4 py-2.5 bg-[#E8632B] text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {language === 'es' ? 'Publicar ahora' : 'Post Now'}
              </button>

              {/* Schedule row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-[100px] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => handleScheduleOrDraft('schedule')}
                  disabled={scheduling || posting || !scheduleDate || selectedPlatforms.size === 0}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                  {language === 'es' ? 'Programar' : 'Schedule'}
                </button>
              </div>

              <button
                onClick={() => handleScheduleOrDraft('draft')}
                disabled={scheduling || posting || selectedPlatforms.size === 0}
                className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {language === 'es' ? 'Guardar borrador' : 'Save Draft'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
