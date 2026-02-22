import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { LiveActivity } from '@/components/landing/LiveActivity';
import { BentoDeals } from '@/components/landing/BentoDeals';
import { CategoryGrid } from '@/components/landing/CategoryGrid';
import { SpontiDealsShowcase } from '@/components/landing/SpontiDealsShowcase';
import { TrendingDeals } from '@/components/landing/TrendingDeals';
import { DealsGrid } from '@/components/landing/DealsGrid';
import { DealMapPreview } from '@/components/landing/DealMapPreview';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FeaturesAccordion } from '@/components/landing/FeaturesAccordion';
import { CTASection } from '@/components/landing/CTASection';
import { PreferencePicker } from '@/components/ui/PreferencePicker';
import { MobileStickyDealCTA } from '@/components/ui/MobileStickyDealCTA';

export default function Home() {
  return (
    <div>
      {/* Preference picker for new visitors */}
      <PreferencePicker />

      {/* 1. Hero — parallax + search autocomplete + image accordion */}
      <HeroSection />

      {/* 2. Social proof strip — trust metrics */}
      <SocialProofBar />

      {/* 3. How it works — understand value prop early */}
      <HowItWorks />

      {/* 4. Live activity feed — real-time deal claims */}
      <LiveActivity />

      {/* 5. Bento deals — hero deal + 4-card grid */}
      <BentoDeals />

      {/* 6. Category grid — visual category browsing */}
      <CategoryGrid />

      {/* 7. Sponti Deals showcase — flash deals box */}
      <SpontiDealsShowcase />

      {/* 8. Trending deals — horizontal scroll with rank badges */}
      <TrendingDeals />

      {/* 9. All Deals grid — Groupon-style deals grid (parallax built in) */}
      <DealsGrid />

      {/* 10. Deal map preview — visual map with pins */}
      <DealMapPreview />

      {/* 11. Testimonials — consumer reviews */}
      <TestimonialsSection />

      {/* 12. Features accordion — expandable feature highlights */}
      <FeaturesAccordion />

      {/* 13. Final CTA — urgency-driven with stats */}
      <CTASection />

      {/* Mobile sticky CTA bar */}
      <MobileStickyDealCTA />
    </div>
  );
}
