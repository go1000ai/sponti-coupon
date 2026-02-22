'use client';

import { useEffect, useState, useCallback } from 'react';
import { DealCard } from '@/components/deals/DealCard';
import { MapPin, Search, SlidersHorizontal, Tag } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal } from '@/lib/types/database';

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '' as '' | 'regular' | 'sponti_coupon',
    radius: 25,
    category: '',
    search: '',
    city: '',
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (userLocation) {
      params.set('lat', String(userLocation.lat));
      params.set('lng', String(userLocation.lng));
      params.set('radius', String(filters.radius));
    }
    if (filters.type) params.set('type', filters.type);
    if (filters.category) params.set('category', filters.category);
    if (filters.city) params.set('city', filters.city);

    const response = await fetch(`/api/deals?${params.toString()}`);
    const data = await response.json();
    setDeals(data.deals || []);
    setLoading(false);
  }, [userLocation, filters]);

  useEffect(() => {
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Silently fail — deals will show without distance
      );
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500">Browse Deals</h1>
          <p className="text-gray-500 mt-1">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} available
            {userLocation && ` within ${filters.radius} miles`}
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Search & Filters */}
      <div className={`card p-4 sm:p-6 mb-8 ${showFilters ? '' : 'hidden sm:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="input-field pl-10"
              placeholder="Search deals..."
            />
          </div>

          {/* City */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              className="input-field pl-10"
              placeholder="City or ZIP"
            />
          </div>

          {/* Radius */}
          <select
            value={filters.radius}
            onChange={e => setFilters(f => ({ ...f, radius: parseInt(e.target.value) }))}
            className="input-field"
          >
            {RADIUS_OPTIONS.map(r => (
              <option key={r} value={r}>{r} miles</option>
            ))}
          </select>
        </div>

        {/* Deal Type Filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setFilters(f => ({ ...f, type: '' }))}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filters.type === '' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Deals
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, type: 'sponti_coupon' }))}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filters.type === 'sponti_coupon' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <SpontiIcon className="w-3.5 h-3.5" /> Sponti Coupons
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, type: 'regular' }))}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filters.type === 'regular' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Regular Deals
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['restaurants', 'beauty-spa', 'health-fitness', 'entertainment', 'shopping', 'food-drink'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? '' : cat }))}
              className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                filters.category === cat
                  ? 'bg-secondary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.replace('-', ' & ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Deals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-400">No deals found</h2>
          <p className="text-gray-400 mt-2">Try adjusting your filters or expanding your search radius</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              distance={(deal as Deal & { distance?: number }).distance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
