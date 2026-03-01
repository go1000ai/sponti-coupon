'use client';

import { ParallaxSection } from '@/components/ui/ParallaxSection';
import { useCountUp } from '@/lib/hooks/useCountUp';

function StatItem({ endValue, suffix, label }: { endValue: number; suffix: string; label: string }) {
  const { ref, displayValue } = useCountUp(endValue, 2000);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-500">
        {displayValue.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-300 mt-2 text-sm md:text-base">{label}</div>
    </div>
  );
}

export function StatsSection() {
  return (
    <ParallaxSection
      imageUrl="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop"
      speed={0.8}
      overlay="bg-gray-900/85"
      className="text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          <StatItem endValue={10} suffix="K+" label="Active Deals" />
          <StatItem endValue={5} suffix="K+" label="Local Businesses" />
          <StatItem endValue={500} suffix="K+" label="Happy Customers" />
          <StatItem endValue={2} suffix="M+" label="Saved by Customers" />
        </div>
      </div>
    </ParallaxSection>
  );
}
