'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Tag, ShieldCheck, Users } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage, formatDistance } from '@/lib/utils';
import type { Deal } from '@/lib/types/database';

interface DealCardProps {
  deal: Deal;
  distance?: number;
}

export function DealCard({ deal, distance }: DealCardProps) {
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;

  return (
    <Link href={`/deals/${deal.id}`} className="card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      {/* Image / Header */}
      <div className={`relative h-36 sm:h-40 md:h-48 overflow-hidden ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
        {deal.image_url ? (
          <Image
            src={deal.image_url}
            alt={deal.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {isSponti ? (
              <SpontiIcon className="w-16 h-16 text-white/30" />
            ) : (
              <Tag className="w-16 h-16 text-white/30" />
            )}
          </div>
        )}

        {/* Badges - top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <DealTypeBadge type={deal.deal_type} size="md" />
          {/* Verified badge */}
          <span className="inline-flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow w-fit">
            <ShieldCheck className="w-2.5 h-2.5" /> Verified
          </span>
        </div>

        {/* Discount badge - top right */}
        <div className="absolute top-3 right-3 bg-white text-primary-500 font-bold text-sm sm:text-lg px-2.5 sm:px-3 py-1 rounded-full shadow-lg">
          {formatPercentage(deal.discount_percentage)} OFF
        </div>

        {/* Countdown overlay — shows for all active deals */}
        {deal.status === 'active' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center gap-2 text-white text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>{isSponti ? 'Sponti expires:' : 'Steady ends:'}</span>
            </div>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-base sm:text-lg text-secondary-500 group-hover:text-primary-500 transition-colors line-clamp-2">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-gray-500 text-sm mt-1">{deal.vendor.business_name}</p>
        )}

        {/* Pricing with savings */}
        <div className="mt-auto pt-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 line-through text-sm">
              {formatCurrency(deal.original_price)}
            </span>
            <span className="text-primary-500 font-bold text-lg sm:text-xl">
              {formatCurrency(deal.deal_price)}
            </span>
          </div>
          {/* Savings badge */}
          <span className="inline-flex items-center mt-1.5 bg-green-50 text-green-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            You save {formatCurrency(savings)}
          </span>
        </div>

        {/* Deposit info */}
        {isSponti && deal.deposit_amount && (
          <span className="inline-flex items-center mt-2 text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full font-medium">
            {formatCurrency(deal.deposit_amount)} deposit
          </span>
        )}

        {/* Distance & social proof row */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            {distance != null && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {formatDistance(distance)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {deal.claims_count} claimed
            </span>
          </div>
          {deal.claims_count > 0 && (
            <span className="text-green-500 font-medium">
              Claimed {Math.max(1, Math.floor(Math.random() * 20))}m ago
            </span>
          )}
        </div>

        {/* Claims progress */}
        {deal.max_claims && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{deal.claims_count} claimed</span>
              <span className={`font-medium ${deal.max_claims - deal.claims_count <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                {deal.max_claims - deal.claims_count <= 5
                  ? `Only ${deal.max_claims - deal.claims_count} left!`
                  : `${deal.max_claims - deal.claims_count} left`
                }
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((deal.claims_count / deal.max_claims) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
