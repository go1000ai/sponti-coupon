'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import {
  MapPin, Clock, Tag, AlertTriangle, ArrowLeft, Store, Shield, Eye, Users,
  Star, MessageSquare, Send, Loader2, CheckCircle2,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import Link from 'next/link';
import { DealImageGallery } from '@/components/deals/DealImageGallery';
import type { Deal, Review } from '@/lib/types/database';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [error, setError] = useState('');

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
      setLoading(false);
    }
    fetchDeal();
  }, [params.id]);

  // Fetch reviews when deal loads
  useEffect(() => {
    if (!deal?.vendor_id) return;
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.vendor_id]);

  // Check if user can review
  useEffect(() => {
    if (!user || !deal) return;
    checkCanReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, deal]);

  const fetchReviews = async () => {
    if (!deal?.vendor_id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?vendor_id=${deal.vendor_id}&limit=5`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setAvgRating(data.avg_rating || 0);
      setTotalReviews(data.total_reviews || 0);
    } catch {
      // Reviews are non-critical
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user || !deal) return;
    try {
      // Check review eligibility via dedicated endpoint
      const eligRes = await fetch(`/api/reviews/eligibility?vendor_id=${deal.vendor_id}&deal_id=${deal.id}`);
      if (eligRes.ok) {
        const eligData = await eligRes.json();
        if (eligData.has_reviewed) {
          setCanReview(false);
          setReviewWaitMessage(null);
          return;
        }
        if (eligData.can_review) {
          setCanReview(true);
          setReviewWaitMessage(null);
          return;
        }
        if (eligData.wait_hours !== undefined && eligData.wait_hours !== null) {
          setCanReview(false);
          const hoursLeft = Math.ceil(eligData.wait_hours);
          setReviewWaitMessage(
            hoursLeft <= 1
              ? 'You can leave a review in less than 1 hour'
              : `You can leave a review in about ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`
          );
          return;
        }
        // Default: no redeemed claim
        setCanReview(false);
        setReviewWaitMessage(null);
      }
    } catch {
      // Non-critical
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !deal || reviewRating === 0) return;
    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: deal.vendor_id,
          deal_id: deal.id,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReviewMessage({ type: 'success', text: 'Thank you for your review!' });
        setShowReviewForm(false);
        setCanReview(false);
        setReviewWaitMessage(null);
        setReviewRating(0);
        setReviewComment('');
        // Refresh reviews
        fetchReviews();
      } else {
        if (data.code === 'REVIEW_TOO_EARLY') {
          setReviewMessage({ type: 'error', text: data.error });
          setShowReviewForm(false);
          setCanReview(false);
          // Re-check to get accurate countdown
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
    if (!user) {
      router.push(`/auth/login?redirect=/deals/${params.id}`);
      return;
    }

    if (deal?.deal_type === 'sponti_coupon') {
      setShowDisclaimer(true);
      return;
    }

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

      if (!response.ok) {
        setError(data.error);
        setClaiming(false);
        return;
      }

      // For Sponti Coupons, redirect to vendor payment
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      // For regular deals, go to my deals with QR
      router.push('/my-deals');
    } catch {
      setError('Failed to claim deal. Please try again.');
    }

    setClaiming(false);
    setShowDisclaimer(false);
  };

  const getCustomerName = (review: Review) => {
    if (review.customer?.first_name) {
      return `${review.customer.first_name} ${(review.customer.last_name || '').charAt(0)}.`;
    }
    if (review.customer?.email) {
      const name = review.customer.email.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
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
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
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
  const isExpired = new Date(deal.expires_at) < new Date();
  const isSoldOut = deal.max_claims ? deal.claims_count >= deal.max_claims : false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/deals" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Main Content */}
        <div className="md:col-span-3">
          {/* Image Gallery / Banner */}
          <div className={`rounded-2xl overflow-hidden ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
            <DealImageGallery
              mainImage={deal.image_url}
              images={deal.image_urls || []}
              title={deal.title}
              fallback={
                isSponti ? (
                  <SpontiIcon className="w-24 h-24 text-white/20" />
                ) : (
                  <Tag className="w-24 h-24 text-white/20" />
                )
              }
            />
          </div>

          {/* Deal Type Badge */}
          <div className="flex items-center gap-3 mt-6">
            <DealTypeBadge type={deal.deal_type} size="lg" />
            <span className={`text-sm font-bold ${isSponti ? 'text-primary-500' : 'text-secondary-500'}`}>
              {isSponti ? 'Sponti' : 'Steady Deal'}
            </span>
            {isExpired && (
              <span className="bg-red-100 text-red-600 text-sm font-bold px-4 py-1.5 rounded-full">EXPIRED</span>
            )}
            {isSoldOut && (
              <span className="bg-gray-100 text-gray-600 text-sm font-bold px-4 py-1.5 rounded-full">SOLD OUT</span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-secondary-500 mt-4">{deal.title}</h1>

          {deal.vendor && (
            <div className="flex items-center gap-2 mt-3 text-gray-500">
              <Store className="w-4 h-4" />
              <span className="font-medium">{deal.vendor.business_name}</span>
              {/* Vendor rating inline */}
              {totalReviews > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-sm text-gray-400">({totalReviews})</span>
                  </div>
                </>
              )}
              {deal.vendor.city && (
                <>
                  <span className="text-gray-300">|</span>
                  <MapPin className="w-4 h-4" />
                  <span>{deal.vendor.city}, {deal.vendor.state}</span>
                </>
              )}
            </div>
          )}

          {deal.description && (
            <p className="text-gray-600 mt-4 leading-relaxed">{deal.description}</p>
          )}

          {/* Countdown */}
          {!isExpired && isSponti && (
            <div className="mt-8 bg-secondary-500 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary-400" />
                <span className="font-semibold">Deal expires in:</span>
              </div>
              <CountdownTimer expiresAt={deal.expires_at} size="lg" />
            </div>
          )}

          {/* ===== REVIEWS SECTION ===== */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-secondary-500">Customer Reviews</h2>
                {totalReviews > 0 && (
                  <span className="text-sm text-gray-400">({totalReviews})</span>
                )}
              </div>
              {user && canReview && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Star className="w-4 h-4" /> Write a Review
                </button>
              )}
              {user && !canReview && reviewWaitMessage && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{reviewWaitMessage}</span>
                </div>
              )}
            </div>

            {/* Review Message */}
            {reviewMessage && (
              <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                reviewMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {reviewMessage.text}
              </div>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-secondary-500 mb-3">How was your experience?</h3>

                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || reviewRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      {reviewRating === 5 ? 'Excellent!' : reviewRating === 4 ? 'Great' : reviewRating === 3 ? 'Good' : reviewRating === 2 ? 'Fair' : 'Poor'}
                    </span>
                  )}
                </div>

                {/* Comment */}
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell others about your experience (optional)"
                  className="input-field min-h-[80px] resize-y mb-4"
                  rows={3}
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || reviewRating === 0}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(''); }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Average Rating Display */}
            {totalReviews > 0 && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-4xl font-bold text-secondary-500">{Number(avgRating).toFixed(1)}</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(avgRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="card p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-600">
                          {getCustomerName(review).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-secondary-500 text-sm">{getCustomerName(review)}</span>
                          {review.is_verified && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
                        )}
                        {/* Vendor reply */}
                        {review.vendor_reply && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 border-l-3 border-primary-500">
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
        </div>

        {/* Sidebar */}
        <div className="md:col-span-2">
          <div className="card p-6 sticky top-24">
            {/* Price */}
            <div className="text-center mb-6">
              <div className="text-gray-400 line-through text-lg">{formatCurrency(deal.original_price)}</div>
              <div className="text-4xl font-bold text-primary-500">{formatCurrency(deal.deal_price)}</div>
              <div className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-bold text-lg px-3 py-1 rounded-full mt-2">
                {formatPercentage(deal.discount_percentage)} OFF
              </div>
            </div>

            {/* Deposit info for Sponti */}
            {isSponti && deal.deposit_amount && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-primary-700">
                  Deposit Required: {formatCurrency(deal.deposit_amount)}
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  Paid directly to the business. Non-refundable if not redeemed.
                </p>
              </div>
            )}

            {/* Claims progress */}
            {deal.max_claims && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{deal.claims_count} claimed</span>
                  <span>{deal.max_claims - deal.claims_count} left</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: `${(deal.claims_count / deal.max_claims) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Claim Button */}
            {!isExpired && !isSoldOut && deal.status === 'active' && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-primary w-full text-lg py-4"
              >
                {claiming ? 'Processing...' : isSponti ? `Claim Deal — ${formatCurrency(deal.deposit_amount!)} Deposit` : 'Claim This Deal'}
              </button>
            )}

            {isExpired && (
              <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-lg font-semibold">
                This deal has expired
              </div>
            )}

            {isSoldOut && (
              <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-lg font-semibold">
                This deal is sold out
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mt-4">
                {error}
              </div>
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

            {/* Trust signals */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Verified business</span>
              </div>
              {totalReviews > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{Number(avgRating).toFixed(1)} stars from {totalReviews} reviews</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure QR redemption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <h3 className="text-xl font-bold text-secondary-500">Confirm Your Claim</h3>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                This deal expires in <strong>{getTimeRemainingText(deal.expires_at)}</strong>. The deposit of{' '}
                <strong>{formatCurrency(deal.deposit_amount!)}</strong> is non-refundable if not redeemed in time.
                By proceeding you agree to these terms.
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
              <button
                onClick={() => setShowDisclaimer(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={processClaim}
                disabled={claiming}
                className="btn-primary flex-1"
              >
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
