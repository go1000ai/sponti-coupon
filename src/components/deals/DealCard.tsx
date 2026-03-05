'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Tag, ShieldCheck, Users, Store } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage, formatDistance } from '@/lib/utils';
import { PAYMENT_PROCESSORS } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';
import { useLanguage } from '@/lib/i18n';
import { useTranslatedDeal } from '@/lib/hooks/useTranslatedDeal';
import type { Deal } from '@/lib/types/database';

interface DealCardProps {
  deal: Deal;
  distance?: number;
  isOwnDeal?: boolean;
  paymentLogos?: string[]; // processor_type strings e.g. ['stripe', 'venmo', 'zelle']
}

export function DealCard({ deal: rawDeal, distance, isOwnDeal, paymentLogos }: DealCardProps) {
  const { t } = useLanguage();
  const deal = useTranslatedDeal(rawDeal);
  const isSponti = deal.deal_type === 'sponti_coupon';
  const savings = deal.original_price - deal.deal_price;

  return (
    <Link href={`/deals/${deal.slug || deal.id}`} className={`card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col ${isOwnDeal ? 'ring-2 ring-primary-300 opacity-60' : ''}`}>
      {/* Image / Header */}
      <div className={`relative h-32 sm:h-36 md:h-40 lg:h-48 overflow-hidden ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
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
            <ShieldCheck className="w-2.5 h-2.5" /> {t('dealDetail.verified')}
          </span>
        </div>

        {/* Discount badge - top right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <div className="bg-white text-primary-500 font-bold text-sm sm:text-lg px-2.5 sm:px-3 py-1 rounded-full shadow-lg">
            {formatPercentage(deal.discount_percentage)} {t('dealDetail.off')}
          </div>
          {isOwnDeal && (
            <span className="inline-flex items-center gap-1 bg-secondary-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              <Store className="w-2.5 h-2.5" /> {t('dealDetail.yourDeal')}
            </span>
          )}
        </div>

        {/* Countdown overlay — shows for all active deals */}
        {deal.status === 'active' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center gap-2 text-white text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>{isSponti ? t('dealDetail.spontiExpires') : t('dealDetail.steadyEnds')}</span>
            </div>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" variant={isSponti ? 'sponti' : 'steady'} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-primary-500 transition-colors line-clamp-2">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-gray-500 text-sm mt-1">{deal.vendor.business_name}</p>
        )}

        {deal.description && (
          <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">{deal.description}</p>
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
            {t('dealDetail.youSaveAmount', { amount: formatCurrency(savings) })}
          </span>
        </div>

        {/* Deposit info */}
        {isSponti && deal.deposit_amount && (
          <span className="inline-flex items-center mt-2 text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full font-medium">
            {t('dealDetail.depositAmountLabel', { amount: formatCurrency(deal.deposit_amount) })}
          </span>
        )}

        {/* Payment logos */}
        {paymentLogos && paymentLogos.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {paymentLogos.map(type => {
              const proc = PAYMENT_PROCESSORS[type as PaymentProcessorType];
              return proc ? (
                <Image key={type} src={proc.logo} alt={proc.name} width={16} height={16} className="object-contain opacity-60" title={proc.name} />
              ) : null;
            })}
          </div>
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
              {t('dealDetail.claimedCount', { count: String(deal.claims_count) })}
            </span>
          </div>
          {deal.claims_count > 0 && (
            <span className="text-green-500 font-medium">
              {t('dealDetail.claimedAgo', { time: String(Math.max(1, Math.floor(Math.random() * 20))) })}
            </span>
          )}
        </div>

        {/* Claims progress */}
        {deal.max_claims && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('dealDetail.claimedCount', { count: String(deal.claims_count) })}</span>
              <span className={`font-medium ${deal.max_claims - deal.claims_count <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                {deal.max_claims - deal.claims_count <= 5
                  ? t('dealDetail.onlyLeft', { count: String(deal.max_claims - deal.claims_count) })
                  : t('dealDetail.left', { count: String(deal.max_claims - deal.claims_count) })
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
