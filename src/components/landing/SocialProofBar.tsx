'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import {
  UtensilsCrossed, Flower2, HeartPulse, Clapperboard, ShoppingBag, CupSoda
} from 'lucide-react';

const categories = [
  { icon: UtensilsCrossed, label: 'Restaurants', gradient: 'from-orange-400 to-red-500', bg: 'bg-orange-50', hoverBg: 'group-hover:bg-orange-100' },
  { icon: Flower2, label: 'Spa & Beauty', gradient: 'from-pink-400 to-blue-500', bg: 'bg-pink-50', hoverBg: 'group-hover:bg-pink-100' },
  { icon: HeartPulse, label: 'Fitness', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', hoverBg: 'group-hover:bg-emerald-100' },
  { icon: Clapperboard, label: 'Entertainment', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50', hoverBg: 'group-hover:bg-sky-100' },
  { icon: ShoppingBag, label: 'Shopping', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50', hoverBg: 'group-hover:bg-sky-100' },
  { icon: CupSoda, label: 'Food & Drink', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', hoverBg: 'group-hover:bg-amber-100' },
];

export function SocialProofBar() {
  return (
    <section className="py-8 sm:py-12 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-in">
          <p className="text-center text-gray-500 text-sm font-medium mb-6 sm:mb-8">
            Partnering with <span className="text-gray-900 font-bold">local businesses</span> across every category
          </p>
        </ScrollReveal>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 md:gap-12">
          {categories.map((cat, i) => (
            <ScrollReveal key={cat.label} animation="fade-up" delay={i * 80}>
              <div className="flex flex-col items-center gap-3 group cursor-default">
                <div className={`${cat.bg} ${cat.hoverBg} rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1`}>
                  <div className={`bg-gradient-to-br ${cat.gradient} rounded-xl p-2.5`}>
                    <cat.icon className="w-6 h-6 text-white" strokeWidth={1.8} />
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-semibold tracking-wide">{cat.label}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
