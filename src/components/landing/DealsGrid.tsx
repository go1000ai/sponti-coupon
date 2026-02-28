'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight, Tag } from 'lucide-react';
import { DealCarousel } from '@/components/ui/DealCarousel';
import { CarouselDealCard, ViewAllCard } from '@/components/ui/CarouselDealCard';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null; is_featured?: boolean };

export function DealsGrid() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const { lat, lng } = useGeolocation();

  useEffect(() => {
    async function fetchDeals() {
      try {
        const params = new URLSearchParams({ limit: '12', type: 'regular' });
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
    fetchDeals();
  }, [lat, lng]);

  if (loading) {
    return (
      <section className="relative py-10 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742393-d75f468bfcb0?q=80&w=2070&auto=format&fit=crop)` }} />
        <div className="absolute inset-0 bg-secondary-500/75" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shrink-0 w-[85%] sm:w-[280px] lg:w-[300px] h-[280px] sm:h-[320px] lg:h-[360px] bg-white/20 backdrop-blur-sm rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="relative pt-16 sm:pt-24 py-10 sm:py-16 -mt-8 overflow-hidden">
      {/* Parallax background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742393-d75f468bfcb0?q=80&w=2070&auto=format&fit=crop)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-500/80 via-secondary-500/70 to-secondary-500/80 backdrop-blur-[2px]" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-t from-transparent via-secondary-500/70 to-secondary-500 z-[1]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-accent-500 to-blue-600 rounded-full px-5 py-2 mb-3 shadow-md">
                <Tag className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white tracking-wide">STEADY DEALS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Steady Deals Near You
              </h2>
              <p className="text-gray-300 mt-1 text-base sm:text-lg">
                Long-running deals you can count on — always available
              </p>
            </div>
            <Link
              href="/deals"
              className="text-primary-400 font-semibold inline-flex items-center gap-1 hover:text-primary-300 transition-colors group"
            >
              See All Steady Deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Carousel */}
        <ScrollReveal animation="fade-up">
          <DealCarousel showArrows arrowVariant="dark">
            {deals.map((deal) => (
              <CarouselDealCard
                key={deal.id}
                deal={deal}
                variant="dark-bg"
                showCountdown={deal.deal_type === 'sponti_coupon'}
              />
            ))}
            <ViewAllCard href="/deals?type=regular" variant="dark" />
          </DealCarousel>
        </ScrollReveal>

        {/* Browse all CTA */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mt-10">
            <Link
              href="/deals"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base hover:scale-105 transition-transform duration-200 shadow-xl"
            >
              Browse All Deals <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
