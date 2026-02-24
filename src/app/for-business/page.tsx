import type { Metadata } from 'next';
import { ForBusinesses } from '@/components/landing/ForBusinesses';
import { CompetitorComparison } from '@/components/landing/CompetitorComparison';
import { StatsSection } from '@/components/landing/StatsSection';
import { CTASection } from '@/components/landing/CTASection';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'For Business Owners — List Deals & Attract Customers',
  description:
    'Grow your local business with SpontiCoupon. Post Sponti Deals with zero commission — flat monthly pricing with direct deposits. Attract new customers with Sponti Coupons and 24-hour Sponti Deals.',
  alternates: {
    canonical: `${BASE_URL}/for-business`,
  },
  openGraph: {
    title: 'For Business Owners — List Deals & Attract Customers | SpontiCoupon',
    description:
      'Post Sponti Deals with zero commission. Flat monthly pricing, direct deposits, QR code redemption.',
    url: `${BASE_URL}/for-business`,
    type: 'website',
  },
};

export default function ForBusinessPage() {
  return (
    <div>
      <ForBusinesses />
      <CompetitorComparison />
      <StatsSection />
      <CTASection />
    </div>
  );
}
