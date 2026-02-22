'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ParallaxSection } from '@/components/ui/ParallaxSection';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Flame, ArrowRight, Info } from 'lucide-react';

interface DealStats {
  totalActive: number;
  expiringSoon: number;
  claimedToday: number;
  totalSavedThisWeek: number;
}

export function CTASection() {
  const [stats, setStats] = useState<DealStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/deals/stats');
        const data = await res.json();
        setStats(data);
      } catch {
        // Stats bar just won't show
      }
    }
    fetchStats();
  }, []);

  return (
    <ParallaxSection
      imageUrl="https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2070&auto=format&fit=crop"
      speed={0.8}
      overlay="bg-gradient-to-br from-secondary-500/90 to-primary-700/80"
      className="text-white"
    >
      <div className="max-w-4xl mx-auto px-4 text-center py-16 sm:py-20 md:py-24">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Deals Expire Every 24 Hours.
            <br />
            <span className="text-primary-400">Don&apos;t Miss Out.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <p className="text-gray-200 mt-4 text-base sm:text-lg max-w-2xl mx-auto">
            Join thousands of smart shoppers saving up to 70% at local businesses.
          </p>
        </ScrollReveal>

        {/* Inline stats bar */}
        {stats && stats.totalActive > 0 && (
          <ScrollReveal animation="fade-up" delay={225}>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-primary-400" />
                <strong className="text-white">{stats.totalActive}</strong> deals live
              </span>
              <span className="w-px h-4 bg-white/20 hidden sm:block" />
              <span className="flex items-center gap-1.5">
                <strong className="text-white">{stats.claimedToday}</strong> claimed today
              </span>
              {stats.totalSavedThisWeek > 0 && (
                <>
                  <span className="w-px h-4 bg-white/20 hidden sm:block" />
                  <span className="flex items-center gap-1.5">
                    <strong className="text-green-300">${stats.totalSavedThisWeek.toLocaleString()}</strong> saved this week
                  </span>
                </>
              )}
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal animation="fade-up" delay={300}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/deals"
              className="btn-primary w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform duration-200"
            >
              <Flame className="w-5 h-5" /> Browse Deals
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="btn-outline w-full sm:w-auto border-white/40 text-white hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center justify-center gap-2"
            >
              <Info className="w-5 h-5" /> How It Works
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </ParallaxSection>
  );
}
