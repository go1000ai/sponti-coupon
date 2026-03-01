'use client';

import { useEffect, useState, useCallback } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Navigation, MapPin, ArrowRight } from 'lucide-react';
import { DealsMap } from '@/components/deals/DealsMap';
import Link from 'next/link';
import type { Deal } from '@/lib/types/database';

export function DealMapPreview() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail — map will center on deal average
      );
    }
  }, []);

  // Fetch ALL deals on initial load
  useEffect(() => {
    async function fetchDeals() {
      try {
        const res = await fetch('/api/deals?limit=100');
        const data = await res.json();
        setDeals(data.deals || []);
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    fetchDeals();
  }, []);

  // "Search this area" — re-fetch deals for the visible map area
  const handleSearchArea = useCallback(async (center: { lat: number; lng: number }, radiusMiles: number) => {
    try {
      const params = new URLSearchParams({
        lat: String(center.lat),
        lng: String(center.lng),
        radius: String(radiusMiles),
        limit: '100',
      });
      const res = await fetch(`/api/deals?${params.toString()}`);
      const data = await res.json();
      setDeals(data.deals || []);
    } catch {
      // keep existing deals on error
    }
  }, []);

  return (
    <section className="py-10 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <Navigation className="w-4 h-4 text-cyan-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-cyan-600">Deal Map</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              All Deals on the Map
            </h2>
            <p className="text-gray-500 mt-2 text-base sm:text-lg">
              {deals.length > 0
                ? `${deals.length} deals from verified local businesses`
                : 'Explore deals from verified businesses everywhere'}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="scale-up">
          <div className="relative">
            {loading ? (
              <div className="w-full h-[350px] sm:h-[450px] md:h-[500px] bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 rounded-2xl animate-pulse flex items-center justify-center shadow-xl">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Loading deals map...</p>
                </div>
              </div>
            ) : (
              <DealsMap deals={deals} userLocation={userLocation} onSearchArea={handleSearchArea} />
            )}

            {/* CTA below map */}
            <div className="z-[1000] mt-6 text-center">
              <Link
                href="/deals?view=map"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary-500 text-primary-500 font-semibold hover:bg-primary-500 hover:text-white transition-all duration-300 hover:scale-105"
              >
                <MapPin className="w-4 h-4" />
                Explore All Deals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
