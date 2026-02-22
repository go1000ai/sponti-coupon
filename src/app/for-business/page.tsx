import { ForBusinesses } from '@/components/landing/ForBusinesses';
import { CompetitorComparison } from '@/components/landing/CompetitorComparison';
import { StatsSection } from '@/components/landing/StatsSection';
import { CTASection } from '@/components/landing/CTASection';

export const metadata = {
  title: 'For Business Owners | SpontiCoupon',
  description: 'List your deals with zero commission. Flat monthly pricing with direct Stripe deposits.',
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
