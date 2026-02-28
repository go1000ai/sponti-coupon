import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { FeaturedDeals } from '@/components/landing/FeaturedDeals';
import { SpontiDealsShowcase } from '@/components/landing/SpontiDealsShowcase';
import { DealsGrid } from '@/components/landing/DealsGrid';
import { BentoDeals } from '@/components/landing/BentoDeals';
import { CategoryGrid } from '@/components/landing/CategoryGrid';
import { DealMapPreview } from '@/components/landing/DealMapPreview';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';
import { PreferencePicker } from '@/components/ui/PreferencePicker';
import { MobileStickyDealCTA } from '@/components/ui/MobileStickyDealCTA';
import { LiveActivityToast } from '@/components/ui/LiveActivityToast';

export default function Home() {
  return (
    <div>
      {/* Preference picker for new visitors */}
      <PreferencePicker />

      {/* 1. Hero — parallax + search autocomplete + image accordion */}
      <HeroSection />

      {/* 2. Featured Deals — top picks with tab filtering */}
      <FeaturedDeals />

      {/* 3. Sponti Deals — time-limited deals with countdown */}
      <SpontiDealsShowcase />

      {/* 4. Steady Deals — regular long-running deals */}
      <DealsGrid />

      {/* 5. All Deals — everything else, any location */}
      <BentoDeals />

      {/* 6. What are you looking for — category browsing */}
      <CategoryGrid />

      {/* 7. Deal map preview — all deals on map */}
      <DealMapPreview />

      {/* 8. Social proof strip — category partners */}
      <SocialProofBar />

      {/* 9. Testimonials — consumer reviews */}
      <TestimonialsSection />

      {/* 10. Final CTA — urgency-driven with stats */}
      <CTASection />

      {/* Floating FOMO toast — pops up every 12s with live claim activity */}
      <LiveActivityToast />

      {/* Mobile sticky CTA bar */}
      <MobileStickyDealCTA />
    </div>
  );
}
