'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import {
  MapPin, Clock, Tag, AlertTriangle, ArrowLeft, Store, Shield, Users,
  Star, MessageSquare, Send, Loader2, CheckCircle2, Globe, Phone, Mail,
  ExternalLink, ChevronRight, Sparkles, Zap, Info, Heart,
  Wifi, Car, PawPrint, Coffee, UtensilsCrossed, Music,
  Navigation, Copy, Check,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import Link from 'next/link';
import Image from 'next/image';
import { DealImageGallery } from '@/components/deals/DealImageGallery';
import type { Deal, Review, BusinessHours, VendorSocialLinks } from '@/lib/types/database';

// Amenity icon mapping
const AMENITY_ICONS: Record<string, React.ElementType> = {
  'wifi': Wifi, 'free wifi': Wifi, 'wi-fi': Wifi,
  'parking': Car, 'free parking': Car, 'valet': Car,
  'pet friendly': PawPrint, 'pets allowed': PawPrint, 'dog friendly': PawPrint,
  'coffee': Coffee, 'drinks': Coffee,
  'outdoor seating': UtensilsCrossed, 'patio': UtensilsCrossed, 'dine-in': UtensilsCrossed,
  'live music': Music, 'entertainment': Music,
};

function getAmenityIcon(amenity: string): React.ElementType {
  const lower = amenity.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CheckCircle2;
}

interface VendorDeal {
  id: string;
  title: string;
  deal_type: string;
  original_price: number;
  deal_price: number;
  discount_percentage: number;
  image_url: string | null;
  expires_at: string;
  claims_count: number;
  max_claims: number | null;
  status: string;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [vendorDeals, setVendorDeals] = useState<VendorDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [error, setError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'vendor'>('details');

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [reviewWaitMessage, setReviewWaitMessage] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchDeal() {
      const response = await fetch(`/api/deals/${params.id}`);
      const data = await response.json();
      setDeal(data.deal);
      setVendorDeals(data.vendor_deals || []);
      setLoading(false);
    }
    fetchDeal();
  }, [params.id]);

  useEffect(() => {
    if (!deal?.vendor_id) return;
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.vendor_id]);

  useEffect(() => {
    if (!user || !deal) return;
    checkCanReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, deal]);

  const fetchReviews = async () => {
    if (!deal?.vendor_id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?vendor_id=${deal.vendor_id}&limit=10`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setAvgRating(data.avg_rating || 0);
      setTotalReviews(data.total_reviews || 0);
    } catch {
      // Non-critical
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user || !deal) return;
    try {
      const eligRes = await fetch(`/api/reviews/eligibility?vendor_id=${deal.vendor_id}&deal_id=${deal.id}`);
      if (eligRes.ok) {
        const eligData = await eligRes.json();
        if (eligData.has_reviewed) { setCanReview(false); setReviewWaitMessage(null); return; }
        if (eligData.can_review) { setCanReview(true); setReviewWaitMessage(null); return; }
        if (eligData.wait_hours !== undefined && eligData.wait_hours !== null) {
          setCanReview(false);
          const hoursLeft = Math.ceil(eligData.wait_hours);
          setReviewWaitMessage(hoursLeft <= 1 ? 'You can leave a review in less than 1 hour' : `You can leave a review in about ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`);
          return;
        }
        setCanReview(false);
        setReviewWaitMessage(null);
      }
    } catch { /* Non-critical */ }
  };

  const handleSubmitReview = async () => {
    if (!user || !deal || reviewRating === 0) return;
    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: deal.vendor_id, deal_id: deal.id, rating: reviewRating, comment: reviewComment.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewMessage({ type: 'success', text: 'Thank you for your review!' });
        setShowReviewForm(false);
        setCanReview(false);
        setReviewRating(0);
        setReviewComment('');
        fetchReviews();
      } else {
        if (data.code === 'REVIEW_TOO_EARLY') {
          setReviewMessage({ type: 'error', text: data.error });
          setShowReviewForm(false);
          setCanReview(false);
          checkCanReview();
        } else {
          setReviewMessage({ type: 'error', text: data.error || 'Failed to submit review' });
        }
      }
    } catch {
      setReviewMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleClaim = async () => {
    if (!user) { router.push(`/auth/login?redirect=/deals/${params.id}`); return; }
    if (deal?.deposit_amount && deal.deposit_amount > 0) { setShowDisclaimer(true); return; }
    await processClaim();
  };

  const processClaim = async () => {
    setClaiming(true);
    setError('');
    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal?.id }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error); setClaiming(false); return; }

      // Route based on payment tier
      if (data.payment_tier === 'integrated' && data.redirect_url) {
        // Stripe Connect Checkout — redirect to Stripe
        window.location.href = data.redirect_url;
        return;
      }

      if (data.payment_tier === 'manual' && data.payment_instructions) {
        // Manual payment — show instructions page
        const pi = data.payment_instructions;
        const params = new URLSearchParams({
          session_token: data.session_token,
          processor: pi.processor,
          payment_info: pi.payment_info,
          amount: pi.amount.toString(),
          deal_title: pi.deal_title || '',
        });
        router.push(`/claim/manual-payment?${params.toString()}`);
        return;
      }

      if (data.redirect_url) {
        // Legacy static link
        window.location.href = data.redirect_url;
        return;
      }

      // No deposit — instant QR
      router.push('/dashboard/my-deals');
    } catch { setError('Failed to claim deal. Please try again.'); }
    setClaiming(false);
    setShowDisclaimer(false);
  };

  const getCustomerName = (review: Review) => {
    if (review.customer?.first_name) return `${review.customer.first_name} ${(review.customer.last_name || '').charAt(0)}.`;
    if (review.customer?.email) { const name = review.customer.email.split('@')[0]; return name.charAt(0).toUpperCase() + name.slice(1); }
    return 'Customer';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const getGoogleMapsUrl = (vendor: Deal['vendor']) => {
    if (!vendor) return '';
    const query = encodeURIComponent(`${vendor.address || ''}, ${vendor.city || ''}, ${vendor.state || ''} ${vendor.zip || ''}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  };

  const getGoogleMapsEmbedUrl = (vendor: Deal['vendor']) => {
    if (!vendor?.lat || !vendor?.lng) return null;
    return `https://www.google.com/maps?q=${vendor.lat},${vendor.lng}&output=embed`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          <p className="text-sm text-gray-400">Loading deal...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-500">Deal not found</h1>
        <Link href="/deals" className="text-primary-500 hover:underline mt-4 inline-block">Back to deals</Link>
      </div>
    );
  }

  const isSponti = deal.deal_type === 'sponti_coupon';
  const hasDeposit = deal.deposit_amount != null && deal.deposit_amount > 0;
  const isExpired = new Date(deal.expires_at) < new Date();
  const isSoldOut = deal.max_claims ? deal.claims_count >= deal.max_claims : false;
  const vendor = deal.vendor;
  const hours = vendor?.business_hours as BusinessHours | undefined;
  const social = vendor?.social_links as VendorSocialLinks | undefined;
  const fullAddress = vendor ? [vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', ') : '';

  // Current day status
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = dayNames[new Date().getDay()];
  const todayHours = hours?.[today];
  const isOpenNow = todayHours && !todayHours.closed;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HERO SECTION ===== */}
      <div className="relative">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <Link href="/deals" className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black/60 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* Image Gallery */}
        <DealImageGallery
          mainImage={deal.image_url}
          images={deal.image_urls || []}
          videoUrls={deal.video_urls || []}
          title={deal.title}
          fallback={
            <div className={`w-full h-72 sm:h-96 flex items-center justify-center ${isSponti ? 'bg-gradient-to-br from-primary-500 via-primary-600 to-purple-700' : 'bg-gradient-to-br from-secondary-400 via-secondary-500 to-secondary-700'}`}>
              {isSponti ? <SpontiIcon className="w-24 h-24 text-white/20" /> : <Tag className="w-24 h-24 text-white/20" />}
            </div>
          }
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 relative">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ===== MAIN CONTENT (2 cols) ===== */}
          <div className="lg:col-span-2 space-y-6">

            {/* Deal Header Card */}
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 animate-fade-up text-center sm:text-left">
              {/* Badges row */}
              <div className="flex items-center flex-wrap gap-2 mb-4 justify-center sm:justify-start">
                <DealTypeBadge type={deal.deal_type} size="lg" />
                {isExpired && <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">EXPIRED</span>}
                {isSoldOut && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">SOLD OUT</span>}
                {!isExpired && !isSoldOut && deal.claims_count > 10 && (
                  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Popular
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-500 leading-tight break-words">{deal.title}</h1>

              {/* Vendor row */}
              {vendor && (
                <div className="flex items-center gap-3 mt-4 justify-center sm:justify-start">
                  {vendor.logo_url ? (
                    <Image src={vendor.logo_url} alt={vendor.business_name} width={44} height={44} className="rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-secondary-500">{vendor.business_name}</p>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500 justify-center sm:justify-start">
                      {totalReviews > 0 && (
                        <button onClick={() => setActiveTab('reviews')} className="flex items-center gap-1 hover:text-primary-500 transition-colors">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{Number(avgRating).toFixed(1)}</span>
                          <span>({totalReviews})</span>
                        </button>
                      )}
                      {vendor.city && (
                        <>
                          {totalReviews > 0 && <span className="text-gray-300 hidden sm:inline">|</span>}
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {vendor.city}, {vendor.state}</span>
                        </>
                      )}
                      {isOpenNow !== undefined && (
                        <>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className={`font-medium ${isOpenNow ? 'text-green-600' : 'text-red-500'}`}>
                            {isOpenNow ? 'Open Now' : 'Closed'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {deal.description && (
                <p className="text-gray-600 mt-5 leading-relaxed text-base">{deal.description}</p>
              )}

              {/* Highlights */}
              {deal.highlights && deal.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                  {deal.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full border border-green-200 font-medium">
                      <Sparkles className="w-3 h-3" /> {h}
                    </span>
                  ))}
                </div>
              )}

              {/* What's Included */}
              <div className="mt-5 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-100">
                <h3 className="text-sm font-bold text-secondary-500 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> What&apos;s Included
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {deal.title}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    Save {formatPercentage(deal.discount_percentage)} off retail
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    Digital QR code for redemption
                  </div>
                  {isSponti && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      Exclusive time-limited pricing
                    </div>
                  )}
                </div>
              </div>

              {/* Sponti vs Steady Explanation */}
              <div className={`mt-5 rounded-xl p-5 border ${isSponti ? 'bg-gradient-to-br from-primary-50 to-orange-50 border-primary-200' : 'bg-gradient-to-br from-secondary-50 to-blue-50 border-secondary-200'}`}>
                <div className="flex items-start gap-3">
                  {isSponti ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
                      <SpontiIcon className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary-500/30">
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-secondary-500">
                      {isSponti ? 'This is a Sponti Deal' : 'This is a Steady Deal'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {isSponti
                        ? 'Sponti deals are spontaneous, time-limited offers with deep discounts — often 50-70% off. They appear without warning and expire within hours, so you need to act fast! A small deposit locks in your deal, which you pay when you visit the business.'
                        : 'Steady deals are everyday savings that stick around longer. They offer reliable discounts from local businesses — typically 20-40% off — with more time to claim and redeem. No deposit required, just claim and show your QR code!'
                      }
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                      {isSponti ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-white/70 px-2.5 py-1 rounded-full">
                            <Zap className="w-3 h-3" /> Deep discounts
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-white/70 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" /> Limited time
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-white/70 px-2.5 py-1 rounded-full">
                            <Shield className="w-3 h-3" /> Small deposit to claim
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-700 bg-white/70 px-2.5 py-1 rounded-full">
                            <Tag className="w-3 h-3" /> Everyday savings
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-700 bg-white/70 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" /> More time to redeem
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-700 bg-white/70 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> No deposit needed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Countdown for Sponti */}
              {!isExpired && isSponti && (
                <div className="mt-5 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-primary-400" />
                    <span className="font-semibold">Deal expires in:</span>
                  </div>
                  <CountdownTimer expiresAt={deal.expires_at} size="lg" />
                </div>
              )}
            </div>

            {/* ===== MOBILE PRICE CARD (shown only below lg) ===== */}
            <div className="lg:hidden bg-white rounded-2xl shadow-lg p-6 text-center">
              <div className="text-gray-400 line-through text-lg">{formatCurrency(deal.original_price)}</div>
              <div className="text-4xl font-bold text-primary-500 my-1">{formatCurrency(deal.deal_price)}</div>
              <div className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-bold text-lg px-4 py-1.5 rounded-full">
                {formatPercentage(deal.discount_percentage)} OFF
              </div>
              <p className="text-xs text-gray-400 mt-2">You save {formatCurrency(deal.original_price - deal.deal_price)}</p>

              {hasDeposit && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mt-4 text-left">
                  <p className="text-sm font-semibold text-primary-700">Deposit: {formatCurrency(deal.deposit_amount ?? 0)}</p>
                  <p className="text-xs text-primary-600 mt-1">Paid directly to the business. Non-refundable if not redeemed.</p>
                </div>
              )}

              {deal.max_claims && (
                <div className="mt-4 text-left">
                  <div className="flex justify-between text-sm text-gray-500 mb-1.5">
                    <span>{deal.claims_count} claimed</span>
                    <span className="font-medium">{deal.max_claims - deal.claims_count} left</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        (deal.claims_count / deal.max_claims) > 0.8 ? 'bg-red-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {!isExpired && !isSoldOut && deal.status === 'active' && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className={`w-full text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-lg mt-4 ${
                    isSponti || hasDeposit
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/25'
                      : 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 shadow-secondary-500/25'
                  }`}
                >
                  {claiming ? 'Processing...' : hasDeposit ? `Claim Deal — ${formatCurrency(deal.deposit_amount!)} Deposit` : 'Claim This Deal'}
                </button>
              )}

              {isExpired && (
                <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-xl font-semibold mt-4">This deal has expired</div>
              )}
              {isSoldOut && (
                <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-xl font-semibold mt-4">This deal is sold out</div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mt-4">{error}</div>
              )}
            </div>

            {/* ===== TAB NAVIGATION ===== */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {(['details', 'reviews', 'vendor'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3.5 text-sm font-semibold transition-colors relative ${
                      activeTab === tab ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'details' && 'The Nitty Gritty'}
                    {tab === 'reviews' && `Reviews (${totalReviews})`}
                    {tab === 'vendor' && 'About Business'}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                {/* ===== DETAILS TAB ===== */}
                {activeTab === 'details' && (
                  <div className="space-y-8">
                    {/* How It Works */}
                    {deal.how_it_works && (
                      <div>
                        <h3 className="text-lg font-bold text-secondary-500 mb-3 flex items-center gap-2">
                          <Info className="w-5 h-5 text-primary-500" /> How It Works
                        </h3>
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{deal.how_it_works}</p>
                        </div>
                      </div>
                    )}

                    {/* Default How It Works if vendor didn't provide one */}
                    {!deal.how_it_works && (
                      <div>
                        <h3 className="text-lg font-bold text-secondary-500 mb-3 flex items-center gap-2">
                          <Info className="w-5 h-5 text-primary-500" /> How It Works
                        </h3>
                        <div className="grid sm:grid-cols-3 gap-4">
                          {[
                            { step: '1', title: 'Claim the Deal', desc: hasDeposit ? `Pay the ${formatCurrency(deal.deposit_amount!)} deposit to lock in your deal` : 'Click claim to get your QR code' },
                            { step: '2', title: 'Show QR Code', desc: 'Present your QR code at the business' },
                            { step: '3', title: 'Enjoy Savings!', desc: `Save ${formatPercentage(deal.discount_percentage)} on your purchase` },
                          ].map((s, i) => (
                            <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                              <div className="w-10 h-10 rounded-full bg-primary-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">{s.step}</div>
                              <p className="font-semibold text-secondary-500 text-sm">{s.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Amenities */}
                    {deal.amenities && deal.amenities.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-secondary-500 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-primary-500" /> Amenities
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {deal.amenities.map((a, i) => {
                            const Icon = getAmenityIcon(a);
                            return (
                              <div key={i} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
                                <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{a}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Terms & Conditions */}
                    {deal.terms_and_conditions && (
                      <div>
                        <h3 className="text-lg font-bold text-secondary-500 mb-3 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary-500" /> Terms & Conditions
                        </h3>
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{deal.terms_and_conditions}</p>
                        </div>
                      </div>
                    )}

                    {/* Redemption Instructions */}
                    <div>
                      <h3 className="text-lg font-bold text-secondary-500 mb-3 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary-500" /> How to Redeem
                      </h3>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                        <ol className="space-y-3">
                          {[
                            { title: 'Claim this deal', desc: hasDeposit ? `Pay the ${formatCurrency(deal.deposit_amount!)} deposit to secure your spot` : 'Click the claim button — no payment required' },
                            { title: 'Get your QR code', desc: 'A unique QR code will appear in your "My Coupons" dashboard' },
                            { title: 'Visit the business', desc: `Head to ${vendor?.business_name || 'the business'} before the deal expires` },
                            { title: 'Show your QR code', desc: 'The staff will scan it to apply your discount' },
                          ].map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-green-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                              <div>
                                <p className="font-semibold text-secondary-500 text-sm">{step.title}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{step.desc}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Fine Print */}
                    {deal.fine_print && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm text-amber-800 leading-relaxed">
                          <span className="font-semibold">Fine Print: </span>
                          {deal.fine_print}
                        </p>
                      </div>
                    )}

                    {/* Map Section */}
                    {vendor && fullAddress && (
                      <div>
                        <h3 className="text-lg font-bold text-secondary-500 mb-3 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary-500" /> Location
                        </h3>
                        <div className="rounded-xl overflow-hidden border border-gray-200">
                          {/* Map embed */}
                          {getGoogleMapsEmbedUrl(vendor) && (
                            <div className="w-full h-48 sm:h-56">
                              <iframe
                                src={getGoogleMapsEmbedUrl(vendor)!}
                                className="w-full h-full border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Business location"
                              />
                            </div>
                          )}
                          <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-600 truncate">{fullAddress}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => copyAddress(fullAddress)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                              >
                                {copiedAddress ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                {copiedAddress ? 'Copied' : 'Copy'}
                              </button>
                              <a
                                href={getGoogleMapsUrl(vendor)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 flex items-center gap-1 font-medium"
                              >
                                <Navigation className="w-3 h-3" /> Get Directions
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== REVIEWS TAB ===== */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    {/* Review header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-secondary-500">Customer Reviews</h3>
                        {totalReviews > 0 && <p className="text-sm text-gray-400">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>}
                      </div>
                      {user && canReview && !showReviewForm && (
                        <button onClick={() => setShowReviewForm(true)} className="btn-primary text-sm flex items-center gap-2">
                          <Star className="w-4 h-4" /> Write a Review
                        </button>
                      )}
                    </div>

                    {user && !canReview && reviewWaitMessage && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{reviewWaitMessage}</span>
                      </div>
                    )}

                    {reviewMessage && (
                      <div className={`p-3 rounded-lg text-sm font-medium ${reviewMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {reviewMessage.text}
                      </div>
                    )}

                    {/* Review Form */}
                    {showReviewForm && (
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h4 className="font-semibold text-secondary-500 mb-3">How was your experience?</h4>
                        <div className="flex items-center gap-1 mb-4">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} type="button" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setReviewRating(star)} className="p-1 transition-transform hover:scale-110">
                              <Star className={`w-8 h-8 ${star <= (hoverRating || reviewRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} transition-colors`} />
                            </button>
                          ))}
                          {reviewRating > 0 && <span className="ml-2 text-sm text-gray-500">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][reviewRating]}</span>}
                        </div>
                        <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Tell others about your experience (optional)" className="input-field min-h-[80px] resize-y mb-4" rows={3} />
                        <div className="flex items-center gap-2">
                          <button onClick={handleSubmitReview} disabled={submittingReview || reviewRating === 0} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                            {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                          </button>
                          <button onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(''); }} className="btn-outline">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Rating summary */}
                    {totalReviews > 0 && (
                      <div className="flex items-center gap-6 p-5 bg-gray-50 rounded-xl">
                        <div className="text-center">
                          <p className="text-5xl font-bold text-secondary-500">{Number(avgRating).toFixed(1)}</p>
                          <div className="flex items-center gap-0.5 mt-1 justify-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    )}

                    {/* Reviews list */}
                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400">No reviews yet. Be the first to review!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map(review => (
                          <div key={review.id} className="p-5 bg-gray-50 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary-600">{getCustomerName(review).slice(0, 2).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-secondary-500 text-sm">{getCustomerName(review)}</span>
                                  {review.is_verified && <span className="inline-flex items-center gap-0.5 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                                  <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-0.5 mt-1">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                  ))}
                                </div>
                                {review.comment && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>}
                                {review.vendor_reply && (
                                  <div className="mt-3 bg-white rounded-lg p-3 border-l-3 border-primary-500">
                                    <p className="text-xs font-semibold text-secondary-500 mb-1">Business Response</p>
                                    <p className="text-sm text-gray-600">{review.vendor_reply}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== VENDOR TAB ===== */}
                {activeTab === 'vendor' && vendor && (
                  <div className="space-y-6">
                    {/* Vendor header */}
                    <div className="flex items-center gap-4">
                      {vendor.logo_url ? (
                        <Image src={vendor.logo_url} alt={vendor.business_name} width={64} height={64} className="rounded-2xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                          <Store className="w-8 h-8 text-primary-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-secondary-500">{vendor.business_name}</h3>
                        {vendor.category && <p className="text-sm text-gray-500 capitalize">{vendor.category.replace('-', ' & ')}</p>}
                        {totalReviews > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{Number(avgRating).toFixed(1)} ({totalReviews} reviews)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {vendor.description && (
                      <p className="text-gray-600 leading-relaxed">{vendor.description}</p>
                    )}

                    {/* Contact info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-secondary-500">Contact Information</h4>
                      {fullAddress && (
                        <a href={getGoogleMapsUrl(vendor)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{fullAddress}</span>
                          <Navigation className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                        </a>
                      )}
                      {vendor.phone && (
                        <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Phone className="w-5 h-5 text-primary-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{vendor.phone}</span>
                        </a>
                      )}
                      {vendor.email && (
                        <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Mail className="w-5 h-5 text-primary-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{vendor.email}</span>
                        </a>
                      )}
                      {vendor.website && (
                        <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Globe className="w-5 h-5 text-primary-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{vendor.website}</span>
                          <ExternalLink className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                        </a>
                      )}
                    </div>

                    {/* Business Hours */}
                    {hours && Object.keys(hours).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-secondary-500 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Business Hours
                        </h4>
                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                          {dayNames.map(day => {
                            const dayData = hours[day];
                            const isToday = day === today;
                            return (
                              <div key={day} className={`flex items-center justify-between px-4 py-2.5 text-sm ${isToday ? 'bg-primary-50 font-medium' : ''} ${day !== 'sunday' ? 'border-t border-gray-100' : ''}`}>
                                <span className={`capitalize ${isToday ? 'text-primary-700' : 'text-gray-700'}`}>
                                  {day}{isToday ? ' (Today)' : ''}
                                </span>
                                <span className={dayData?.closed ? 'text-red-500' : isToday ? 'text-primary-600' : 'text-gray-600'}>
                                  {dayData?.closed ? 'Closed' : dayData ? `${dayData.open} - ${dayData.close}` : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Social Links */}
                    {social && Object.values(social).some(Boolean) && (
                      <div>
                        <h4 className="font-semibold text-secondary-500 mb-3">Follow Us</h4>
                        <div className="flex flex-wrap gap-2">
                          {social.instagram && (
                            <a href={social.instagram.startsWith('http') ? social.instagram : `https://instagram.com/${social.instagram}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Instagram</a>
                          )}
                          {social.facebook && (
                            <a href={social.facebook.startsWith('http') ? social.facebook : `https://facebook.com/${social.facebook}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Facebook</a>
                          )}
                          {social.tiktok && (
                            <a href={social.tiktok.startsWith('http') ? social.tiktok : `https://tiktok.com/@${social.tiktok}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">TikTok</a>
                          )}
                          {social.twitter && (
                            <a href={social.twitter.startsWith('http') ? social.twitter : `https://x.com/${social.twitter}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">X / Twitter</a>
                          )}
                          {social.yelp && (
                            <a href={social.yelp} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Yelp</a>
                          )}
                          {social.google_business && (
                            <a href={social.google_business} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Google</a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ===== VENDOR'S OTHER DEALS ===== */}
            {vendorDeals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
                <h3 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary-500" /> More Deals from {vendor?.business_name}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {vendorDeals.map(vd => {
                    const vdIsSponti = vd.deal_type === 'sponti_coupon';
                    return (
                      <Link
                        key={vd.id}
                        href={`/deals/${vd.id}`}
                        className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group"
                      >
                        <div className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 ${vdIsSponti ? 'bg-primary-100' : 'bg-gray-100'}`}>
                          {vd.image_url ? (
                            <Image src={vd.image_url} alt={vd.title} width={80} height={80} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {vdIsSponti ? <SpontiIcon className="w-8 h-8 text-primary-300" /> : <Tag className="w-8 h-8 text-gray-300" />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <DealTypeBadge type={vd.deal_type as 'regular' | 'sponti_coupon'} size="sm" />
                          </div>
                          <p className="text-sm font-semibold text-secondary-500 truncate group-hover:text-primary-500 transition-colors">{vd.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400 line-through">{formatCurrency(vd.original_price)}</span>
                            <span className="text-sm font-bold text-primary-500">{formatCurrency(vd.deal_price)}</span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{formatPercentage(vd.discount_percentage)} OFF</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 mt-1 flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ===== SIDEBAR (1 col) ===== */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-6 space-y-4">
              {/* Price Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
                {/* Price */}
                <div className="text-center mb-5">
                  <div className="text-gray-400 line-through text-lg">{formatCurrency(deal.original_price)}</div>
                  <div className="text-4xl font-bold text-primary-500 my-1">{formatCurrency(deal.deal_price)}</div>
                  <div className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-bold text-lg px-4 py-1.5 rounded-full">
                    {formatPercentage(deal.discount_percentage)} OFF
                  </div>
                  <p className="text-xs text-gray-400 mt-2">You save {formatCurrency(deal.original_price - deal.deal_price)}</p>
                </div>

                {/* Deposit info */}
                {hasDeposit && (
                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-primary-700">Deposit: {formatCurrency(deal.deposit_amount ?? 0)}</p>
                    <p className="text-xs text-primary-600 mt-1">Paid directly to the business. Non-refundable if not redeemed.</p>
                  </div>
                )}

                {/* Claims progress */}
                {deal.max_claims && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-1.5">
                      <span>{deal.claims_count} claimed</span>
                      <span className="font-medium">{deal.max_claims - deal.claims_count} left</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          (deal.claims_count / deal.max_claims) > 0.8 ? 'bg-red-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
                      />
                    </div>
                    {(deal.claims_count / deal.max_claims) > 0.8 && (
                      <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Almost sold out!
                      </p>
                    )}
                  </div>
                )}

                {/* Claim Button */}
                {!isExpired && !isSoldOut && deal.status === 'active' && (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className={`w-full text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-lg ${
                      isSponti || hasDeposit
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/25'
                        : 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 shadow-secondary-500/25'
                    }`}
                  >
                    {claiming ? 'Processing...' : hasDeposit ? `Claim Deal — ${formatCurrency(deal.deposit_amount!)} Deposit` : 'Claim This Deal'}
                  </button>
                )}

                {isExpired && (
                  <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-xl font-semibold">This deal has expired</div>
                )}
                {isSoldOut && (
                  <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-xl font-semibold">This deal is sold out</div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mt-4">{error}</div>
                )}

                {/* Social proof */}
                {deal.claims_count > 0 && (
                  <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{deal.claims_count} people claimed this deal</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Deal at a Glance */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h4 className="text-sm font-semibold text-secondary-500 mb-3">Deal at a Glance</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <DealTypeBadge type={deal.deal_type} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-bold text-green-600">{formatPercentage(deal.discount_percentage)} OFF</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">You Save</span>
                    <span className="font-semibold text-secondary-500">{formatCurrency(deal.original_price - deal.deal_price)}</span>
                  </div>
                  {deal.max_claims && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Available</span>
                      <span className="font-semibold text-secondary-500">{deal.max_claims - deal.claims_count} of {deal.max_claims} left</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium text-gray-700">{new Date(deal.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {vendor?.category && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Category</span>
                      <span className="font-medium text-gray-700 capitalize">{vendor.category.replace('-', ' & ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Signals Card */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h4 className="text-sm font-semibold text-secondary-500 mb-3">Why you can trust this deal</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Verified business</span>
                  </div>
                  {totalReviews > 0 && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-500">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      <span>{Number(avgRating).toFixed(1)} stars from {totalReviews} reviews</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Secure QR redemption</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>Supporting local business</span>
                  </div>
                </div>
              </div>

              {/* Quick Contact */}
              {vendor && (vendor.phone || vendor.website) && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h4 className="text-sm font-semibold text-secondary-500 mb-3">Quick Contact</h4>
                  <div className="space-y-2">
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 font-medium">
                        <Phone className="w-4 h-4" /> {vendor.phone}
                      </a>
                    )}
                    {vendor.website && (
                      <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 font-medium">
                        <Globe className="w-4 h-4" /> Visit Website
                      </a>
                    )}
                    {fullAddress && (
                      <a href={getGoogleMapsUrl(vendor)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 font-medium">
                        <Navigation className="w-4 h-4" /> Get Directions
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== DISCLAIMER MODAL ===== */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-fade-up">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <h3 className="text-xl font-bold text-secondary-500">Confirm Your Claim</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                This deal expires in <strong>{getTimeRemainingText(deal.expires_at)}</strong>. The deposit of{' '}
                <strong>{formatCurrency(deal.deposit_amount!)}</strong> is non-refundable if not redeemed in time.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-secondary-500">{deal.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 line-through text-sm">{formatCurrency(deal.original_price)}</span>
                <span className="text-primary-500 font-bold">{formatCurrency(deal.deal_price)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDisclaimer(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={processClaim} disabled={claiming} className="btn-primary flex-1">
                {claiming ? 'Processing...' : `Pay ${formatCurrency(deal.deposit_amount!)} Deposit`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeRemainingText(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '0 minutes';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
