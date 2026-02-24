'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    async function fetchDeals() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (userLocation) {
          params.set('lat', String(userLocation.lat));
          params.set('lng', String(userLocation.lng));
          params.set('radius', '50');
        }
        const res = await fetch(`/api/deals?${params.toString()}`);
        const data = await res.json();
        setDeals(data.deals || []);
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    fetchDeals();
  }, [userLocation]);

  return (
    <section className="py-10 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <Navigation className="w-4 h-4 text-cyan-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-cyan-600">Deals Near You</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary-500">
              Discover Local Savings
            </h2>
            <p className="text-gray-500 mt-2 text-base sm:text-lg">
              {deals.length > 0
                ? `${deals.length} verified deals from local businesses`
                : 'Hundreds of verified businesses offering deals in your area'}
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
              <DealsMap deals={deals} userLocation={userLocation} />
            )}

            {/* CTA overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-gradient-to-t from-white via-white/90 to-transparent pt-12 pb-5 px-6 text-center rounded-b-2xl">
              <Link
                href="/deals?view=map"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 hover:scale-105 transition-transform shadow-lg"
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
