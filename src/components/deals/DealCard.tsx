'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Zap, Clock, MapPin, Tag } from 'lucide-react';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Deal } from '@/lib/types/database';

interface DealCardProps {
  deal: Deal;
  distance?: number;
}

export function DealCard({ deal, distance }: DealCardProps) {
  const isSponti = deal.deal_type === 'sponti_coupon';

  return (
    <Link href={`/deals/${deal.id}`} className="card group hover:shadow-lg transition-shadow">
      {/* Image / Header */}
      <div className={`relative h-48 ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
        {deal.image_url ? (
          <Image
            src={deal.image_url}
            alt={deal.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {isSponti ? (
              <Zap className="w-16 h-16 text-white/30" />
            ) : (
              <Tag className="w-16 h-16 text-white/30" />
            )}
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-3 left-3">
          {isSponti ? (
            <span className="bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <Zap className="w-3 h-3" /> SPONTI COUPON
            </span>
          ) : (
            <span className="bg-secondary-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              REGULAR DEAL
            </span>
          )}
        </div>

        {/* Discount badge */}
        <div className="absolute top-3 right-3 bg-white text-primary-500 font-bold text-lg px-3 py-1 rounded-full shadow-lg">
          {formatPercentage(deal.discount_percentage)} OFF
        </div>

        {/* Countdown overlay for Sponti deals */}
        {isSponti && deal.status === 'active' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center gap-2 text-white text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>Expires in:</span>
            </div>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-secondary-500 group-hover:text-primary-500 transition-colors line-clamp-2">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-gray-500 text-sm mt-1">{deal.vendor.business_name}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 line-through text-sm">
              {formatCurrency(deal.original_price)}
            </span>
            <span className="text-primary-500 font-bold text-xl">
              {formatCurrency(deal.deal_price)}
            </span>
          </div>

          {isSponti && deal.deposit_amount && (
            <span className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full font-medium">
              {formatCurrency(deal.deposit_amount)} deposit
            </span>
          )}
        </div>

        {distance !== undefined && (
          <div className="flex items-center gap-1 text-gray-400 text-xs mt-2">
            <MapPin className="w-3 h-3" />
            <span>{distance.toFixed(1)} miles away</span>
          </div>
        )}

        {deal.max_claims && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{deal.claims_count} claimed</span>
              <span>{deal.max_claims - deal.claims_count} left</span>
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
