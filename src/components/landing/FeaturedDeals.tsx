'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DealCard } from '@/components/deals/DealCard';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Flame, ArrowRight, Tag } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal } from '@/lib/types/database';

type DealTab = 'all' | 'sponti_coupon' | 'regular';

export function FeaturedDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DealTab>('all');

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '8' });
        if (activeTab !== 'all') params.set('type', activeTab);
        const res = await fetch(`/api/deals?${params.toString()}`);
        const data = await res.json();
        setDeals(data.deals || []);
      } catch {
        setDeals([]);
      }
      setLoading(false);
    }
    fetchDeals();
  }, [activeTab]);

  const tabs: { key: DealTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Deals', icon: <Flame className="w-4 h-4" /> },
    { key: 'sponti_coupon', label: 'Sponti Coupons', icon: <SpontiIcon className="w-4 h-4" /> },
    { key: 'regular', label: 'Regular Deals', icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-orange-50 rounded-full px-5 py-2 mb-3 shadow-sm">
                <Flame className="w-4 h-4 text-primary-500" strokeWidth={1.8} />
                <span className="text-sm font-semibold text-primary-600">Hot Right Now</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-secondary-500">
                Today&apos;s Best Deals
              </h2>
              <p className="text-gray-500 mt-2 text-lg">
                Grab these deals before they&apos;re gone
              </p>
            </div>
            <Link
              href="/deals"
              className="text-primary-500 font-semibold inline-flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="flex flex-wrap gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-gray-400">No deals available right now</h3>
            <p className="text-gray-400 mt-1">Check back soon for new deals!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {deals.map((deal, i) => (
              <ScrollReveal key={deal.id} animation="fade-up" delay={i * 80}>
                <DealCard
                  deal={deal}
                  distance={(deal as Deal & { distance?: number }).distance}
                />
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* View more */}
        {deals.length > 0 && (
          <ScrollReveal animation="fade-up">
            <div className="text-center mt-10">
              <Link
                href="/deals"
                className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base hover:scale-105 transition-transform duration-200"
              >
                Browse All Deals <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
