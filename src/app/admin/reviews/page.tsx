'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import {
  MessageSquare,
  Search,
  Filter,
  Star,
  Pencil,
  Trash2,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface ReviewRow {
  id: string;
  vendor_id: string;
  customer_id: string;
  deal_id: string;
  claim_id: string | null;
  rating: number;
  comment: string | null;
  reply: string | null;
  auto_response_scheduled_at: string | null;
  auto_response_sent_at: string | null;
  verified: boolean;
  created_at: string;
  customer_name: string;
  vendor_name: string;
  deal_title: string;
}

interface EditFormData {
  reply: string;
  verified: boolean;
}

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  // Edit modal state
  const [editReview, setEditReview] = useState<ReviewRow | null>(null);
  const [formData, setFormData] = useState<EditFormData>({ reply: '', verified: false });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete dialog state
  const [deleteReview, setDeleteReview] = useState<ReviewRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reviews');
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      // Silent fail — table will show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchReviews();
  }, [user, fetchReviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.deal_title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating =
        ratingFilter === 'all' || r.rating === parseInt(ratingFilter, 10);

      return matchesSearch && matchesRating;
    });
  }, [reviews, searchQuery, ratingFilter]);

  // --- Helpers ---

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const truncateText = (text: string | null, maxLength: number = 60) => {
    if (!text) return '--';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // --- Form Handlers ---

  const openEditModal = (review: ReviewRow) => {
    setFormData({
      reply: review.reply || '',
      verified: review.verified,
    });
    setFormError('');
    setEditReview(review);
  };

  const closeModal = () => {
    setEditReview(null);
    setFormError('');
  };

  const handleEdit = async () => {
    if (!editReview) return;
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/admin/reviews/${editReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply: formData.reply || null,
          verified: formData.verified,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update review');
      }
      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === editReview.id
            ? { ...r, reply: formData.reply || null, verified: formData.verified }
            : r
        )
      );
      closeModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReview) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${deleteReview.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete review');
      }
      setReviews((prev) => prev.filter((r) => r.id !== deleteReview.id));
      setDeleteReview(null);
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Stats ---

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';
  const verifiedCount = reviews.filter((r) => r.verified).length;

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Reviews Management</h1>
            <p className="text-sm text-gray-500">
              {reviews.length} total reviews &middot; {avgRating} avg rating &middot; {verifiedCount} verified
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, vendor, or deal..."
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
              className="input-field w-full sm:w-36"
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

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Customer</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Rating</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Comment</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Reply</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Verified</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Date</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No reviews found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-secondary-500">
                        {review.customer_name}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {review.vendor_name}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-secondary-500 truncate max-w-[160px]">
                        {review.deal_title}
                      </p>
                    </td>
                    <td className="p-4">
                      {renderStars(review.rating)}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 truncate max-w-[180px]" title={review.comment || ''}>
                        {truncateText(review.comment)}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500 truncate max-w-[150px]" title={review.reply || ''}>
                        {truncateText(review.reply, 40)}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      {review.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
                          No
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(review)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Edit Review"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteReview(review)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Review"
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

      {/* Edit Modal */}
      <AdminModal
        isOpen={!!editReview}
        onClose={closeModal}
        title="Edit Review"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
          )}

          {/* Review Info (read-only) */}
          {editReview && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Customer:</span> {editReview.customer_name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Deal:</span> {editReview.deal_title}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Rating:</span>
                {renderStars(editReview.rating)}
              </div>
              {editReview.comment && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Comment:</span> {editReview.comment}
                </p>
              )}
            </div>
          )}

          {/* Reply */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Reply</label>
            <textarea
              value={formData.reply}
              onChange={(e) => setFormData((prev) => ({ ...prev, reply: e.target.value }))}
              rows={4}
              className="input-field"
              placeholder="Enter vendor reply..."
            />
          </div>

          {/* Verified Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.verified}
                onChange={(e) => setFormData((prev) => ({ ...prev, verified: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
            </label>
            <span className="text-sm font-medium text-gray-700">Verified Purchase</span>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeModal}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteReview}
        onConfirm={handleDelete}
        onCancel={() => setDeleteReview(null)}
        title="Delete Review"
        message={`Are you sure you want to delete the review by "${deleteReview?.customer_name}" for "${deleteReview?.deal_title}"? This action cannot be undone.`}
        confirmLabel="Delete Review"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
