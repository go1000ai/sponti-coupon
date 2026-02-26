'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';
import MediaPicker from '@/components/vendor/MediaPicker';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe, Loader2, Sparkles, ArrowRight, Tag, Download, Save,
  Image as ImageIcon, ChevronUp, Upload, LinkIcon, FolderOpen,
  AlertCircle, Zap, CheckCircle2, Copy, Wand2, ChevronDown,
} from 'lucide-react';

interface ExtractedInfo {
  business_name?: string;
  services_or_products?: string[];
  price_range?: string;
  specialties?: string[];
  brand_tone?: string;
}

interface SuggestedDeal {
  title: string;
  description: string;
  deal_type: 'regular' | 'sponti_coupon';
  original_price: number;
  deal_price: number;
  discount_percentage: number;
  max_claims: number;
  terms_and_conditions?: string;
  how_it_works?: string;
  highlights?: string[];
  amenities?: string[];
  fine_print?: string;
  suggested_image_prompt?: string;
}

interface AnalysisResult {
  business_summary: string;
  extracted_info: ExtractedInfo;
  suggested_deals: SuggestedDeal[];
  recommended_images?: string[];
}

export default function ImportFromWebsitePage() {
  useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const router = useRouter();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [websiteImages, setWebsiteImages] = useState<string[]>([]);
  const [expandedDeal, setExpandedDeal] = useState<number | null>(0);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [dealImages, setDealImages] = useState<Record<number, string>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savedImages, setSavedImages] = useState<Record<number, boolean>>({});
  const [savingImage, setSavingImage] = useState<number | null>(null);
  const [savingAllImages, setSavingAllImages] = useState(false);
  const [savingDraft, setSavingDraft] = useState<number | null>(null);
  const [imageTab, setImageTab] = useState<Record<number, 'website' | 'url' | 'upload' | 'library' | 'ai'>>({});
  const [urlInputs, setUrlInputs] = useState<Record<number, string>>({});
  const [uploadingForDeal, setUploadingForDeal] = useState<number | null>(null);
  const [mediaPickerDeal, setMediaPickerDeal] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter your website URL.');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);
    setWebsiteImages([]);
    setDealImages({});

    try {
      const res = await fetch('/api/vendor/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to analyze website');
        setLoading(false);
        return;
      }
      setAnalysis(data.analysis);
      setWebsiteImages(data.website_images || []);
    } catch {
      setError('Failed to analyze website. Please try again.');
    }
    setLoading(false);
  };

  // Save a single website image to vendor media library
  const handleSaveImage = async (imgUrl: string, imgIdx: number) => {
    setSavingImage(imgIdx);
    try {
      const res = await fetch('/api/vendor/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imgUrl,
          type: 'image',
          source: 'url',
          title: `Website import - Image ${imgIdx + 1}`,
        }),
      });
      if (res.ok) {
        setSavedImages(prev => ({ ...prev, [imgIdx]: true }));
      }
    } catch { /* silent */ }
    setSavingImage(null);
  };

  // Save all website images to library at once
  const handleSaveAllImages = async () => {
    setSavingAllImages(true);
    for (let i = 0; i < Math.min(websiteImages.length, 8); i++) {
      if (savedImages[i]) continue; // skip already saved
      try {
        const res = await fetch('/api/vendor/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: websiteImages[i],
            type: 'image',
            source: 'url',
            title: `Website import - Image ${i + 1}`,
          }),
        });
        if (res.ok) {
          setSavedImages(prev => ({ ...prev, [i]: true }));
        }
      } catch { /* continue */ }
    }
    setSavingAllImages(false);
  };

  // Save a deal as draft — creates the deal in the database with status 'draft'
  const handleSaveDraft = async (deal: SuggestedDeal, idx: number) => {
    setSavingDraft(idx);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (deal.deal_type === 'sponti_coupon' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));
      const depositAmount = deal.deal_type === 'sponti_coupon'
        ? Math.round(deal.deal_price * 0.15 * 100) / 100
        : null;

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_type: deal.deal_type,
          title: deal.title,
          description: deal.description,
          original_price: deal.original_price,
          deal_price: deal.deal_price,
          deposit_amount: depositAmount,
          max_claims: deal.max_claims,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          image_url: dealImages[idx] || null,
          terms_and_conditions: deal.terms_and_conditions || null,
          how_it_works: deal.how_it_works || null,
          fine_print: deal.fine_print || null,
          highlights: deal.highlights || [],
          amenities: deal.amenities || [],
          status: 'draft',
        }),
      });
      if (res.ok) {
        router.push('/vendor/deals/calendar');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save draft');
      }
    } catch {
      setError('Failed to save draft. Please try again.');
    }
    setSavingDraft(null);
  };

  // Upload a file from computer for a specific deal
  const handleFileUpload = async (idx: number, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    setUploadingForDeal(idx);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'deal-images');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setDealImages(prev => ({ ...prev, [idx]: data.url }));
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed. Please try again.');
    }
    setUploadingForDeal(null);
  };

  const handleGenerateImage = async (idx: number, prompt: string) => {
    setGeneratingImage(idx);
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: analysis?.suggested_deals[idx]?.title || 'Deal image',
          custom_prompt: prompt,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDealImages(prev => ({ ...prev, [idx]: data.url }));
      }
    } catch { /* silent */ }
    setGeneratingImage(null);
  };

  // Build query params for the deal creation page
  const buildCreateLink = (deal: SuggestedDeal, idx: number) => {
    const params = new URLSearchParams();
    params.set('from_website', 'true');
    params.set('title', deal.title);
    params.set('description', deal.description);
    params.set('deal_type', deal.deal_type);
    params.set('original_price', deal.original_price.toString());
    params.set('deal_price', deal.deal_price.toString());
    if (deal.max_claims) params.set('max_claims', deal.max_claims.toString());
    if (deal.terms_and_conditions) params.set('terms', deal.terms_and_conditions);
    if (deal.how_it_works) params.set('how_it_works', deal.how_it_works);
    if (deal.fine_print) params.set('fine_print', deal.fine_print);
    if (deal.highlights?.length) params.set('highlights', JSON.stringify(deal.highlights));
    if (deal.amenities?.length) params.set('amenities', JSON.stringify(deal.amenities));
    if (dealImages[idx]) params.set('image_url', dealImages[idx]);
    return `/vendor/deals/new?${params.toString()}`;
  };

  const copyDealDetails = (deal: SuggestedDeal, idx: number) => {
    const text = `Title: ${deal.title}
Description: ${deal.description}
Original Price: $${deal.original_price}
Deal Price: $${deal.deal_price} (${deal.discount_percentage}% off)
Type: ${deal.deal_type === 'sponti_coupon' ? 'Flash Deal' : 'Steady Deal'}
${deal.highlights?.length ? `Highlights: ${deal.highlights.join(', ')}` : ''}
${deal.amenities?.length ? `Amenities: ${deal.amenities.join(', ')}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-500 flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
          Import from Website
        </h1>
        <p className="text-gray-500 mt-1">
          AI will analyze your website, learn about your business, and suggest ready-to-publish deals.
        </p>
      </div>

      <GatedSection loading={tierLoading} locked={!canAccess('ai_deal_assistant')} requiredTier="business" featureName="Website Import" description="Let AI create deals from your website. Upgrade to Business.">

      {/* URL Input */}
      <div className="card p-6 mb-6">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Your Website URL</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleScrape()}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. www.yourbusiness.com"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Analyze & Generate</>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          We&apos;ll scan your website to learn about your products, services, and pricing. Then generate personalized deal suggestions.
        </p>
      </div>

      {/* Go1000.ai CTA — shown when no URL entered and no analysis yet */}
      {!analysis && !loading && !url.trim() && (
        <div className="card p-5 mb-6 bg-gradient-to-r from-[#0f0b2e] via-[#1a1145] to-[#0f0b2e] border-indigo-800/40">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://storage.googleapis.com/msgsndr/RrimTjEAXp1sgZPUBfnl/media/6977af6cd1ceb26462b630a2.png"
                alt="Go1000.ai"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">Don&apos;t have a website yet?</h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Our sister company <strong className="text-cyan-300">Go1000.ai</strong> builds AI-powered websites, automations, and digital solutions for businesses.
              </p>
            </div>
            <a
              href="https://go1000.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex-shrink-0"
            >
              Visit Go1000.ai <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Could not analyze website</p>
              <p className="text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          {/* Go1000.ai CTA after error */}
          <div className="mt-3 bg-[#0f0b2e] border border-indigo-800/40 rounded-xl p-4 flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://storage.googleapis.com/msgsndr/RrimTjEAXp1sgZPUBfnl/media/6977af6cd1ceb26462b630a2.png"
                alt="Go1000.ai"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-indigo-200 flex-1">
              Need a professional website? <a href="https://go1000.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 font-semibold hover:underline">Go1000.ai</a> — AI-powered websites & automations by the SpontiCoupon team.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Analyzing your website...</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            AI is reading your website, understanding your products and services, checking competitor deals, and crafting personalized suggestions. This may take 15-30 seconds.
          </p>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Business Summary */}
          <div className="card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <h2 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Website Analysis Complete
            </h2>
            <p className="text-gray-700 text-sm mb-4">{analysis.business_summary}</p>

            {analysis.extracted_info && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.extracted_info.services_or_products && analysis.extracted_info.services_or_products.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Products / Services</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.extracted_info.services_or_products.slice(0, 8).map((item, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white/70 rounded-lg text-gray-700">{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.extracted_info.specialties && analysis.extracted_info.specialties.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.extracted_info.specialties.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white/70 rounded-lg text-gray-700">{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.extracted_info.price_range && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Price Range</p>
                    <span className="text-sm text-gray-700">{analysis.extracted_info.price_range}</span>
                  </div>
                )}
                {analysis.extracted_info.brand_tone && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Brand Tone</p>
                    <span className="text-sm text-gray-700 capitalize">{analysis.extracted_info.brand_tone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Website Images */}
          {websiteImages.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-500" /> Images Found on Your Website
                </h3>
                <button
                  onClick={handleSaveAllImages}
                  disabled={savingAllImages || Object.keys(savedImages).length >= Math.min(websiteImages.length, 8)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {savingAllImages ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                  ) : Object.keys(savedImages).length >= Math.min(websiteImages.length, 8) ? (
                    <><CheckCircle2 className="w-3 h-3" /> All Saved</>
                  ) : (
                    <><Download className="w-3 h-3" /> Save All to Library</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {websiteImages.slice(0, 8).map((imgUrl, i) => (
                  <div key={i} className="group relative">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Website image ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                    {/* Save overlay */}
                    <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {savedImages[i] ? (
                        <span className="text-green-400"><CheckCircle2 className="w-6 h-6" /></span>
                      ) : (
                        <button
                          onClick={() => handleSaveImage(imgUrl, i)}
                          disabled={savingImage === i}
                          className="p-1.5 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Save to Library"
                        >
                          {savingImage === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    {savedImages[i] && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Hover over images to save them to your Media Library. Click &quot;Save All&quot; to save all at once.
              </p>
            </div>
          )}

          {/* Suggested Deals */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#E8632B]" /> Suggested Deals ({analysis.suggested_deals?.length || 0})
            </h2>

            <div className="space-y-4">
              {analysis.suggested_deals?.map((deal, idx) => (
                <div key={idx} className="card overflow-hidden">
                  {/* Deal Header — always visible */}
                  <button
                    onClick={() => setExpandedDeal(expandedDeal === idx ? null : idx)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    {/* Deal image or placeholder */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      {dealImages[idx] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dealImages[idx]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Tag className="w-8 h-8 text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          deal.deal_type === 'sponti_coupon'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {deal.deal_type === 'sponti_coupon' ? (
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Flash Deal</span>
                          ) : 'Steady Deal'}
                        </span>
                        <span className="text-xs text-green-600 font-bold">{deal.discount_percentage}% OFF</span>
                      </div>
                      <h3 className="font-bold text-gray-800 truncate">{deal.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-400 line-through">${deal.original_price}</span>
                        <span className="text-lg font-bold text-[#E8632B]">${deal.deal_price}</span>
                      </div>
                    </div>

                    {expandedDeal === idx ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {expandedDeal === idx && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">{deal.description}</p>

                      {/* Highlights & Amenities */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {deal.highlights && deal.highlights.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Highlights</p>
                            <ul className="space-y-1">
                              {deal.highlights.map((h, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {deal.amenities && deal.amenities.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amenities</p>
                            <div className="flex flex-wrap gap-1.5">
                              {deal.amenities.map((a, i) => (
                                <span key={i} className="text-xs px-2.5 py-1 bg-white rounded-lg text-gray-600 border border-gray-200">{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Terms */}
                      {deal.terms_and_conditions && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Terms & Conditions</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{deal.terms_and_conditions}</p>
                        </div>
                      )}

                      {/* How it Works */}
                      {deal.how_it_works && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">How It Works</p>
                          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{deal.how_it_works}</p>
                        </div>
                      )}

                      {/* Deal Image Section */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deal Image</p>

                        {/* Selected image preview */}
                        {dealImages[idx] && (
                          <div className="flex items-start gap-4 mb-3 bg-green-50 rounded-xl p-3 border border-green-200">
                            <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-green-300 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={dealImages[idx]} alt="Selected" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col gap-2 pt-1">
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Image selected
                              </span>
                              <button
                                onClick={() => setDealImages(prev => { const n = { ...prev }; delete n[idx]; return n; })}
                                className="text-xs text-red-500 hover:text-red-600 font-medium"
                              >
                                Change image
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Image picker tabs */}
                        {!dealImages[idx] && (
                          <div className="rounded-xl border border-gray-200 overflow-hidden">
                            {/* Tab headers */}
                            <div className="flex bg-gray-50 border-b border-gray-200">
                              {websiteImages.length > 0 && (
                                <button
                                  onClick={() => setImageTab(prev => ({ ...prev, [idx]: 'website' }))}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                                    (imageTab[idx] || 'website') === 'website' ? 'border-[#E8632B] text-[#E8632B] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <Globe className="w-3 h-3" /> Website
                                </button>
                              )}
                              <button
                                onClick={() => setImageTab(prev => ({ ...prev, [idx]: 'upload' }))}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                                  imageTab[idx] === 'upload' ? 'border-[#E8632B] text-[#E8632B] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <Upload className="w-3 h-3" /> Upload
                              </button>
                              <button
                                onClick={() => setImageTab(prev => ({ ...prev, [idx]: 'url' }))}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                                  imageTab[idx] === 'url' ? 'border-[#E8632B] text-[#E8632B] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <LinkIcon className="w-3 h-3" /> URL
                              </button>
                              <button
                                onClick={() => setImageTab(prev => ({ ...prev, [idx]: 'library' }))}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                                  imageTab[idx] === 'library' ? 'border-[#E8632B] text-[#E8632B] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <FolderOpen className="w-3 h-3" /> Library
                              </button>
                              {deal.suggested_image_prompt && (
                                <button
                                  onClick={() => setImageTab(prev => ({ ...prev, [idx]: 'ai' }))}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                                    imageTab[idx] === 'ai' ? 'border-violet-500 text-violet-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <Wand2 className="w-3 h-3" /> AI Generate
                                </button>
                              )}
                            </div>

                            {/* Tab content */}
                            <div className="p-3">
                              {/* Website images tab */}
                              {(imageTab[idx] || 'website') === 'website' && websiteImages.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Click an image from your website to use it:</p>
                                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                                    {websiteImages.slice(0, 8).map((imgUrl, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setDealImages(prev => ({ ...prev, [idx]: imgUrl }))}
                                        className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#E8632B] transition-all"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Upload tab */}
                              {imageTab[idx] === 'upload' && (
                                <div>
                                  <input
                                    type="file"
                                    ref={el => { fileInputRefs.current[idx] = el; }}
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])}
                                  />
                                  <button
                                    onClick={() => fileInputRefs.current[idx]?.click()}
                                    disabled={uploadingForDeal === idx}
                                    className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#E8632B] hover:text-[#E8632B] transition-all"
                                  >
                                    {uploadingForDeal === idx ? (
                                      <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-medium">Uploading...</span></>
                                    ) : (
                                      <><Upload className="w-6 h-6" /><span className="text-xs font-medium">Click to upload from your computer</span><span className="text-[10px] text-gray-400">JPG, PNG, WebP, GIF up to 5MB</span></>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* URL tab */}
                              {imageTab[idx] === 'url' && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Paste an image URL:</p>
                                  <div className="flex gap-2">
                                    <input
                                      value={urlInputs[idx] || ''}
                                      onChange={e => setUrlInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="https://example.com/image.jpg"
                                    />
                                    <button
                                      onClick={() => { if (urlInputs[idx]?.trim()) setDealImages(prev => ({ ...prev, [idx]: urlInputs[idx].trim() })); }}
                                      disabled={!urlInputs[idx]?.trim()}
                                      className="px-4 py-2 bg-[#E8632B] text-white rounded-lg text-xs font-medium hover:bg-[#D55A25] transition-all disabled:opacity-50"
                                    >
                                      Use Image
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Library tab */}
                              {imageTab[idx] === 'library' && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Pick from your SpontiCoupon Media Library:</p>
                                  <button
                                    onClick={() => setMediaPickerDeal(idx)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#E8632B] text-white rounded-lg text-xs font-medium hover:bg-[#D55A25] transition-all"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" /> Open Media Library
                                  </button>
                                </div>
                              )}

                              {/* AI Generate tab */}
                              {imageTab[idx] === 'ai' && deal.suggested_image_prompt && (
                                <div>
                                  <p className="text-xs text-violet-600 mb-2">{deal.suggested_image_prompt}</p>
                                  <button
                                    onClick={() => handleGenerateImage(idx, deal.suggested_image_prompt!)}
                                    disabled={generatingImage !== null}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition-all disabled:opacity-50"
                                  >
                                    {generatingImage === idx ? (
                                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                                    ) : (
                                      <><Wand2 className="w-3.5 h-3.5" /> Generate AI Image</>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                        <Link
                          href={buildCreateLink(deal, idx)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#E8632B] text-white rounded-xl font-medium text-sm hover:bg-[#D55A25] transition-all"
                        >
                          Create This Deal <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleSaveDraft(deal, idx)}
                          disabled={savingDraft === idx}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                          {savingDraft === idx ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="w-4 h-4" /> Save as Draft</>
                          )}
                        </button>
                        <button
                          onClick={() => copyDealDetails(deal, idx)}
                          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                        >
                          {copiedIdx === idx ? (
                            <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copied!</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Copy Details</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Re-analyze */}
          <div className="text-center pt-4">
            <button
              onClick={handleScrape}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Re-analyze website for new suggestions
            </button>
          </div>
        </div>
      )}

      </GatedSection>

      {/* Media Picker Modal */}
      <MediaPicker
        open={mediaPickerDeal !== null}
        onClose={() => setMediaPickerDeal(null)}
        onSelect={(selectedUrl) => {
          if (mediaPickerDeal !== null) {
            setDealImages(prev => ({ ...prev, [mediaPickerDeal]: selectedUrl }));
          }
          setMediaPickerDeal(null);
        }}
        type="image"
      />
    </div>
  );
}
