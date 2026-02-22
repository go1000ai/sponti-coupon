'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TrendingUp, ArrowRight, ChevronLeft, ChevronRight, Eye, MapPin } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null };

export function TrendingDeals() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
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
        const data = await res.json();
        setDeals(data.deals || []);
      } catch {
        setDeals([]);
      }
      setLoading(false);
    }
    fetchTrending();
  }, [lat, lng]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:flex sm:gap-4 sm:overflow-hidden gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-full sm:w-[280px] sm:shrink-0 h-[200px] bg-gray-200 rounded-2xl animate-pulse" />
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
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Vertical grid on mobile, horizontal scroll on sm+ */}
        <div
          ref={scrollRef}
          className="grid grid-cols-1 gap-4 sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-4 sm:scrollbar-hide sm:snap-x sm:snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {deals.map((deal, i) => {
            const isSponti = deal.deal_type === 'sponti_coupon';
            const savings = deal.original_price - deal.deal_price;
            const fakeViews = 20 + i * 7 + Math.floor(Math.random() * 15);
            const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

            return (
              <ScrollReveal key={deal.id} animation="fade-up" delay={i * 80}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="block w-full sm:w-[300px] sm:shrink-0 sm:snap-start group"
                >
                  <div className="relative h-[180px] sm:h-[200px] rounded-2xl overflow-hidden deal-card-shine">
                    <div className={`absolute inset-0 ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
                      <Image
                        src={imageUrl}
                        alt={deal.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                    {/* Rank badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm font-bold text-xs text-secondary-500 w-7 h-7 rounded-full flex items-center justify-center shadow-md">
                      #{i + 1}
                    </div>

                    {/* Discount badge */}
                    <div className="absolute top-3 right-3 bg-white text-primary-500 font-bold text-xs px-2.5 py-1 rounded-full shadow-md">
                      {formatPercentage(deal.discount_percentage)}% OFF
                    </div>

                    {/* Views + Distance */}
                    <div className="absolute bottom-14 right-3 flex items-center gap-1.5">
                      {deal.distance != null && (
                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
                          <MapPin className="w-2.5 h-2.5" /> {deal.distance.toFixed(1)} mi
                        </div>
                      )}
                      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
                        <Eye className="w-2.5 h-2.5" /> {fakeViews}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3.5">
                      <h3 className="text-white font-bold text-sm line-clamp-1 mb-1">{deal.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 line-through text-xs">{formatCurrency(deal.original_price)}</span>
                        <span className="text-white font-bold text-lg">{formatCurrency(deal.deal_price)}</span>
                        <span className="text-green-400 text-[10px] font-medium ml-auto">Save {formatCurrency(savings)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}

          {/* View all card */}
          <div className="w-full sm:w-[300px] sm:shrink-0 sm:snap-start">
            <Link
              href="/deals"
              className="flex items-center justify-center h-[180px] sm:h-[200px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
            >
              <div className="text-center">
                <ArrowRight className="w-8 h-8 text-gray-300 group-hover:text-primary-500 mx-auto mb-2 transition-colors" />
                <span className="text-sm font-semibold text-gray-400 group-hover:text-primary-500 transition-colors">
                  View All Deals
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
