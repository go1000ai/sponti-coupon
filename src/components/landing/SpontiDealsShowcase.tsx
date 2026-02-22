'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
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
        const params = new URLSearchParams({ type: 'sponti_coupon', limit: '6' });
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
        <div className="absolute inset-0 bg-secondary-500/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[320px] bg-white/20 backdrop-blur-sm rounded-2xl animate-pulse" />
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
        <div className="absolute inset-0 bg-secondary-500/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 sm:p-12 text-center">
              <SpontiIcon className="w-12 h-12 text-primary-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Flash Deals Drop Daily</h3>
              <p className="text-gray-300 mb-6">New Sponti Coupons with 50-70% off appear every day. Check back soon!</p>
              <Link
                href="/deals"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                Browse Regular Deals <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-10 sm:py-16 overflow-hidden">
      {/* Parallax background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop)` }}
      />
      <div className="absolute inset-0 bg-secondary-500/75 backdrop-blur-[2px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-orange-500 rounded-full px-5 py-2 mb-3 shadow-md">
                <SpontiIcon className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white tracking-wide">FLASH DEALS</span>
                <span className="pulse-dot w-2 h-2 rounded-full bg-white ml-1" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Sponti Coupons
              </h2>
              <p className="text-gray-300 mt-1 text-base sm:text-lg">
                24-hour exclusive deals — grab them before they&apos;re gone
              </p>
            </div>
            <Link
              href="/deals?type=sponti_coupon"
              className="text-primary-400 font-semibold inline-flex items-center gap-1 hover:text-primary-300 transition-colors group"
            >
              See All Flash Deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Deal cards grid */}
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {deals.map((deal, i) => (
              <ScrollReveal key={deal.id} animation="fade-up" delay={i * 100}>
                <SpontiDealCard deal={deal} />
              </ScrollReveal>
            ))}
          </div>
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

function SpontiDealCard({ deal }: { deal: DealWithDistance }) {
  const savings = deal.original_price - deal.deal_price;
  const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

  return (
    <Link href={`/deals/${deal.id}`} className="block group h-full">
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 deal-card-shine relative ring-1 ring-white/20 h-full flex flex-col">
        {/* Image */}
        <div className="relative h-[180px] sm:h-[200px] overflow-hidden">
          <Image
            src={imageUrl}
            alt={deal.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              <SpontiIcon className="w-3 h-3" /> SPONTI COUPON
            </span>
            <span className="inline-flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full w-fit">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          </div>

          {/* Discount */}
          <div className="absolute top-3 right-3 bg-white text-primary-500 font-bold text-sm px-3 py-1.5 rounded-full shadow-lg">
            {formatPercentage(deal.discount_percentage)}% OFF
          </div>

          {/* Distance */}
          {deal.distance != null && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
              <MapPin className="w-2.5 h-2.5" /> {deal.distance.toFixed(1)} mi
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Countdown */}
          {deal.status === 'active' && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Clock className="w-3 h-3 text-primary-500" />
              <span>Expires in:</span>
              <CountdownTimer expiresAt={deal.expires_at} size="sm" />
            </div>
          )}

          <h3 className="font-bold text-secondary-500 text-base line-clamp-2 mb-2 group-hover:text-primary-500 transition-colors">
            {deal.title}
          </h3>

          {deal.vendor && (
            <p className="text-gray-400 text-xs mb-3">{deal.vendor.business_name}</p>
          )}

          {/* Pricing — pushed to bottom */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 line-through text-sm">{formatCurrency(deal.original_price)}</span>
              <span className="text-secondary-500 font-bold text-xl">{formatCurrency(deal.deal_price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                Save {formatCurrency(savings)}
              </span>
              {deal.deposit_amount && (
                <span className="text-gray-400 text-xs">
                  ${deal.deposit_amount} deposit
                </span>
              )}
            </div>
          </div>

          {/* Claims progress */}
          {deal.max_claims && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>{deal.claims_count} claimed</span>
                <span>{deal.max_claims - deal.claims_count} left</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
