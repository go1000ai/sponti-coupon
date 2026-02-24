/**
 * SpontiIcon — the official Sponti Coupon stopwatch logo mark.
 * Uses the actual brand stopwatch image from IconSpontiCoupon.
 */

import Image from 'next/image';

interface SpontiIconProps {
  className?: string;
  /** @deprecated color prop is no longer used — image has its own colors */
  color?: string;
}

export function SpontiIcon({ className = 'w-4 h-4' }: SpontiIconProps) {
  return (
    <Image
      src="/icons/stopwatch.png"
      alt=""
      width={48}
      height={48}
      className={className}
      aria-hidden="true"
    />
  );
}
