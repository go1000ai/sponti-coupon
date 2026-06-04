'use client';

import Link from 'next/link';
import { Gift, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { useLanguage } from '@/lib/i18n';

interface PromoCountdownBannerProps {
  promoExpiresAt: string;
  promoCode?: string | null;
}

// Promos that grant Business-tier access (already on top tier — no "upgrade" CTA needed)
const BUSINESS_TIER_PROMOS = new Set(['FOUNDING15', 'PUERTORICO6']);

export function PromoCountdownBanner({ promoExpiresAt, promoCode }: PromoCountdownBannerProps) {
  const { days, hours, minutes, expired } = useCountdown(promoExpiresAt);
  const { t } = useLanguage();

  const isFoundingTier = !!promoCode && BUSINESS_TIER_PROMOS.has(promoCode.toUpperCase());

  if (expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">
              {t('vendor.promo.expired') || 'Your free period has ended'}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {t('vendor.promo.expiredDesc') || 'Subscribe to keep your deals active and continue growing your business.'}
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold text-sm transition-colors shrink-0"
        >
          {t('vendor.promo.subscribe') || 'Subscribe Now'} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const isUrgent = days < 7;
  const isWarning = days < 30;

  const borderColor = isUrgent ? 'border-red-300' : isWarning ? 'border-orange-300' : 'border-green-300';
  const bgColor = isUrgent ? 'bg-red-50' : isWarning ? 'bg-orange-50' : 'bg-green-50';
  const iconColor = isUrgent ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-green-500';
  const textColor = isUrgent ? 'text-red-800' : isWarning ? 'text-orange-800' : 'text-green-800';
  const subTextColor = isUrgent ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-green-600';
  const badgeBg = isUrgent ? 'bg-red-100 text-red-700' : isWarning ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';

  // Choose copy based on whether the vendor is already on Business tier via promo
  const planLabel = isFoundingTier
    ? t('vendor.promo.foundingVendorPlan') || 'Founding Vendor — Business Plan'
    : t('vendor.promo.freeProPlan') || 'Free Pro Plan';

  const bodyText = isFoundingTier
    ? (isUrgent
        ? (t('vendor.promo.foundingExpiringUrgent') || 'Founding-vendor trial ending soon! Pick a plan now to keep your deals live.')
        : isWarning
          ? (t('vendor.promo.foundingExpiringWarning') || 'Your founding-vendor trial ends soon. Pick a plan to keep Business features.')
          : (t('vendor.promo.foundingEnjoying') || 'Enjoying full Business-plan access — AI tools, advanced analytics, multi-location, all included.'))
    : (isUrgent
        ? (t('vendor.promo.expiringUrgent') || 'Your free period is ending soon! Upgrade to keep all features.')
        : isWarning
          ? (t('vendor.promo.expiringWarning') || 'Your free period ends soon. Pick a plan to stay on Business.')
          : (t('vendor.promo.enjoying') || 'Enjoying your free Pro plan. Upgrade to Business anytime for AI features.'));

  // Founding vendors don't need an "Upgrade to Business" CTA — they're already on Business
  const ctaText = isFoundingTier
    ? (t('vendor.promo.keepBusiness') || t('vendor.promo.viewPlans') || 'View Plans')
    : (t('vendor.promo.upgradeBusiness') || 'Upgrade to Business');

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 mb-6 ${isUrgent ? 'animate-pulse' : ''}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Gift className={`w-5 h-5 ${iconColor} shrink-0`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-bold ${textColor}`}>{planLabel}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                {days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`} {t('vendor.promo.remaining') || 'remaining'}
              </span>
            </div>
            <p className={`text-xs ${subTextColor} mt-0.5`}>{bodyText}</p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold text-sm transition-colors shrink-0"
        >
          {ctaText} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
