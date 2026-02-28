'use client';

import { useEffect, useState } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TrendingUp } from 'lucide-react';
import { DealCarousel } from '@/components/ui/DealCarousel';
import { CarouselDealCard, ViewAllCard } from '@/components/ui/CarouselDealCard';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null };

export function TrendingDeals() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const { lat, lng } = useGeolocation();

  useEffect(() => {
    async function fetchTrending() {
      try {
        const params = new URLSearchParams({ limit: '10', sort: 'popular' });
        if (lat && lng) {
          params.set('lat', String(lat));
          params.set('lng', String(lng));
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
    fetchTrending();
  }, [lat, lng]);

  if (loading) {
    return (
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shrink-0 w-[calc(100vw-3rem)] sm:w-[calc(85vw-2rem)] lg:w-[calc(70vw-3rem)] lg:max-w-[900px] h-[280px] sm:h-[320px] lg:h-[360px] bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal animation="fade-up">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-full px-5 py-2 mb-3 shadow-sm">
                <TrendingUp className="w-4 h-4 text-violet-500" strokeWidth={1.8} />
                <span className="text-sm font-semibold text-violet-600">Trending Now</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-secondary-500">
                Most Popular Deals
              </h2>
            </div>
          </div>
        </ScrollReveal>

        {/* Carousel */}
        <ScrollReveal animation="fade-up">
          <DealCarousel showArrows arrowVariant="light">
            {deals.map((deal, i) => (
              <CarouselDealCard
                key={deal.id}
                deal={deal}
                variant="default"
                rank={i + 1}
                showCountdown={deal.deal_type === 'sponti_coupon'}
              />
            ))}
            <ViewAllCard href="/deals" />
          </DealCarousel>
        </ScrollReveal>
      </div>
    </section>
  );
}
