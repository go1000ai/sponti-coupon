import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturedDeals } from '@/components/landing/FeaturedDeals';
import { SpontiDealsShowcase } from '@/components/landing/SpontiDealsShowcase';
import { DealsGrid } from '@/components/landing/DealsGrid';
import { BentoDeals } from '@/components/landing/BentoDeals';
import { CategoryGrid } from '@/components/landing/CategoryGrid';
import { DealMapPreview } from '@/components/landing/DealMapPreview';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';
import { HowItWorks } from '@/components/landing/HowItWorks';
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

      {/* 2. How It Works — 3-step explainer for new visitors */}
      <HowItWorks />

      {/* 3. Featured Deals — top picks with tab filtering */}
      <FeaturedDeals />

      {/* 3+4. Sponti + Steady Deals — unified gradient background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-600 via-gray-900 to-secondary-600" />
        <div className="absolute inset-0 bg-cover bg-center bg-fixed opacity-10" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop)` }} />
        <div className="relative z-10">
          <SpontiDealsShowcase />
          {/* Subtle divider between the two deal sections */}
          <div className="max-w-5xl mx-auto px-8">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <DealsGrid />
        </div>
      </div>

      {/* 5. All Deals — everything else, any location */}
      <BentoDeals />

      {/* 6. What are you looking for — category browsing */}
      <CategoryGrid />

      {/* 7. Deal map preview — all deals on map */}
      <DealMapPreview />

      {/* 8. Testimonials — consumer reviews */}
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
