'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowRight, Clock, MapPin, Eye, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null };

export function BentoDeals() {
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const { lat, lng } = useGeolocation();

  useEffect(() => {
    async function fetchDeals() {
      try {
        const params = new URLSearchParams({ limit: '5' });
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
    fetchDeals();
  }, [lat, lng]);

  if (loading) {
    return (
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="h-[400px] sm:h-[480px] bg-gray-200 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[190px] sm:h-[228px] bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  const heroDeal = deals[0];
  const gridDeals = deals.slice(1, 5);

  return (
    <section className="py-10 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-orange-500 rounded-full px-5 py-2 mb-3 shadow-md">
                <SpontiIcon className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white tracking-wide">SPONTI DEALS</span>
                <span className="pulse-dot w-2 h-2 rounded-full bg-white ml-1" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary-500">
                Sponti Deals
              </h2>
              <p className="text-gray-500 mt-2 text-base sm:text-lg">
                Flash deals with the biggest savings — grab them before they&apos;re gone
              </p>
            </div>
            <Link
              href="/deals"
              className="text-primary-500 font-semibold inline-flex items-center gap-1 hover:text-primary-600 transition-colors group"
            >
              View All Deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Hero Deal - Large */}
          <ScrollReveal animation="fade-up">
            <HeroDealCard deal={heroDeal} />
          </ScrollReveal>

          {/* 4 Smaller Deals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {gridDeals.map((deal, i) => (
              <ScrollReveal key={deal.id} animation="fade-up" delay={(i + 1) * 100}>
                <SmallDealCard deal={deal} />
              </ScrollReveal>
            ))}
            {/* Fill empty slots */}
            {gridDeals.length < 4 && [...Array(4 - gridDeals.length)].map((_, i) => (
              <div key={`placeholder-${i}`} className="rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                <div className="text-center p-4">
                  <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">More deals coming soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>

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

function HeroDealCard({ deal }: { deal: DealWithDistance }) {
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;
  const fakeViewers = 12 + Math.floor(Math.random() * 30);
  const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

  return (
    <Link href={`/deals/${deal.id}`} className="bento-card deal-card-shine block h-[400px] sm:h-[480px]">
      {/* Background */}
      <div className={`absolute inset-0 ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
        <Image src={imageUrl} alt={deal.title} fill className="object-cover bento-image transition-transform duration-700" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg ${isSponti ? 'bg-primary-500' : 'bg-secondary-500'}`}>
            {isSponti ? <SpontiIcon className="w-3 h-3" /> : null}
            {isSponti ? 'SPONTI COUPON' : 'REGULAR DEAL'}
          </span>
          <span className="inline-flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg w-fit">
            <ShieldCheck className="w-3 h-3" /> Verified Business
          </span>
        </div>
        <div className="bg-white text-primary-500 font-bold text-xl sm:text-2xl px-4 py-2 rounded-2xl shadow-lg">
          {formatPercentage(deal.discount_percentage)} OFF
        </div>
      </div>

      {/* Live viewers + distance */}
      <div className="absolute sm:bottom-[140px] sm:right-4 top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-auto z-10 flex items-center gap-2">
        {deal.distance != null && (
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            <MapPin className="w-3 h-3" />
            <span>{deal.distance.toFixed(1)} mi</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
          <Eye className="w-3 h-3" />
          <span className="hidden sm:inline">{fakeViewers} viewing</span>
        </div>
      </div>

      {/* Claimed ago social proof */}
      {deal.claims_count > 0 && (
        <div className="absolute bottom-[100px] sm:bottom-[100px] left-4 z-10">
          <div className="flex items-center gap-1.5 bg-green-500/80 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>Claimed {Math.max(1, Math.floor(Math.random() * 15))} min ago</span>
          </div>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-10">
        {/* Countdown for Sponti */}
        {isSponti && deal.status === 'active' && (
          <div className="flex items-center gap-2 text-white text-xs mb-3">
            <Clock className="w-3 h-3" />
            <span>Expires in:</span>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" />
          </div>
        )}

        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-white/70 text-sm mb-3">{deal.vendor.business_name}</p>
        )}

        <div className="flex items-end justify-between">
          <div>
            <span className="text-white/50 line-through text-sm mr-2">
              {formatCurrency(deal.original_price)}
            </span>
            <span className="text-white font-bold text-2xl sm:text-3xl">
              {formatCurrency(deal.deal_price)}
            </span>
            <span className="ml-2 bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full">
              You save {formatCurrency(savings)}
            </span>
          </div>

          {deal.max_claims && (
            <div className="text-right hidden sm:block">
              <div className="text-white/60 text-xs mb-1">{deal.max_claims - deal.claims_count} left</div>
              <div className="w-24 bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full"
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

function SmallDealCard({ deal }: { deal: DealWithDistance }) {
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;
  const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

  return (
    <Link href={`/deals/${deal.id}`} className="bento-card deal-card-shine block h-[190px] sm:h-[228px]">
      {/* Background */}
      <div className={`absolute inset-0 ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
        <Image src={imageUrl} alt={deal.title} fill className="object-cover bento-image transition-transform duration-700" />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start z-10">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white ${isSponti ? 'bg-primary-500' : 'bg-secondary-500'}`}>
          {isSponti ? <SpontiIcon className="w-2.5 h-2.5" /> : null}
          {isSponti ? 'SPONTI' : 'DEAL'}
        </span>
        <span className="bg-white text-primary-500 font-bold text-xs px-2 py-1 rounded-full shadow-md">
          {formatPercentage(deal.discount_percentage)}%
        </span>
      </div>

      {/* Distance badge */}
      {deal.distance != null && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10">
          <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
            <MapPin className="w-2.5 h-2.5" /> {deal.distance.toFixed(1)} mi
          </span>
        </div>
      )}

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10">
        <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 mb-1.5">
          {deal.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-white/50 line-through text-xs">
            {formatCurrency(deal.original_price)}
          </span>
          <span className="text-white font-bold text-base sm:text-lg">
            {formatCurrency(deal.deal_price)}
          </span>
        </div>
        <span className="text-green-400 text-[10px] font-medium">
          Save {formatCurrency(savings)}
        </span>
      </div>
    </Link>
  );
}
