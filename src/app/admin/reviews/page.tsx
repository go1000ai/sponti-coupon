'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function AdminReviewsPage() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-7 h-7 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-secondary-500">Reviews</h1>
          <p className="text-sm text-gray-500">Manage customer reviews across all vendors</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Reviews management coming soon.</p>
      </div>
    </div>
  );
}
