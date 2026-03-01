'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import {
  MapPin, Clock, Tag, AlertTriangle, ArrowLeft, Store, Shield, Users,
  Star, MessageSquare, Send, Loader2, CheckCircle2, Globe, Phone, Mail,
  ExternalLink, ChevronRight, Sparkles, Zap, Info,
  Wifi, Car, PawPrint, Coffee, UtensilsCrossed, Music,
  Navigation, Copy, Check, Calendar,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import Link from 'next/link';
import Image from 'next/image';
import { DealImageGallery } from '@/components/deals/DealImageGallery';
import type { Deal, DealVariant, Review, BusinessHours, VendorSocialLinks } from '@/lib/types/database';
import { PAYMENT_PROCESSORS } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';

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

interface SimilarDeal extends VendorDeal {
  vendor?: {
    business_name: string;
    logo_url: string | null;
    city: string | null;
    state: string | null;
  };
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [vendorDeals, setVendorDeals] = useState<VendorDeal[]>([]);
  const [similarDeals, setSimilarDeals] = useState<SimilarDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [error, setError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<{ processor_type: string; display_name: string | null; payment_tier: string }[]>([]);
  const [hasStripeConnect, setHasStripeConnect] = useState(false);
  const [activeTab, setActiveTab] = useState<'vendor' | 'details' | 'payments' | 'reviews'>('vendor');
  const [selectedVariant, setSelectedVariant] = useState<DealVariant | null>(null);

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
      setSimilarDeals(data.similar_deals || []);
      setLoading(false);
    }
    fetchDeal();
  }, [params.id]);

  useEffect(() => {
    if (!deal?.vendor_id) return;
    fetchReviews();
    // Fetch vendor's payment methods + Stripe Connect status
    async function fetchPaymentMethods() {
      try {
        const res = await fetch(`/api/deals/${deal!.id}/payment-methods`);
        if (res.ok) {
          const data = await res.json();
          setPaymentMethods(data.methods || []);
          setHasStripeConnect(data.has_stripe_connect || false);
        }
      } catch { /* silent */ }
    }
    fetchPaymentMethods();
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

  const isOwnDeal = !!user && !!deal && deal.vendor_id === user.id;

  const handleClaim = async () => {
    if (!user) { router.push(`/auth/login?redirect=/deals/${params.id}`); return; }
    if (isOwnDeal) { setError('You cannot claim your own deal'); return; }
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

  const [showDirections, setShowDirections] = useState(false);

  const getGoogleMapsUrl = (vendor: Deal['vendor']) => {
    if (!vendor) return '';
    const query = encodeURIComponent(`${vendor.address || ''}, ${vendor.city || ''}, ${vendor.state || ''} ${vendor.zip || ''}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  };

  const getWazeUrl = (vendor: Deal['vendor']) => {
    if (!vendor) return '';
    if (vendor.lat && vendor.lng) return `https://waze.com/ul?ll=${vendor.lat},${vendor.lng}&navigate=yes`;
    const query = encodeURIComponent(`${vendor.address || ''}, ${vendor.city || ''}, ${vendor.state || ''} ${vendor.zip || ''}`);
    return `https://waze.com/ul?q=${query}&navigate=yes`;
  };

  const getAppleMapsUrl = (vendor: Deal['vendor']) => {
    if (!vendor) return '';
    if (vendor.lat && vendor.lng) return `https://maps.apple.com/?daddr=${vendor.lat},${vendor.lng}&dirflg=d`;
    const query = encodeURIComponent(`${vendor.address || ''}, ${vendor.city || ''}, ${vendor.state || ''} ${vendor.zip || ''}`);
    return `https://maps.apple.com/?daddr=${query}&dirflg=d`;
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
  // Effective pricing — respects selectedVariant
  const effectiveOriginalPrice = selectedVariant ? selectedVariant.original_price : deal.original_price;
  const effectiveDealPrice = selectedVariant ? selectedVariant.price : deal.deal_price;
  const effectiveDiscount = ((effectiveOriginalPrice - effectiveDealPrice) / effectiveOriginalPrice) * 100;
  const effectiveDeposit = selectedVariant?.deposit_amount ?? deal.deposit_amount;
  const hasDeposit = effectiveDeposit != null && effectiveDeposit > 0;
  const effectiveMaxClaims = selectedVariant?.max_claims ?? deal.max_claims;
  const effectiveClaimsCount = selectedVariant?.claims_count ?? deal.claims_count;
  const isExpired = new Date(deal.expires_at) < new Date();
  const isSoldOut = effectiveMaxClaims ? effectiveClaimsCount >= effectiveMaxClaims : false;
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ===== TOP: Image + Deal Info (Groupon-style) ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 lg:pt-6">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-4 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>

        <div className="grid lg:grid-cols-2 gap-4 lg:gap-8 items-start overflow-hidden">
          {/* ===== LEFT: Image Gallery + Below-Image Content ===== */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              <DealImageGallery
                mainImage={selectedVariant?.image_url || deal.image_url}
                images={deal.image_urls || []}
                videoUrls={deal.video_urls || []}
                title={selectedVariant ? `${deal.title} — ${selectedVariant.name}` : deal.title}
                fallback={
                  <div className={`w-full aspect-[4/3] flex items-center justify-center ${isSponti ? 'bg-gradient-to-br from-primary-500 via-primary-600 to-orange-700' : 'bg-gradient-to-br from-secondary-400 via-secondary-500 to-secondary-700'}`}>
                    {isSponti ? <SpontiIcon className="w-24 h-24 text-white/20" /> : <Tag className="w-24 h-24 text-white/20" />}
                  </div>
                }
              />
            </div>

            {/* ===== BELOW IMAGE: Deal Variant Options ===== */}
            {deal.variants && deal.variants.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Choose an option</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deal.variants.map((v: DealVariant) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const discount = ((v.original_price - v.price) / v.original_price) * 100;
                    const soldOut = v.max_claims != null && v.claims_count >= v.max_claims;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(isSelected ? null : v)}
                        disabled={soldOut}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          soldOut
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : isSelected
                              ? 'border-primary-500 bg-primary-50 shadow-sm'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {v.image_url && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>{v.name}</span>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            {v.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{v.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(v.original_price)}</span>
                          <span className="text-sm font-bold text-primary-500">{formatCurrency(v.price)}</span>
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{formatPercentage(discount)} OFF</span>
                        </div>
                        {soldOut && <p className="text-[10px] text-red-500 font-medium mt-1">Sold out</p>}
                        {!soldOut && v.max_claims != null && (
                          <p className="text-[10px] text-gray-400 mt-1">{v.max_claims - v.claims_count} left</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT: Deal Info Panel (sticky) ===== */}
          <div className="lg:sticky lg:top-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-6 space-y-4 animate-fade-up min-w-0 overflow-hidden">
            {/* Badges row */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight break-words">{deal.title}</h1>

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
                    <p className="font-semibold text-gray-900">{vendor.business_name}</p>
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

              {/* Description (truncated) */}
              {deal.description && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{deal.description}</p>
              )}

              {/* Highlights */}
              {deal.highlights && deal.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {deal.highlights.slice(0, 3).map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-200 font-medium">
                      <Sparkles className="w-3 h-3" /> {h}
                    </span>
                  ))}
                </div>
              )}

              {/* Appointment badge */}
              {deal.requires_appointment && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-blue-800">Appointment Required</p>
                </div>
              )}

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* Price block */}
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-gray-400 line-through text-lg">{formatCurrency(effectiveOriginalPrice)}</span>
                  <span className="text-4xl font-bold text-primary-500">{formatCurrency(effectiveDealPrice)}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-bold text-sm px-3 py-1 rounded-full">
                    {formatPercentage(effectiveDiscount)} OFF
                  </span>
                  <span className="text-sm text-gray-400">You save {formatCurrency(effectiveOriginalPrice - effectiveDealPrice)}</span>
                </div>
              </div>

              {/* Deposit info */}
              {hasDeposit && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-primary-700">Deposit: {formatCurrency(effectiveDeposit ?? 0)}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{isSponti ? 'Paid directly to the business. Non-refundable if not redeemed.' : 'Paid directly to the business. Converts to vendor credit if not redeemed.'}</p>
                </div>
              )}

              {/* Countdown timer */}
              {!isExpired && isSponti && (
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">Deal expires in:</span>
                  </div>
                  <CountdownTimer expiresAt={deal.expires_at} size="lg" variant="sponti" />
                </div>
              )}

              {/* Claims progress */}
              {effectiveMaxClaims && (
                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1.5">
                    <span>{effectiveClaimsCount} claimed</span>
                    <span className="font-medium">{effectiveMaxClaims - effectiveClaimsCount} left</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        (effectiveClaimsCount / effectiveMaxClaims) > 0.8 ? 'bg-red-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min((effectiveClaimsCount / effectiveMaxClaims) * 100, 100)}%` }}
                    />
                  </div>
                  {(effectiveClaimsCount / effectiveMaxClaims) > 0.8 && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Almost sold out!
                    </p>
                  )}
                </div>
              )}

              {/* Claim Button */}
              {!isExpired && !isSoldOut && deal.status === 'active' && (
                isOwnDeal ? (
                  <div className="w-full text-lg py-4 rounded-xl font-bold text-center text-secondary-400 bg-secondary-100">
                    This is your deal
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className={`w-full text-lg py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-lg ${
                      isSponti || hasDeposit
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/25'
                        : 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 shadow-secondary-500/25'
                    }`}
                  >
                    {claiming ? 'Processing...' : hasDeposit ? `Claim Deal — ${formatCurrency(effectiveDeposit!)} Deposit` : 'Claim This Deal'}
                  </button>
                )
              )}

              {isExpired && (
                <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-xl font-semibold">This deal has expired</div>
              )}
              {isSoldOut && (
                <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-xl font-semibold">This deal is sold out</div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>
              )}

              {/* Trust signals — competitive advantage over Groupon */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-green-500" /> Verified Business
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-green-500" /> Direct Payments
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-green-500" /> Secure QR Code
                </span>
                {deal.claims_count > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> {deal.claims_count} claimed
                  </span>
                )}
              </div>

              {/* Payment logos */}
              {(hasStripeConnect || paymentMethods.length > 0) && (
                <button
                  onClick={() => {
                    setActiveTab('payments');
                    document.getElementById('deal-tabs')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <span>Payments accepted:</span>
                  <div className="flex items-center gap-1">
                    {hasStripeConnect && (
                      <Image src="/logos/stripe.svg" alt="Stripe" width={14} height={14} className="object-contain" />
                    )}
                    {paymentMethods.slice(0, 4).map(m => {
                      const proc = PAYMENT_PROCESSORS[m.processor_type as PaymentProcessorType];
                      return proc ? (
                        <Image key={m.processor_type} src={proc.logo} alt={proc.name} width={14} height={14} className="object-contain" />
                      ) : null;
                    })}
                  </div>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

      {/* ===== TABS & MORE DEALS ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* ===== TAB NAVIGATION ===== */}
            <div id="deal-tabs" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {(['vendor', 'details', 'payments', 'reviews'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-0 px-3 py-3.5 text-xs sm:text-sm font-semibold transition-colors relative whitespace-nowrap ${
                      activeTab === tab ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'vendor' && 'About'}
                    {tab === 'details' && 'Nitty Gritty'}
                    {tab === 'payments' && 'Payments'}
                    {tab === 'reviews' && `Reviews (${totalReviews})`}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                {/* ===== DETAILS TAB ===== */}
                {activeTab === 'details' && (
                  <div className="space-y-5">
                    {/* How It Works */}
                    <div className="border border-gray-200 rounded-2xl p-5 sm:p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary-500" /> How It Works
                      </h3>

                      {/* Vendor's custom instructions */}
                      {deal.how_it_works && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{deal.how_it_works}</p>
                        </div>
                      )}

                      {/* Step-by-step flow */}
                      <ol className="space-y-4">
                        {[
                          { title: 'Claim this deal', desc: hasDeposit ? `Pay the ${formatCurrency(deal.deposit_amount!)} deposit to secure your spot` : 'Click the claim button — no payment required' },
                          { title: 'Get your code', desc: 'A unique QR code and 6-digit code will appear in your "My Coupons" dashboard' },
                          deal.requires_appointment
                            ? { title: `Book with ${vendor?.business_name || 'the business'}`, desc: 'Schedule your appointment before the deal expires — the appointment itself can be after expiration' }
                            : { title: `Visit ${vendor?.business_name || 'the business'}`, desc: 'Head there before the deal expires' },
                          { title: 'Show your code', desc: `Show your QR code or give the 6-digit code to the staff — you save ${formatPercentage(deal.discount_percentage)}!` },
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</div>
                            <div className="pt-1">
                              <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Terms & Conditions */}
                    {deal.terms_and_conditions && (
                      <div className="border border-gray-200 rounded-2xl p-5 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary-500" /> Terms & Conditions
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{deal.terms_and_conditions}</p>
                      </div>
                    )}

                    {/* Fine Print */}
                    {deal.fine_print && (
                      <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-5 sm:p-6">
                        <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" /> Fine Print
                        </h3>
                        <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-line">{deal.fine_print}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== PAYMENTS TAB ===== */}
                {activeTab === 'payments' && (
                  <div className="space-y-6">
                    {/* Trust banner */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-800 text-sm">100% Direct Payments</p>
                          <p className="text-xs text-green-600 mt-0.5">SpontiCoupon never holds or touches your money. Every payment goes straight to the business.</p>
                        </div>
                      </div>
                    </div>

                    {/* Deposit / Online Payments */}
                    {(hasStripeConnect || paymentMethods.some(m => m.payment_tier === 'link' || m.payment_tier === 'integrated')) && (
                      <div className="border border-gray-200 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Online Checkout</h3>
                        <p className="text-xs text-gray-400 mb-4">Secure payment for deposits and purchases</p>
                        <div className="flex flex-wrap gap-3">
                          {hasStripeConnect && (
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <Image src="/logos/stripe.svg" alt="Stripe" width={48} height={20} className="object-contain" />
                              <div>
                                <p className="text-xs font-semibold text-gray-700">Stripe</p>
                                <p className="text-[10px] text-gray-400">Integrated checkout</p>
                              </div>
                            </div>
                          )}
                          {paymentMethods
                            .filter(m => m.payment_tier === 'link' || m.payment_tier === 'integrated')
                            .filter(m => !(hasStripeConnect && m.processor_type === 'stripe'))
                            .map(m => {
                              const proc = PAYMENT_PROCESSORS[m.processor_type as PaymentProcessorType];
                              if (!proc) return null;
                              return (
                                <div key={m.processor_type} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                  <Image src={proc.logo} alt={proc.name} width={32} height={32} className="object-contain" />
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700">{proc.name}</p>
                                    <p className="text-[10px] text-gray-400">Payment link</p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* At-Location Payments */}
                    {paymentMethods.some(m => m.payment_tier === 'manual') && (
                      <div className="border border-gray-200 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Accepted at Location</h3>
                        <p className="text-xs text-gray-400 mb-4">Pay any remaining balance in person</p>
                        <div className="flex flex-wrap gap-3">
                          {paymentMethods
                            .filter(m => m.payment_tier === 'manual')
                            .map(m => {
                              const proc = PAYMENT_PROCESSORS[m.processor_type as PaymentProcessorType];
                              if (!proc) return null;
                              return (
                                <div key={m.processor_type} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                  <Image src={proc.logo} alt={proc.name} width={32} height={32} className="object-contain" />
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700">{proc.name}</p>
                                    {m.display_name && <p className="text-[10px] text-gray-400">{m.display_name}</p>}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!hasStripeConnect && paymentMethods.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Shield className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Payment information not yet configured by vendor.</p>
                        <p className="text-xs text-gray-300 mt-1">Contact the business directly for payment details.</p>
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
                        <h3 className="text-lg font-bold text-gray-900">Customer Reviews</h3>
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
                        <h4 className="font-semibold text-gray-900 mb-3">How was your experience?</h4>
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
                          <p className="text-5xl font-bold text-gray-900">{Number(avgRating).toFixed(1)}</p>
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
                                  <span className="font-medium text-gray-900 text-sm">{getCustomerName(review)}</span>
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
                                    <p className="text-xs font-semibold text-gray-900 mb-1">Business Response</p>
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
                        <h3 className="text-xl font-bold text-gray-900">{vendor.business_name}</h3>
                        {vendor.category && <p className="text-sm text-gray-500 capitalize">{vendor.category.replace('-', ' & ')}</p>}
                        {totalReviews > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{Number(avgRating).toFixed(1)} ({totalReviews} reviews)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* About the Business */}
                    {vendor.description && (
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary-500" /> About {vendor.business_name}
                        </h4>
                        <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{vendor.description}</p>
                      </div>
                    )}

                    {/* Amenities */}
                    {deal.amenities && deal.amenities.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary-500" /> Features & Perks
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {deal.amenities.map((amenity: string, i: number) => {
                            const Icon = getAmenityIcon(amenity);
                            return (
                              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                                <Icon className="w-4 h-4 text-primary-500" />
                                {amenity}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Location & Map */}
                    {fullAddress && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary-500" /> Location
                        </h4>
                        {getGoogleMapsEmbedUrl(vendor) && (
                          <div className="rounded-xl overflow-hidden mb-3 border border-gray-100">
                            <iframe
                              src={getGoogleMapsEmbedUrl(vendor)!}
                              width="100%"
                              height="200"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              className="w-full"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{fullAddress}</span>
                          </div>
                          <button
                            onClick={() => copyAddress(fullAddress)}
                            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                            title="Copy address"
                          >
                            {copiedAddress ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                          </button>
                        </div>
                        <div className="mt-3 relative">
                          <button
                            type="button"
                            onClick={() => setShowDirections(prev => !prev)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors shadow-sm"
                          >
                            <Navigation className="w-4 h-4" /> Get Directions
                          </button>
                          {showDirections && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowDirections(false)} />
                              <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-56">
                                <a href={getGoogleMapsUrl(vendor)} target="_blank" rel="noopener noreferrer" onClick={() => setShowDirections(false)}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                  </span>
                                  <span className="text-sm font-medium text-gray-700">Google Maps</span>
                                </a>
                                <a href={getAppleMapsUrl(vendor)} target="_blank" rel="noopener noreferrer" onClick={() => setShowDirections(false)}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-100">
                                  <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Navigation className="w-4 h-4 text-gray-700" />
                                  </span>
                                  <span className="text-sm font-medium text-gray-700">Apple Maps</span>
                                </a>
                                <a href={getWazeUrl(vendor)} target="_blank" rel="noopener noreferrer" onClick={() => setShowDirections(false)}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-100">
                                  <span className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                                    <Navigation className="w-4 h-4 text-cyan-600" />
                                  </span>
                                  <span className="text-sm font-medium text-gray-700">Waze</span>
                                </a>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact info */}
                    {(vendor.phone || vendor.email || vendor.website) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Contact Information</h4>
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
                    )}

                    {/* Business Hours */}
                    {hours && Object.keys(hours).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                        <h4 className="font-semibold text-gray-900 mb-3">Follow Us</h4>
                        <div className="flex flex-wrap gap-2">
                          {social.instagram && (
                            <a href={social.instagram.startsWith('http') ? social.instagram : `https://instagram.com/${social.instagram}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Instagram</a>
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-500 transition-colors">{vd.title}</p>
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

            {/* ===== SIMILAR DEALS FROM OTHER VENDORS ===== */}
            {similarDeals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-500" /> Similar Deals You Might Like
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {similarDeals.map(sd => {
                    const sdIsSponti = sd.deal_type === 'sponti_coupon';
                    return (
                      <Link
                        key={sd.id}
                        href={`/deals/${sd.id}`}
                        className="rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group overflow-hidden"
                      >
                        <div className={`w-full aspect-[3/2] overflow-hidden ${sdIsSponti ? 'bg-primary-100' : 'bg-gray-100'}`}>
                          {sd.image_url ? (
                            <Image src={sd.image_url} alt={sd.title} width={300} height={200} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {sdIsSponti ? <SpontiIcon className="w-10 h-10 text-primary-300" /> : <Tag className="w-10 h-10 text-gray-300" />}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <DealTypeBadge type={sd.deal_type as 'regular' | 'sponti_coupon'} size="sm" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-500 transition-colors">{sd.title}</p>
                          {sd.vendor && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              {sd.vendor.business_name}{sd.vendor.city ? ` · ${sd.vendor.city}, ${sd.vendor.state}` : ''}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400 line-through">{formatCurrency(sd.original_price)}</span>
                            <span className="text-sm font-bold text-primary-500">{formatCurrency(sd.deal_price)}</span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{formatPercentage(sd.discount_percentage)} OFF</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
      </div>

      {/* ===== DISCLAIMER MODAL ===== */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-fade-up">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <h3 className="text-xl font-bold text-gray-900">Confirm Your Claim</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                This deal expires in <strong>{getTimeRemainingText(deal.expires_at)}</strong>.
              </p>
              {isSponti ? (
                <p className="text-sm text-amber-800 mt-2">
                  The deposit of <strong>{formatCurrency(deal.deposit_amount!)}</strong> is <strong>non-refundable</strong> if not redeemed before expiration. Sponti deals are time-sensitive flash offers — act fast!
                </p>
              ) : (
                <p className="text-sm text-amber-800 mt-2">
                  If not redeemed before expiration, your deposit of <strong>{formatCurrency(deal.deposit_amount!)}</strong> will be converted to a <strong>credit</strong> with {vendor?.business_name || 'this business'} — your money is never lost.
                </p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900">{deal.title}</p>
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
