'use client';

import { SpontiIcon } from './SpontiIcon';
import { Tag } from 'lucide-react';

/**
 * DealTypeBadge — highly visible badge that identifies the deal type at a glance.
 *
 * - Sponti: Solid orange pill with stopwatch icon + "Sponti" text
 * - Steady Deal: Solid navy pill with tag icon + "Steady" text
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
    sm: { icon: 'w-3.5 h-3.5', text: 'text-[10px]', padding: 'px-2 py-0.5', gap: 'gap-1' },
    md: { icon: 'w-4 h-4', text: 'text-xs', padding: 'px-2.5 py-1', gap: 'gap-1.5' },
    lg: { icon: 'w-5 h-5', text: 'text-sm', padding: 'px-3 py-1.5', gap: 'gap-1.5' },
  };

  const { icon, text, padding, gap } = sizeConfig[size];

  if (isSponti) {
    return (
      <div
        className={`
          inline-flex items-center ${gap}
          ${padding} rounded-full
          bg-primary-500 text-white
          font-bold ${text}
          shadow-lg shadow-primary-500/40
          sponti-glow
          ${className}
        `}
        title="Sponti — Spontaneous deal with countdown timer"
      >
        <SpontiIcon className={`${icon} text-white`} />
        <span>Sponti</span>
      </div>
    );
  }

  return (
    <div
      className={`
        inline-flex items-center ${gap}
        ${padding} rounded-full
        bg-secondary-500 text-white
        font-bold ${text}
        shadow-lg shadow-secondary-500/40
        ${className}
      `}
      title="Steady Deal — Everyday savings"
    >
      <Tag className={`${icon} text-white`} />
      <span>Steady</span>
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
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500 text-white font-bold text-[10px] shadow-md">
          <SpontiIcon className="w-3.5 h-3.5 text-white" />
          Sponti
        </div>
        <span className="text-gray-400">— Spontaneous deal, limited time</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-500 text-white font-bold text-[10px] shadow-md">
          <Tag className="w-3.5 h-3.5 text-white" />
          Steady
        </div>
        <span className="text-gray-400">— Everyday savings, longer duration</span>
      </div>
    </div>
  );
}
