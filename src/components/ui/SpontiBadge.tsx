'use client';

import { SpontiIcon } from './SpontiIcon';
import { Tag } from 'lucide-react';

/**
 * DealTypeBadge — glowing icon badge that identifies the deal type at a glance.
 *
 * - Sponti Coupon: Orange stopwatch icon with pulsing orange glow
 * - Regular Deal: Navy tag icon with subtle navy glow
 *
 * Replaces the old text badges ("SPONTI COUPON" / "REGULAR DEAL") with
 * recognizable icons so customers learn the visual language.
 *
 * Sizes: "sm" for small cards, "md" for standard cards, "lg" for detail pages.
 */

interface DealTypeBadgeProps {
  type: 'sponti_coupon' | 'regular' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DealTypeBadge({ type, size = 'md', className = '' }: DealTypeBadgeProps) {
  const isSponti = type === 'sponti_coupon';

  const sizeConfig = {
    sm: { outer: 'w-7 h-7', icon: 'w-4 h-4' },
    md: { outer: 'w-9 h-9', icon: 'w-5 h-5' },
    lg: { outer: 'w-11 h-11', icon: 'w-6 h-6' },
  };

  const { outer, icon } = sizeConfig[size];

  if (isSponti) {
    return (
      <div
        className={`
          inline-flex items-center justify-center
          ${outer} rounded-full
          bg-white shadow-lg
          ring-2 ring-primary-500/70
          sponti-glow
          ${className}
        `}
        title="Sponti Coupon — Flash deal with countdown timer"
      >
        <SpontiIcon className={`${icon} text-primary-500`} />
      </div>
    );
  }

  return (
    <div
      className={`
        inline-flex items-center justify-center
        ${outer} rounded-full
        bg-white shadow-lg
        ring-2 ring-secondary-500/50
        ${className}
      `}
      title="Regular Deal"
    >
      <Tag className={`${icon} text-secondary-500`} />
    </div>
  );
}

/**
 * DealTypeLegend — a small legend that explains what each deal type badge means.
 * Place this on browse/listing pages so users learn the visual language.
 */
export function DealTypeLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-4 text-xs text-gray-500 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow ring-[1.5px] ring-primary-500/70 sponti-glow">
          <SpontiIcon className="w-3.5 h-3.5 text-primary-500" />
        </div>
        <span className="font-medium">Sponti Coupon</span>
        <span className="text-gray-400">— Flash deal, limited time</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow ring-[1.5px] ring-secondary-500/50">
          <Tag className="w-3.5 h-3.5 text-secondary-500" />
        </div>
        <span className="font-medium">Regular Deal</span>
        <span className="text-gray-400">— Standard coupon, longer duration</span>
      </div>
    </div>
  );
}
