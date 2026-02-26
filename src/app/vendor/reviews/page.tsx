'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Star, MessageSquare, Send, Loader2, ChevronLeft, ChevronRight,
  Filter, ThumbsUp, CheckCircle2, Clock, TrendingUp,
  XCircle, ChevronDown, Sparkles,
} from 'lucide-react';
import type { Review, AutoResponseTone } from '@/lib/types/database';

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  avg_rating: number;
  total_reviews: number;
  distribution: Record<number, number>;
}

const TONE_LABELS: Record<AutoResponseTone, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  casual: 'Casual',
  grateful: 'Grateful',
  empathetic: 'Empathetic',
};

const TONE_LIST: AutoResponseTone[] = ['professional', 'friendly', 'casual', 'grateful', 'empathetic'];

export default function VendorReviewsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [cancellingAutoResponse, setCancellingAutoResponse] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<AutoResponseTone>('professional');
  const [toneDropdownOpen, setToneDropdownOpen] = useState<string | null>(null);
  const [generatingTone, setGeneratingTone] = useState(false);
  const autoRespondTriggered = useRef(false);

  const fetchReviews = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?vendor_id=${user.id}&page=${pageNum}&limit=10`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fire-and-forget: trigger auto-response processing on page load
  useEffect(() => {
    if (!user || autoRespondTriggered.current) return;
    autoRespondTriggered.current = true;
    fetch('/api/vendor/auto-respond', { method: 'POST' }).catch(() => {});
  }, [user]);

  useEffect(() => {
    fetchReviews(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, vendor_reply: replyText }),
      });

      if (res.ok) {
        const { review: updated } = await res.json();
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            reviews: prev.reviews.map(r => r.id === reviewId ? updated : r),
          };
        });
        setReplyingTo(null);
        setReplyText('');
      }
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Generate AI reply with a specific tone — uses useCallback so it's stable
  const generateWithTone = useCallback(async (newTone: AutoResponseTone, review: Review) => {
    setGeneratingTone(true);
    setReplyText(''); // Clear old text immediately so user sees change
    try {
      const res = await fetch('/api/vendor/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'review_reply',
          context: {
            rating: String(review.rating),
            review_text: review.comment || '',
            customer_name: review.customer?.first_name
              ? `${review.customer.first_name} ${review.customer.last_name || ''}`.trim()
              : review.customer?.email?.split('@')[0] || 'Customer',
          },
          tone: newTone,
        }),
      });
      if (res.ok) {
        const responseData = await res.json();
        if (responseData.text) {
          setReplyText(responseData.text);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setGeneratingTone(false);
    }
  }, []);

  // Cancel a scheduled auto-response
  const handleCancelAutoResponse = async (reviewId: string) => {
    setCancellingAutoResponse(reviewId);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: reviewId,
          vendor_reply: '',
        }),
      });
      if (res.ok) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            reviews: prev.reviews.map(r =>
              r.id === reviewId
                ? { ...r, auto_response_scheduled_at: null }
                : r
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to cancel auto-response:', err);
    } finally {
      setCancellingAutoResponse(null);
    }
  };

  const getAutoResponseCountdown = (review: Review): string | null => {
    if (!review.auto_response_scheduled_at || review.vendor_reply) return null;
    const scheduled = new Date(review.auto_response_scheduled_at).getTime();
    const elapsed = Date.now() - scheduled;
    const hoursElapsed = Math.floor(elapsed / (1000 * 60 * 60));
    if (hoursElapsed < 1) return 'Ava reply pending';
    return `Ava reply pending (${hoursElapsed}h ago)`;
  };

  const filteredReviews = data?.reviews.filter(r => !filter || r.rating === filter) || [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const getCustomerName = (review: Review) => {
    if (review.customer?.first_name) {
      return `${review.customer.first_name} ${review.customer.last_name || ''}`.trim();
    }
    if (review.customer?.email) {
      return review.customer.email.split('@')[0];
    }
    return 'Customer';
  };

  const getInitials = (review: Review) => {
    const name = getCustomerName(review);
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500 flex-shrink-0" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500">Reviews</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">Manage customer reviews and reputation</p>
        </div>
      </div>

      {/* Stats Cards — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Average Rating */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-1 mb-1 sm:mb-2">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-2xl sm:text-3xl font-bold text-secondary-500">
              {data?.avg_rating ? Number(data.avg_rating).toFixed(1) : '0.0'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">Average Rating</p>
        </div>

        {/* Total Reviews */}
        <div className="card p-4 sm:p-5">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mb-1 sm:mb-2" />
          <p className="text-2xl sm:text-3xl font-bold text-secondary-500">{data?.total_reviews || 0}</p>
          <p className="text-xs sm:text-sm text-gray-500">Total Reviews</p>
        </div>

        {/* Response Rate */}
        <div className="card p-4 sm:p-5">
          <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mb-1 sm:mb-2" />
          <p className="text-2xl sm:text-3xl font-bold text-secondary-500">
            {data?.reviews.length
              ? `${Math.round((data.reviews.filter(r => r.vendor_reply).length / data.reviews.length) * 100)}%`
              : '0%'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">Response Rate</p>
        </div>

        {/* 5-Star Reviews */}
        <div className="card p-4 sm:p-5">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 mb-1 sm:mb-2" />
          <p className="text-2xl sm:text-3xl font-bold text-secondary-500">
            {data?.distribution?.[5] || 0}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">5-Star Reviews</p>
        </div>
      </div>

      {/* Rating Distribution */}
      {data && data.total_reviews > 0 && (
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-bold text-secondary-500 mb-3 sm:mb-4">Rating Distribution</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = data.distribution?.[stars] || 0;
              const percentage = data.total_reviews > 0 ? (count / data.total_reviews) * 100 : 0;
              return (
                <button
                  key={stars}
                  onClick={() => setFilter(filter === stars ? null : stars)}
                  className={`flex items-center gap-2 sm:gap-3 w-full p-1.5 sm:p-2 rounded-lg transition-colors ${
                    filter === stars ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1 w-12 sm:w-20 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{stars}</span>
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stars >= 4 ? 'bg-green-400' : stars === 3 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 w-8 sm:w-12 text-right">{count}</span>
                </button>
              );
            })}
          </div>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-xs sm:text-sm text-primary-500 hover:underline mt-3 flex items-center gap-1"
            >
              <Filter className="w-3 h-3" /> Clear filter
            </button>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-500">
              {filter ? 'No reviews with this rating' : 'No reviews yet'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {filter ? 'Try a different filter' : 'Reviews will appear here when customers rate your deals'}
            </p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div key={review.id} className="card p-4 sm:p-6">
              {/* Review Header — stacks vertically on mobile */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-primary-600">{getInitials(review)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Name, verified, time — wraps on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="font-semibold text-secondary-500 text-sm sm:text-base">{getCustomerName(review)}</span>
                    <div className="flex items-center gap-2">
                      {review.is_verified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(review.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          star <= review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Deal reference */}
                  {review.deal && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      Deal: {review.deal.title}
                    </p>
                  )}

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm sm:text-base text-gray-700 mt-2 sm:mt-3 leading-relaxed">{review.comment}</p>
                  )}

                  {/* Auto-Response Pending Badge — stacks on mobile */}
                  {!review.vendor_reply && review.auto_response_scheduled_at && !review.auto_response_sent_at && (
                    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full flex-shrink-0 object-cover" />
                        {getAutoResponseCountdown(review) || 'Ava reply scheduled'}
                      </span>
                      <button
                        onClick={() => handleCancelAutoResponse(review.id)}
                        disabled={cancellingAutoResponse === review.id}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        {cancellingAutoResponse === review.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Cancel Ava Reply
                      </button>
                    </div>
                  )}

                  {/* Vendor Reply */}
                  {review.vendor_reply && (
                    <div className={`mt-3 sm:mt-4 rounded-lg p-3 sm:p-4 border-l-4 ${
                      review.is_auto_response
                        ? 'bg-purple-50 border-purple-400'
                        : 'bg-gray-50 border-primary-500'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <span className="text-sm font-semibold text-secondary-500">Your Reply</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {review.is_auto_response && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/ava.png" alt="Ava" className="w-3 h-3 rounded-full object-cover" />
                              Ava Auto-Reply{review.auto_response_tone ? ` · ${TONE_LABELS[review.auto_response_tone as AutoResponseTone] || review.auto_response_tone}` : ''}
                            </span>
                          )}
                          {review.vendor_replied_at && (
                            <span className="text-xs text-gray-400">{timeAgo(review.vendor_replied_at)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.vendor_reply}</p>
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingTo === review.id ? (
                    <div className="mt-3 sm:mt-4">
                      {/* Label + AI controls — stacks vertically on mobile */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                        <span className="text-xs font-medium text-gray-500">Your reply</span>
                        {/* AI tone + generate buttons — always horizontal */}
                        <div className="flex items-center gap-2">
                          {/* Tone Selector */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setToneDropdownOpen(toneDropdownOpen === review.id ? null : review.id)}
                              disabled={generatingTone}
                              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border border-purple-200 ${
                                generatingTone
                                  ? 'bg-purple-100 text-purple-400 cursor-wait'
                                  : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                              }`}
                            >
                              {generatingTone ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              <span className="hidden sm:inline">
                                {generatingTone ? 'Rewriting...' : TONE_LABELS[selectedTone]}
                              </span>
                              <span className="sm:hidden">
                                {generatingTone ? '...' : TONE_LABELS[selectedTone]}
                              </span>
                              {!generatingTone && <ChevronDown className="w-3 h-3" />}
                            </button>
                            {toneDropdownOpen === review.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px] sm:min-w-[160px]">
                                {TONE_LIST.map(toneOption => (
                                  <button
                                    key={toneOption}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTone(toneOption);
                                      setToneDropdownOpen(null);
                                      // Always regenerate with the new tone
                                      generateWithTone(toneOption, review);
                                    }}
                                    className={`w-full text-left px-3 py-2 sm:py-1.5 text-xs transition-colors ${
                                      selectedTone === toneOption
                                        ? 'bg-purple-50 text-purple-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    {TONE_LABELS[toneOption]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* AI Generate Button */}
                          <button
                            type="button"
                            onClick={() => generateWithTone(selectedTone, review)}
                            disabled={generatingTone}
                            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                              generatingTone
                                ? 'bg-purple-100 text-purple-400 cursor-wait'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:shadow-md hover:shadow-purple-200/50 active:scale-95'
                            }`}
                          >
                            {generatingTone ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full object-cover" />
                            )}
                            <span className="hidden sm:inline">{generatingTone ? 'Writing...' : 'Ava Reply'}</span>
                            <span className="sm:hidden">{generatingTone ? '...' : 'Ava'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={generatingTone ? 'Ava is writing a reply...' : 'Write a thoughtful reply...'}
                        className="input-field min-h-[80px] resize-y text-sm w-full"
                        rows={3}
                        autoFocus
                        disabled={generatingTone}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleReply(review.id)}
                          disabled={submittingReply || !replyText.trim() || generatingTone}
                          className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2"
                        >
                          {submittingReply ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          {submittingReply ? 'Sending...' : 'Send Reply'}
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          className="btn-outline text-xs sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    !review.vendor_reply && (
                      <button
                        onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                        className="mt-3 text-sm text-primary-500 hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" /> Reply
                      </button>
                    )
                  )}

                  {/* Edit existing reply */}
                  {review.vendor_reply && replyingTo !== review.id && (
                    <button
                      onClick={() => { setReplyingTo(review.id); setReplyText(review.vendor_reply || ''); }}
                      className="mt-2 text-xs text-gray-400 hover:text-primary-500"
                    >
                      Edit reply
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline flex items-center gap-1 text-xs sm:text-sm disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <span className="text-xs sm:text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-outline flex items-center gap-1 text-xs sm:text-sm disabled:opacity-50"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
