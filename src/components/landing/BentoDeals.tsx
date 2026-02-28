'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight, Sparkles } from 'lucide-react';
import { DealTypeLegend } from '@/components/ui/SpontiBadge';
import { DealCarousel } from '@/components/ui/DealCarousel';
import { CarouselDealCard, ViewAllCard } from '@/components/ui/CarouselDealCard';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null; is_featured?: boolean };

export function BentoDeals() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      try {
        const params = new URLSearchParams({ limit: '12' });
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
  }, []);

  if (loading) {
    return (
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[85%] sm:w-[280px] lg:w-[300px] h-[280px] sm:h-[320px] lg:h-[360px] bg-gray-200 rounded-2xl animate-pulse"
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
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full px-5 py-2 mb-3 shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white tracking-wide">MORE DEALS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-secondary-500">
                Explore All Deals
              </h2>
              <p className="text-gray-500 mt-2 text-base sm:text-lg">
                Deals from everywhere — online, in-store, and more
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
