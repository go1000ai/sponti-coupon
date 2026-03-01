'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealCarousel } from '@/components/ui/DealCarousel';
import { CarouselDealCard, ViewAllCard } from '@/components/ui/CarouselDealCard';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null };

export function SpontiDealsShowcase() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const { lat, lng } = useGeolocation();

  useEffect(() => {
    async function fetchSpontiDeals() {
      try {
        const params = new URLSearchParams({ type: 'sponti_coupon', limit: '10' });
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
    fetchSpontiDeals();
  }, [lat, lng]);

  if (loading) {
    return (
      <section className="relative py-10 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop)` }} />
        <div className="absolute inset-0 bg-gray-900/70" />
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

  if (deals.length === 0) {
    return (
      <section className="relative py-10 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop)` }} />
        <div className="absolute inset-0 bg-gray-900/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center">
              <SpontiIcon className="w-12 h-12 text-primary-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sponti Deals Drop Daily</h3>
              <p className="text-gray-300 mb-6">New Sponti Coupons with 50-70% off appear every day. Check back soon!</p>
              <Link
                href="/deals"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                Browse Steady Deals <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-10 sm:py-16 pb-10 sm:pb-16 overflow-hidden">
      {/* Parallax background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop)` }}
      />
      <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-[2px]" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-gray-900/70 to-gray-900 z-[1]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-orange-500 rounded-full px-5 py-2 mb-3 shadow-md">
                <SpontiIcon className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white tracking-wide">SPONTI DEALS</span>
                <span className="pulse-dot w-2 h-2 rounded-full bg-white ml-1" />
              </div>
              <h2 className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="SpontiCoupon"
                  width={200}
                  height={60}
                  className="h-9 sm:h-12 w-auto drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                />
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg whitespace-nowrap">
                  Coupons
                </span>
              </h2>
              <p className="text-gray-300 mt-1 text-base sm:text-lg">
                24-hour exclusive deals — grab them before they&apos;re gone
              </p>
            </div>
            <Link
              href="/deals?type=sponti_coupon"
              className="text-primary-400 font-semibold inline-flex items-center gap-1 hover:text-primary-300 transition-colors group"
            >
              See All Sponti Deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Carousel */}
        <ScrollReveal animation="fade-up" delay={100}>
          <DealCarousel showArrows arrowVariant="dark">
            {deals.map((deal) => (
              <CarouselDealCard
                key={deal.id}
                deal={deal}
                variant="sponti"
                showCountdown
              />
            ))}
            <ViewAllCard href="/deals?type=sponti_coupon" variant="dark" />
          </DealCarousel>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal animation="fade-up" delay={400}>
          <div className="text-center mt-8">
            <Link
              href="/deals?type=sponti_coupon"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base hover:scale-105 transition-transform duration-200 shadow-xl"
            >
              See All Sponti Deals <SpontiIcon className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
