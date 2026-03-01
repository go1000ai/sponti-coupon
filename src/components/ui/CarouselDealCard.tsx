'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Star, ArrowRight, Store } from 'lucide-react';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null; is_featured?: boolean };

const CARD_WIDTH = 'w-[calc(100%-1rem)] max-w-[calc(100vw-3rem)] sm:w-[280px] lg:w-[300px]';

interface CarouselDealCardProps {
  deal: DealWithDistance;
  variant?: 'default' | 'sponti' | 'dark-bg';
  showCountdown?: boolean;
  rank?: number;
  heightClass?: string;
  isOwnDeal?: boolean;
}

export function CarouselDealCard({
  deal,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant = 'default',
  showCountdown = false,
  rank,
  heightClass = 'h-[320px] sm:h-[340px] lg:h-[360px]',
  isOwnDeal,
}: CarouselDealCardProps) {
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;
  const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

  const fallbackGradient = isSponti
    ? 'bg-gradient-to-br from-primary-500 to-primary-700'
    : 'bg-gradient-to-br from-secondary-400 to-secondary-600';

  const glowColor = isSponti ? 'shadow-primary-500/30' : 'shadow-accent-500/20';

  return (
    <Link
      href={`/deals/${deal.slug || deal.id}`}
      className={`snap-start shrink-0 ${CARD_WIDTH} ${heightClass} block relative rounded-2xl overflow-hidden deal-card-shine group
        shadow-lg ${glowColor} hover:shadow-xl hover:shadow-primary-500/40
        ring-1 ring-white/10 hover:ring-primary-400/50
        hover:-translate-y-1 transition-all duration-500 ease-out ${isOwnDeal ? 'opacity-50' : ''}`}
    >
      {/* Background image */}
      <div className={`absolute inset-0 ${fallbackGradient}`}>
        <Image
          src={imageUrl}
          alt={deal.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>

      {/* Gradient overlay — stronger at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Hover glow border overlay */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-primary-400/30 transition-all duration-500 z-20 pointer-events-none" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
        <div className="flex items-center gap-1.5">
          <DealTypeBadge type={deal.deal_type} size="sm" />
          {deal.is_featured && (
            <span className="inline-flex items-center gap-0.5 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
          {deal.distance != null && (
            <span className="flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
              <MapPin className="w-2.5 h-2.5" /> {deal.distance.toFixed(1)} mi
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isOwnDeal && (
            <span className="inline-flex items-center gap-0.5 bg-secondary-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
              <Store className="w-2.5 h-2.5" /> Your Deal
            </span>
          )}
          {rank && (
            <span className="bg-white/90 backdrop-blur-sm font-bold text-[10px] text-gray-900 w-6 h-6 rounded-full flex items-center justify-center shadow-md">
              #{rank}
            </span>
          )}
          <span className="bg-white text-primary-500 font-bold text-xs px-2.5 py-1 rounded-full shadow-md">
            {formatPercentage(deal.discount_percentage)} OFF
          </span>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        {/* Countdown */}
        {(showCountdown || (isSponti && deal.status === 'active')) && (
          <div className="flex items-center gap-1.5 text-white/80 text-[11px] mb-2">
            <Clock className="w-3 h-3 text-primary-400" />
            <CountdownTimer expiresAt={deal.expires_at} size="sm" variant={isSponti ? 'sponti' : 'steady'} />
          </div>
        )}

        <h3 className="text-base font-bold text-white mb-1 leading-tight">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-white/60 text-xs mb-3">{deal.vendor.business_name}</p>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-white font-bold text-xl">
            {formatCurrency(deal.deal_price)}
          </span>
          <span className="text-white/40 line-through text-sm">
            {formatCurrency(deal.original_price)}
          </span>
        </div>
        <span className="inline-block bg-green-500/20 text-green-400 text-[11px] font-semibold px-2 py-0.5 rounded-full">
          Save {formatCurrency(savings)}
        </span>

        {/* Claims progress */}
        {deal.max_claims && (
          <div className="mt-2.5">
            <div className="w-full bg-white/15 rounded-full h-1">
              <div
                className="bg-primary-500 h-1 rounded-full"
                style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-white/50 mt-0.5">{deal.max_claims - deal.claims_count} left</p>
          </div>
        )}
      </div>

      {/* Bottom accent glow line */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] z-20 opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${
        isSponti
          ? 'bg-gradient-to-r from-transparent via-primary-500 to-transparent'
          : 'bg-gradient-to-r from-transparent via-accent-400 to-transparent'
      }`} />
    </Link>
  );
}

/* ── View All Card (last slot in carousel) ── */

interface ViewAllCardProps {
  href: string;
  variant?: 'light' | 'dark';
}

export function ViewAllCard({ href, variant = 'light' }: ViewAllCardProps) {
  return (
    <div className={`snap-start shrink-0 ${CARD_WIDTH} h-[320px] sm:h-[340px] lg:h-[360px]`}>
      <Link
        href={href}
        className={`flex items-center justify-center h-full rounded-2xl border-2 border-dashed transition-all group ${
          variant === 'dark'
            ? 'border-white/30 hover:border-primary-400 hover:bg-white/5'
            : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
        }`}
      >
        <div className="text-center">
          <ArrowRight
            className={`w-8 h-8 mx-auto mb-2 transition-colors ${
              variant === 'dark'
                ? 'text-white/40 group-hover:text-primary-400'
                : 'text-gray-300 group-hover:text-primary-500'
            }`}
          />
          <span
            className={`text-sm font-semibold transition-colors ${
              variant === 'dark'
                ? 'text-white/50 group-hover:text-primary-400'
                : 'text-gray-400 group-hover:text-primary-500'
            }`}
          >
            View All Deals
          </span>
        </div>
      </Link>
    </div>
  );
}
