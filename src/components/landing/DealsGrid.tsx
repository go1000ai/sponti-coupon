'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight, MapPin, ShieldCheck, Clock, Sparkles, Star } from 'lucide-react';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
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
        const params = new URLSearchParams({ limit: '12' });
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[360px] bg-white/20 backdrop-blur-sm rounded-2xl animate-pulse" />
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
      {/* Top fade for smooth transition from previous section */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-t from-transparent via-secondary-500/70 to-secondary-500 z-[1]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2 mb-3 shadow-sm border border-white/20">
                <Sparkles className="w-4 h-4 text-primary-400" strokeWidth={1.8} />
                <span className="text-sm font-semibold text-white">All Deals</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Deals Near You
              </h2>
              <p className="text-gray-300 mt-1 text-base sm:text-lg">
                {deals.length} deals available — browse and save big
              </p>
            </div>
            <Link
              href="/deals"
              className="text-primary-400 font-semibold inline-flex items-center gap-1 hover:text-primary-300 transition-colors group"
            >
              Browse All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Deals grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {deals.map((deal, i) => (
            <ScrollReveal key={deal.id} animation="fade-up" delay={i * 60}>
              <DealGridCard deal={deal} />
            </ScrollReveal>
          ))}
        </div>

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

function DealGridCard({ deal }: { deal: DealWithDistance }) {
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;
  const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

  return (
    <Link href={`/deals/${deal.id}`} className="block group h-full">
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 deal-card-shine h-full flex flex-col ring-1 ring-white/20">
        {/* Image */}
        <div className="relative h-[180px] overflow-hidden">
          <Image
            src={imageUrl}
            alt={deal.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Type + Featured badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <DealTypeBadge type={deal.deal_type} size="sm" />
            {deal.is_featured && (
              <span className="inline-flex items-center gap-0.5 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md w-fit">
                <Star className="w-2.5 h-2.5" /> Featured
              </span>
            )}
          </div>

          {/* Discount badge */}
          <div className="absolute top-3 right-3 bg-white text-primary-500 font-bold text-xs px-2.5 py-1 rounded-full shadow-md">
            {formatPercentage(deal.discount_percentage)}% OFF
          </div>

          {/* Distance */}
          {deal.distance != null && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
              <MapPin className="w-2.5 h-2.5" /> {deal.distance.toFixed(1)} mi
            </div>
          )}

          {/* Verified badge */}
          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1 bg-green-500/80 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Countdown for all deals */}
          {deal.status === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <Clock className={`w-3 h-3 ${isSponti ? 'text-primary-500' : 'text-secondary-400'}`} />
              <CountdownTimer expiresAt={deal.expires_at} size="sm" />
            </div>
          )}

          <h3 className="font-bold text-secondary-500 text-sm sm:text-base line-clamp-2 mb-1.5 group-hover:text-primary-500 transition-colors">
            {deal.title}
          </h3>

          {deal.vendor && (
            <p className="text-gray-400 text-xs mb-3">{deal.vendor.business_name}</p>
          )}

          {/* Pricing — pushed to bottom */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-gray-400 line-through text-xs">{formatCurrency(deal.original_price)}</span>
              <span className="text-secondary-500 font-bold text-lg">{formatCurrency(deal.deal_price)}</span>
            </div>
            <span className="bg-green-50 text-green-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Save {formatCurrency(savings)}
            </span>
          </div>

          {/* Claims progress */}
          {deal.max_claims && (
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div
                  className="bg-primary-500 h-1 rounded-full"
                  style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{deal.max_claims - deal.claims_count} left</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
