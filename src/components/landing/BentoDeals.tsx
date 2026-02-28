'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight, MapPin } from 'lucide-react';
import { DealTypeLegend } from '@/components/ui/SpontiBadge';
import { DealCarousel } from '@/components/ui/DealCarousel';
import { CarouselDealCard, ViewAllCard } from '@/components/ui/CarouselDealCard';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null; is_featured?: boolean };

export function BentoDeals() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const { lat, lng } = useGeolocation();

  useEffect(() => {
    async function fetchDeals() {
      try {
        const params = new URLSearchParams({ limit: '8' });
        if (lat && lng) {
          params.set('lat', String(lat));
          params.set('lng', String(lng));
          params.set('radius', '25');
        }
        const res = await fetch(`/api/deals?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.deals?.length > 0) {
          setDeals(data.deals);
        }
      } catch {
        // Keep existing deals on error
      }
      setLoading(false);
    }
    fetchDeals();
  }, [lat, lng]);

  if (loading) {
    return (
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[calc(100vw-3rem)] sm:w-[calc(85vw-2rem)] lg:w-[calc(70vw-3rem)] lg:max-w-[900px] h-[280px] sm:h-[320px] lg:h-[360px] bg-gray-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="py-10 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-orange-500 rounded-full px-5 py-2 mb-3 shadow-md">
                <MapPin className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white tracking-wide">NEAR YOU</span>
                <span className="pulse-dot w-2 h-2 rounded-full bg-white ml-1" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-secondary-500">
                Deals Near You
              </h2>
              <p className="text-gray-500 mt-2 text-base sm:text-lg">
                The best Sponti &amp; Steady deals close to your location
              </p>
              <DealTypeLegend className="mt-3 flex-wrap" />
            </div>
            <Link
              href="/deals"
              className="text-primary-500 font-semibold inline-flex items-center gap-1 hover:text-primary-600 transition-colors group"
            >
              View All Deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Carousel */}
        <ScrollReveal animation="fade-up">
          <DealCarousel showArrows arrowVariant="light">
            {deals.map((deal) => (
              <CarouselDealCard
                key={deal.id}
                deal={deal}
                variant="default"
                showCountdown={deal.deal_type === 'sponti_coupon'}
              />
            ))}
            <ViewAllCard href="/deals" />
          </DealCarousel>
        </ScrollReveal>

        {/* Browse All CTA */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mt-10">
            <Link
              href="/deals"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base hover:scale-105 transition-transform duration-200"
            >
              Browse All Deals <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
