'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Eye, ShieldCheck, Star, Users, ArrowRight } from 'lucide-react';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import type { Deal } from '@/lib/types/database';

type DealWithDistance = Deal & { distance?: number | null; is_featured?: boolean };

const CARD_WIDTH = 'w-[calc(100vw-3rem)] sm:w-[calc(85vw-2rem)] lg:w-[calc(70vw-3rem)] lg:max-w-[900px]';

interface CarouselDealCardProps {
  deal: DealWithDistance;
  /** Visual variant */
  variant?: 'default' | 'sponti' | 'dark-bg';
  /** Show countdown timer */
  showCountdown?: boolean;
  /** Show rank badge (#1, #2, etc.) */
  rank?: number;
  /** Card height class override */
  heightClass?: string;
}

export function CarouselDealCard({
  deal,
  variant = 'default',
  showCountdown = false,
  rank,
  heightClass = 'h-[280px] sm:h-[320px] lg:h-[360px]',
}: CarouselDealCardProps) {
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;
  const fakeViewers = 12 + Math.floor(Math.random() * 30);
  const imageUrl = getDealImage(deal.image_url, deal.vendor?.category);

  const fallbackGradient = isSponti
    ? 'bg-gradient-to-br from-primary-500 to-primary-700'
    : 'bg-gradient-to-br from-secondary-400 to-secondary-600';

  const ringClass = variant === 'dark-bg' ? 'ring-1 ring-white/20' : '';

  return (
    <Link
      href={`/deals/${deal.id}`}
      className={`snap-start shrink-0 ${CARD_WIDTH} ${heightClass} block relative rounded-2xl overflow-hidden deal-card-shine group ${ringClass}`}
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1.5">
          <DealTypeBadge type={deal.deal_type} size="md" />
          <span className="inline-flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md w-fit">
            <ShieldCheck className="w-2.5 h-2.5" /> Verified
          </span>
          {deal.is_featured && (
            <span className="inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md w-fit">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="bg-white text-primary-500 font-bold text-sm sm:text-base px-3 py-1.5 rounded-2xl shadow-lg">
            {formatPercentage(deal.discount_percentage)} OFF
          </span>
          {rank && (
            <span className="bg-white/90 backdrop-blur-sm font-bold text-xs text-secondary-500 w-7 h-7 rounded-full flex items-center justify-center shadow-md">
              #{rank}
            </span>
          )}
        </div>
      </div>

      {/* Distance + viewers */}
      <div className="absolute bottom-[100px] sm:bottom-[110px] right-4 z-10 flex items-center gap-2">
        {deal.distance != null && (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full">
            <MapPin className="w-3 h-3" />
            <span>{deal.distance.toFixed(1)} mi</span>
          </div>
        )}
        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full">
          <Eye className="w-3 h-3" />
          <span>{fakeViewers} viewing</span>
        </div>
      </div>

      {/* Social proof */}
      {deal.claims_count > 0 && (
        <div className="absolute bottom-[100px] sm:bottom-[110px] left-4 z-10">
          <div className="flex items-center gap-1 bg-green-500/80 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>Claimed {Math.max(1, Math.floor(Math.random() * 15))} min ago</span>
          </div>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
        {/* Countdown */}
        {(showCountdown || (isSponti && deal.status === 'active')) && (
          <div className="flex items-center gap-2 text-white text-xs mb-2">
            <Clock className="w-3 h-3" />
            <span>Expires in:</span>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" />
          </div>
        )}

        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 line-clamp-2">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-white/70 text-sm mb-2">{deal.vendor.business_name}</p>
        )}

        <div className="flex items-end justify-between">
          <div>
            <span className="text-white/50 line-through text-sm mr-2">
              {formatCurrency(deal.original_price)}
            </span>
            <span className="text-white font-bold text-xl sm:text-2xl">
              {formatCurrency(deal.deal_price)}
            </span>
            <span className="ml-2 bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              Save {formatCurrency(savings)}
            </span>
          </div>

          {deal.max_claims && (
            <div className="text-right hidden sm:block">
              <div className="text-white/60 text-xs mb-1">{deal.max_claims - deal.claims_count} left</div>
              <div className="w-20 bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Deposit info for Sponti deals */}
        {isSponti && deal.deposit_amount && (
          <div className="mt-2">
            <span className="text-white/60 text-xs">${deal.deposit_amount} deposit</span>
          </div>
        )}
      </div>
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
    <div className={`snap-start shrink-0 ${CARD_WIDTH} h-[280px] sm:h-[320px] lg:h-[360px]`}>
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
            className={`w-10 h-10 mx-auto mb-3 transition-colors ${
              variant === 'dark'
                ? 'text-white/40 group-hover:text-primary-400'
                : 'text-gray-300 group-hover:text-primary-500'
            }`}
          />
          <span
            className={`text-lg font-semibold transition-colors ${
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
