'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  MessageSquare,
  Search,
  Filter,
  Star,
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Reply,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

interface ReviewRow {
  id: string;
  vendor_id: string;
  customer_id: string;
  deal_id: string | null;
  claim_id: string | null;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  vendor_replied_at: string | null;
  auto_response_scheduled_at: string | null;
  auto_response_sent_at: string | null;
  is_verified: boolean;
  is_auto_response: boolean;
  created_at: string;
  customer_name: string;
  customer_email: string | null;
  vendor_name: string;
  deal_title: string;
}

export default function AdminReviewsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  // View detail modal
  const [viewTarget, setViewTarget] = useState<ReviewRow | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');

      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, ratingFilter, showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchReviews();
  }, [user, role, fetchReviews]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete review');
      }
      showToast('Review deleted successfully', 'success');
      setDeleteTarget(null);
      fetchReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete review', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleVerified = async (review: ReviewRow) => {
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !review.is_verified }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update review');
      }
      showToast(review.is_verified ? 'Review unverified' : 'Review verified', 'success');
      fetchReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update review', 'error');
    }
  };

  // Star rendering
  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${sizeClass} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Reviews</h1>
            <p className="text-sm text-gray-500">{reviews.length} total reviews</p>
          </div>
        </div>
        <button
          onClick={fetchReviews}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Rating Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {/* Average rating card */}
        <div className="col-span-2 lg:col-span-1 card p-4 text-center">
          <p className="text-3xl font-bold text-secondary-500">{avgRating}</p>
          <div className="flex justify-center mt-1">{renderStars(Math.round(Number(avgRating)))}</div>
          <p className="text-xs text-gray-400 mt-1">Average</p>
        </div>
        {/* Per-rating counts */}
        {ratingCounts.map(({ rating, count }) => (
          <button
            key={rating}
            onClick={() => setRatingFilter(ratingFilter === rating.toString() ? 'all' : rating.toString())}
            className={`card p-3 text-center transition-all hover:shadow-md ${
              ratingFilter === rating.toString() ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex justify-center mb-1">{renderStars(rating)}</div>
            <p className="text-lg font-bold text-secondary-500">{count}</p>
            <p className="text-xs text-gray-400">{rating} star{rating !== 1 ? 's' : ''}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, deal, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="input-field w-full sm:w-40"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Customer</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Rating</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Comment</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Date</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading reviews...
                    </div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-medium text-secondary-500">{review.customer_name}</span>
                        {review.customer_email && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{review.customer_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {renderStars(review.rating)}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 truncate max-w-[250px]">
                        {review.comment || <span className="text-gray-300 italic">No comment</span>}
                      </p>
                      {review.vendor_reply && (
                        <div className="flex items-center gap-1 mt-1">
                          <Reply className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-500 truncate max-w-[200px]">{review.vendor_reply}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500 truncate max-w-[150px]">
                      {review.deal_title}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {review.vendor_name}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {review.is_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium w-fit">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {review.is_auto_response && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium w-fit">
                            <Bot className="w-3 h-3" />
                            Auto-reply
                          </span>
                        )}
                        {!review.is_verified && !review.is_auto_response && (
                          <span className="text-xs text-gray-300">--</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewTarget(review)}
                          className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleVerified(review)}
                          className={`p-2 rounded-lg transition-colors ${
                            review.is_verified
                              ? 'text-orange-500 hover:bg-orange-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={review.is_verified ? 'Unverify' : 'Verify'}
                        >
                          {review.is_verified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(review)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== View Detail Modal ==================== */}
      {viewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setViewTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-secondary-500 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-500" />
                  Review Details
                </h3>
                <button
                  onClick={() => setViewTarget(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Customer & Rating */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-secondary-500">{viewTarget.customer_name}</p>
                  {viewTarget.customer_email && (
                    <p className="text-xs text-gray-400">{viewTarget.customer_email}</p>
                  )}
                </div>
                <div className="text-right">
                  {renderStars(viewTarget.rating, 'md')}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(viewTarget.created_at).toLocaleDateString()}{' '}
                    {new Date(viewTarget.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Vendor</p>
                    <p className="font-medium text-secondary-500">{viewTarget.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deal</p>
                    <p className="font-medium text-secondary-500">{viewTarget.deal_title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Verified</p>
                    <p className={`font-medium ${viewTarget.is_verified ? 'text-green-600' : 'text-gray-400'}`}>
                      {viewTarget.is_verified ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Review ID</p>
                    <p className="font-mono text-xs text-gray-500 truncate">{viewTarget.id}</p>
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Customer Comment</p>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {viewTarget.comment || 'No comment provided.'}
                  </p>
                </div>
              </div>

              {/* Vendor Reply */}
              {viewTarget.vendor_reply && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Reply className="w-3 h-3" />
                    Vendor Reply
                    {viewTarget.is_auto_response && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium ml-1">
                        <Bot className="w-2.5 h-2.5" />
                        Auto
                      </span>
                    )}
                  </p>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{viewTarget.vendor_reply}</p>
                    {viewTarget.vendor_replied_at && (
                      <p className="text-xs text-blue-400 mt-2">
                        Replied {new Date(viewTarget.vendor_replied_at).toLocaleDateString()}{' '}
                        {new Date(viewTarget.vendor_replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Review"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete the ${deleteTarget.rating}-star review by "${deleteTarget.customer_name}" for "${deleteTarget.vendor_name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Review"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
