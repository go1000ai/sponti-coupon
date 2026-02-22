import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { BentoDeals } from '@/components/landing/BentoDeals';
import { CategoryGrid } from '@/components/landing/CategoryGrid';
import { SpontiDealsShowcase } from '@/components/landing/SpontiDealsShowcase';
import { DealsGrid } from '@/components/landing/DealsGrid';
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

      {/* 2. Social proof strip — trust metrics */}
      <SocialProofBar />

      {/* 3. Deals Near You — hero deal + 4-card bento grid */}
      <BentoDeals />

      {/* 4. Category grid — visual category browsing */}
      <CategoryGrid />

      {/* 5. Sponti Deals showcase — time-limited Sponti deals with countdown */}
      <SpontiDealsShowcase />

      {/* 6. More Deals — full grid on parallax background */}
      <DealsGrid />

      {/* 7. Deal map preview — visual map with pins */}
      <DealMapPreview />

      {/* 8. Testimonials — consumer reviews */}
      <TestimonialsSection />

      {/* 9. Final CTA — urgency-driven with stats */}
      <CTASection />

      {/* Floating FOMO toast — pops up every 12s with live claim activity */}
      <LiveActivityToast />

      {/* Mobile sticky CTA bar */}
      <MobileStickyDealCTA />
    </div>
  );
}
