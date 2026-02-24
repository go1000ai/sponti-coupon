import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Browse Deals — Coupons & Sponti Deals Near You',
  description:
    'Browse all available deals and Sponti Deals near you. Save up to 70% at verified local restaurants, spas, fitness centers, entertainment venues and more. Filter by category, distance, and deal type.',
  alternates: {
    canonical: `${BASE_URL}/deals`,
  },
  openGraph: {
    title: 'Browse Deals — Coupons & Sponti Deals Near You | SpontiCoupon',
    description:
      'Browse deals from verified local businesses. Save up to 70% on restaurants, spas, fitness & more with Sponti Coupons.',
    url: `${BASE_URL}/deals`,
    type: 'website',
  },
};

export default function DealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
