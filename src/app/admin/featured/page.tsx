'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { Star, Loader2 } from 'lucide-react';

export default function AdminFeaturedPage() {
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
        <Star className="w-7 h-7 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-secondary-500">Featured Deals</h1>
          <p className="text-sm text-gray-500">Manage featured deals on the homepage</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Featured deals management coming soon.</p>
        <p className="text-sm text-gray-400 mt-2">You can toggle featured status from the Deals page.</p>
      </div>
    </div>
  );
}
