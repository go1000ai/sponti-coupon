'use client';

import { useEffect, useState, useCallback } from 'react';
import { DealCard } from '@/components/deals/DealCard';
import { DealsMap } from '@/components/deals/DealsMap';
import { MapPin, Search, SlidersHorizontal, Tag, Sparkles, Flame, LayoutGrid, Map } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

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
    if (filters.search) params.set('search', filters.search);

    const response = await fetch(`/api/deals?${params.toString()}`);
    const data = await response.json();
    setDeals(data.deals || []);
    setLoading(false);
  }, [userLocation, filters]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const spontiCount = deals.filter(d => d.deal_type === 'sponti_coupon').length;

  return (
    <div className="min-h-screen">
      {/* Gradient hero header */}
      <div className="bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">Browse Deals</h1>
                <Sparkles className="w-6 h-6 text-primary-400 animate-pulse-slow" />
              </div>
              <p className="text-gray-300 mt-1">
                {deals.length} deal{deals.length !== 1 ? 's' : ''} available
                {userLocation && ` within ${filters.radius} miles`}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {spontiCount > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-primary-500/20 to-orange-500/20 border border-primary-400/30 text-primary-300 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Flame className="w-3.5 h-3.5 text-primary-400" />
                  {spontiCount} Sponti Live
                </div>
              )}

              {/* View toggle: Grid / Map */}
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'map'
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  showFilters
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {/* Search & Filters — integrated into hero */}
          <div className={`mt-6 ${showFilters ? '' : 'hidden sm:block'}`}>
            {/* Input fields row: stacked on mobile, 3 columns on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && fetchDeals()}
                  className="w-full pl-10 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Search deals..."
                />
              </div>

              {/* City */}
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  value={filters.city}
                  onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && fetchDeals()}
                  className="w-full pl-10 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="City or ZIP"
                />
              </div>

              {/* Radius */}
              <select
                value={filters.radius}
                onChange={e => setFilters(f => ({ ...f, radius: parseInt(e.target.value) }))}
                className="py-3 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                {RADIUS_OPTIONS.map(r => (
                  <option key={r} value={r} className="text-secondary-500">{r} miles</option>
                ))}
              </select>
            </div>

            {/* Search button below fields */}
            <div className="mt-3 flex justify-center sm:justify-end">
              <button
                onClick={() => fetchDeals()}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all shadow-lg shadow-primary-500/30 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search Deals
              </button>
            </div>

            {/* Deal Type Filter */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setFilters(f => ({ ...f, type: '' }))}
                className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filters.type === '' ? 'bg-white text-secondary-500 shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                All Deals
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, type: 'sponti_coupon' }))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filters.type === 'sponti_coupon' ? 'bg-gradient-to-r from-primary-500 to-orange-500 text-white shadow-lg shadow-primary-500/30' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <SpontiIcon className="w-3.5 h-3.5" /> Sponti Coupons
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, type: 'regular' }))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filters.type === 'regular' ? 'bg-gradient-to-r from-accent-500 to-blue-600 text-white shadow-lg shadow-accent-500/30' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Tag className="w-3.5 h-3.5" /> Steady Deals
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mt-3">
              {['restaurants', 'beauty-spa', 'health-fitness', 'entertainment', 'shopping', 'food-drink'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    filters.category === cat
                      ? 'bg-white text-secondary-500 shadow-lg'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {cat.replace('-', ' & ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deals Grid — subtle parallax bg */}
      <div className="relative">
        {/* Soft gradient background so it's not plain white */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-accent-50/30" />
        <div className="absolute inset-0 dot-pattern opacity-[0.03]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                    <div className="h-6 bg-gray-200 rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-16 animate-fade-up">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full animate-pulse-soft" />
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <Tag className="w-8 h-8 text-gray-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-400">No deals found</h2>
              <p className="text-gray-400 mt-2">Try adjusting your filters or expanding your search radius</p>
            </div>
          ) : viewMode === 'map' ? (
            <DealsMap deals={deals} userLocation={userLocation} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {deals.map((deal, i) => (
                <div
                  key={deal.id}
                  className="animate-fade-up h-full"
                  style={{ animationDelay: `${Math.min(i * 60, 500)}ms`, opacity: 0 }}
                >
                  <DealCard
                    deal={deal}
                    distance={(deal as Deal & { distance?: number }).distance}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
