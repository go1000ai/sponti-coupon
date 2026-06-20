'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Tag, Users, Store } from 'lucide-react';
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
  const [descExpanded, setDescExpanded] = useState(false);

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

        {/* Countdown overlay — DESKTOP only (mobile shows it below the image to keep the photo clear) */}
        {deal.status === 'active' && (
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className={`flex items-center gap-2 text-xs mb-1 font-bold ${isSponti ? 'text-primary-300' : 'text-white'}`}>
              <Clock className="w-3 h-3" />
              <span>{isSponti ? t('dealDetail.spontiExpires') : t('dealDetail.steadyEnds')}</span>
            </div>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" variant={isSponti ? 'sponti' : 'steady'} hideSeconds />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {/* Countdown timer BELOW the image — MOBILE only */}
        {deal.status === 'active' && (
          <div className="sm:hidden mb-2">
            <div className={`flex items-center gap-1 text-[10px] font-bold mb-0.5 ${isSponti ? 'text-primary-600' : 'text-secondary-600'}`}>
              <Clock className="w-2.5 h-2.5" />
              <span>{isSponti ? t('dealDetail.spontiExpires') : t('dealDetail.steadyEnds')}</span>
            </div>
            <CountdownTimer expiresAt={deal.expires_at} size="sm" variant={isSponti ? 'sponti' : 'steady'} hideSeconds />
          </div>
        )}
        <h3 className="font-bold text-sm sm:text-lg text-gray-900 group-hover:text-primary-500 transition-colors line-clamp-2">
          {deal.title}
        </h3>

        {deal.vendor && (
          <p className="text-gray-500 text-xs sm:text-sm mt-1 line-clamp-1">{deal.vendor.business_name}</p>
        )}

        {deal.description && (
          <div className="hidden sm:block mt-1">
            <p
              className="text-gray-500 text-xs leading-relaxed"
              style={descExpanded ? undefined : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {deal.description}
            </p>
            {deal.description.length > 90 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDescExpanded((v) => !v); }}
                className="text-[11px] font-semibold text-primary-500 hover:text-primary-600 mt-0.5"
              >
                {descExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
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
          <div className="hidden sm:flex items-center gap-1.5 mt-2">
            {paymentLogos.map(type => {
              const proc = PAYMENT_PROCESSORS[type as PaymentProcessorType];
              return proc ? (
                <Image key={type} src={proc.logo} alt={proc.name} width={16} height={16} className="object-contain opacity-60" title={proc.name} />
              ) : null;
            })}
          </div>
        )}

        {/* Distance & social proof row */}
        <div className="hidden sm:flex items-center justify-between mt-3 text-xs text-gray-400">
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
              <span className={`font-medium ${Math.max(0, deal.max_claims - deal.claims_count) <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                {Math.max(0, deal.max_claims - deal.claims_count) <= 5
                  ? t('dealDetail.onlyLeft', { count: String(Math.max(0, deal.max_claims - deal.claims_count)) })
                  : t('dealDetail.left', { count: String(Math.max(0, deal.max_claims - deal.claims_count)) })
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
