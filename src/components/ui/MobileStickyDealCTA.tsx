'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';

export function MobileStickyDealCTA() {
  const [visible, setVisible] = useState(false);
  const [dealCount, setDealCount] = useState(0);

  // Fetch deal count
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/deals/stats');
        const data = await res.json();
        setDealCount(data.totalActive || 0);
      } catch {
        setDealCount(0);
      }
    }
    fetchStats();
  }, []);

  // Show after scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.8; // hero is ~80vh
      setVisible(scrollY > heroHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible || dealCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden animate-slide-up-fade">
      <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-primary-100 rounded-full p-1.5 shrink-0">
              <Flame className="w-4 h-4 text-primary-500" />
            </div>
            <span className="text-sm font-semibold text-secondary-500 truncate">
              {dealCount} deals near you
            </span>
          </div>
          <Link
            href="/deals"
            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            Browse Deals
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
