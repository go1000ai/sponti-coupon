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
  Pencil,
  Save,
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

  // Edit modal
  const [editTarget, setEditTarget] = useState<ReviewRow | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Reply modal
  const [replyTarget, setReplyTarget] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

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

  // Edit review
  const openEditDialog = (review: ReviewRow) => {
    setEditTarget(review);
    setEditForm({ rating: review.rating, comment: review.comment || '' });
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: editForm.rating, comment: editForm.comment || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update review');
      }
      showToast('Review updated successfully', 'success');
      setEditTarget(null);
      fetchReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update review', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Reply on behalf of vendor
  const openReplyDialog = (review: ReviewRow) => {
    setReplyTarget(review);
    setReplyText(review.vendor_reply || '');
  };

  const handleReplySubmit = async () => {
    if (!replyTarget) return;
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${replyTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_reply: replyText.trim() || null,
          vendor_replied_at: replyText.trim() ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save reply');
      }
      showToast(replyText.trim() ? 'Reply saved successfully' : 'Reply removed', 'success');
      setReplyTarget(null);
      fetchReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save reply', 'error');
    } finally {
      setReplyLoading(false);
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
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
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
          <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
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
            <p className="text-lg font-bold text-gray-900">{count}</p>
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
                        <span className="font-medium text-gray-900">{review.customer_name}</span>
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
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium w-fit">
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
                          className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditDialog(review)}
                          className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                          title="Edit Review"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openReplyDialog(review)}
                          className={`p-2 rounded-lg transition-colors ${
                            review.vendor_reply
                              ? 'text-blue-500 hover:bg-blue-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={review.vendor_reply ? 'Edit Reply' : 'Reply as Vendor'}
                        >
                          <Reply className="w-4 h-4" />
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
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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
                  <p className="font-medium text-gray-900">{viewTarget.customer_name}</p>
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
                    <p className="font-medium text-gray-900">{viewTarget.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deal</p>
                    <p className="font-medium text-gray-900">{viewTarget.deal_title}</p>
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
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium ml-1">
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

      {/* ==================== Edit Review Modal ==================== */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary-500" />
                  Edit Review
                </h3>
                <button
                  onClick={() => setEditTarget(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Review info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-medium text-gray-900">{editTarget.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Vendor</p>
                    <p className="font-medium text-gray-900">{editTarget.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deal</p>
                    <p className="text-gray-600 truncate">{editTarget.deal_title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-gray-600">{new Date(editTarget.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Rating picker */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => setEditForm((f) => ({ ...f, rating: i }))}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          i <= editForm.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-200 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">{editForm.rating}/5</span>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea
                  value={editForm.comment}
                  onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={4}
                  className="input-field w-full resize-none"
                  placeholder="Customer comment..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditTarget(null)}
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Reply Modal ==================== */}
      {replyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setReplyTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Reply className="w-5 h-5 text-primary-500" />
                  {replyTarget.vendor_reply ? 'Edit Vendor Reply' : 'Reply as Vendor'}
                </h3>
                <button
                  onClick={() => setReplyTarget(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Original review */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900 text-sm">{replyTarget.customer_name}</p>
                  {renderStars(replyTarget.rating)}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {replyTarget.comment || 'No comment provided.'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  For: {replyTarget.vendor_name} — {replyTarget.deal_title}
                </p>
              </div>

              {/* Reply text */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Reply
                  <span className="text-xs text-gray-400 ml-1">(will appear as from {replyTarget.vendor_name})</span>
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="input-field w-full resize-none"
                  placeholder="Write a reply on behalf of the vendor..."
                />
                {replyTarget.vendor_reply && (
                  <p className="text-xs text-gray-400 mt-1">
                    Clear the text and save to remove the reply.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setReplyTarget(null)}
                  disabled={replyLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplySubmit}
                  disabled={replyLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Reply className="w-4 h-4" />
                  {replyLoading ? 'Saving...' : replyText.trim() ? 'Save Reply' : 'Remove Reply'}
                </button>
              </div>
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
