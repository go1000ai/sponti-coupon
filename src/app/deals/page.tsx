'use client';

import { useEffect, useState, useCallback } from 'react';
import { DealCard } from '@/components/deals/DealCard';
import { DealsMap } from '@/components/deals/DealsMap';
import { MapPin, Search, SlidersHorizontal, Tag, Sparkles, Flame, LayoutGrid, Map, ArrowUpDown, Navigation } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { geocodeAddress } from '@/lib/utils';
import type { Deal } from '@/lib/types/database';

const RADIUS_OPTIONS = [10, 25, 50, 100, 0]; // 0 = no limit

type SortOption = 'distance' | 'newest' | 'discount';

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '' as '' | 'regular' | 'sponti_coupon',
    radius: 0,
    search: '',
    city: '',
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [geocoding, setGeocoding] = useState(false);

  const { lat, lng, loading: geoLoading, error: geoError } = useGeolocation();

  // Warm up stats endpoint
  useEffect(() => {
    fetch('/api/deals/stats').then(() => {}).catch(() => {});
  }, []);

  // Set user location from geolocation hook
  useEffect(() => {
    if (lat && lng) {
      setUserLocation({ lat, lng });
    }
  }, [lat, lng]);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (userLocation && filters.radius > 0) {
      params.set('lat', String(userLocation.lat));
      params.set('lng', String(userLocation.lng));
      params.set('radius', String(filters.radius));
    }
    if (filters.type) params.set('type', filters.type);
    if (filters.city) params.set('city', filters.city);
    if (filters.search) params.set('search', filters.search);

    params.set('limit', '50');
    const response = await fetch(`/api/deals?${params.toString()}`);
    const data = await response.json();
    const fetchedDeals = data.deals || [];

    // Client-side sort
    if (sortBy === 'newest') {
      fetchedDeals.sort((a: Deal, b: Deal) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'discount') {
      fetchedDeals.sort((a: Deal, b: Deal) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    }
    // 'distance' sort is already handled by the API

    setDeals(fetchedDeals);
    setLoading(false);
  }, [userLocation, filters, sortBy]);

  // Fetch deals immediately (no location needed when radius=All)
  useEffect(() => {
    if (filters.radius > 0 && geoLoading) return; // only wait for geo when radius is set
    fetchDeals();
  }, [geoLoading, fetchDeals, filters.radius]);

  const handleLocationSearch = async () => {
    if (!filters.city.trim()) return;
    setGeocoding(true);
    const coords = await geocodeAddress(filters.city.trim());
    if (coords) {
      setUserLocation(coords);
    }
    setGeocoding(false);
  };

  const handleSearchSubmit = async () => {
    // Geocode the city/ZIP if user entered one and we don't have location
    if (filters.city.trim() && !userLocation) {
      await handleLocationSearch();
    }
    fetchDeals();
  };

  const spontiCount = deals.filter(d => d.deal_type === 'sponti_coupon').length;
  const showLocationBanner = !geoLoading && !userLocation && geoError;

  return (
    <div className="min-h-screen">
      {/* Location fallback banner — only when geolocation denied and no ZIP entered yet */}
      {showLocationBanner && !filters.city && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span className="text-sm font-medium">Enable location or enter a ZIP code below to find nearby deals</span>
            </div>
          </div>
        </div>
      )}

      {/* Gradient hero header */}
      <div className="bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-fade-up">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">Browse Deals</h1>
                <Sparkles className="w-6 h-6 text-primary-400 animate-pulse-slow" />
              </div>
              <p className="text-gray-300 mt-1 text-sm sm:text-base">
                {deals.length} deal{deals.length !== 1 ? 's' : ''} available
                {userLocation && ` within ${filters.radius} miles`}
              </p>
            </div>

            {spontiCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-primary-500/20 to-orange-500/20 border border-primary-400/30 text-primary-300 px-3 py-1.5 rounded-full text-sm font-medium">
                <Flame className="w-3.5 h-3.5 text-primary-400" />
                {spontiCount} Sponti Live
              </div>
            )}
          </div>

          {/* Controls row — stacked on mobile, inline on desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-4">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="w-full sm:w-auto appearance-none bg-white/10 border border-white/20 rounded-lg pl-8 pr-8 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="distance" className="text-secondary-500">Nearest</option>
                <option value="newest" className="text-secondary-500">Newest</option>
                <option value="discount" className="text-secondary-500">Best Discount</option>
              </select>
              <ArrowUpDown className="absolute left-2.5 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* View toggle + Filters button */}
            <div className="flex gap-2">
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
                  <span className="sm:inline">Grid</span>
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
                  <span className="sm:inline">Map</span>
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

          {/* Search & Filters */}
          <div className={`mt-5 ${showFilters ? '' : 'hidden'}`}>
            {/* Row 1: Keyword search + Location + Radius — stacked on mobile, 3-col on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Keyword Search — searches titles, descriptions, vendor category, business name */}
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
                  className="w-full pl-10 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="game show, brunch, yoga, spa..."
                />
              </div>

              {/* City / ZIP */}
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  value={filters.city}
                  onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      if (filters.city.trim()) {
                        setGeocoding(true);
                        const coords = await geocodeAddress(filters.city.trim());
                        if (coords) setUserLocation(coords);
                        setGeocoding(false);
                      }
                      fetchDeals();
                    }
                  }}
                  className="w-full pl-10 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="City, ZIP, or address"
                />
                {geocoding && (
                  <div className="absolute right-3 top-3.5">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Radius */}
              <select
                value={filters.radius}
                onChange={e => setFilters(f => ({ ...f, radius: parseInt(e.target.value) }))}
                className="w-full py-3 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                {RADIUS_OPTIONS.map(r => (
                  <option key={r} value={r} className="text-secondary-500">{r === 0 ? 'All — No limit' : `${r} miles`}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Deal type pills + Search button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div className="flex flex-wrap gap-2">
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

              <button
                onClick={handleSearchSubmit}
                disabled={geocoding}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all shadow-lg shadow-primary-500/30 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {geocoding ? 'Finding location...' : 'Search Deals'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="relative">
        {/* Soft gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-accent-50/30 pointer-events-none" />
        <div className="absolute inset-0 dot-pattern opacity-[0.03] pointer-events-none" />

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
