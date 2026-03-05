'use client';

import { useRouter } from 'next/navigation';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useTilt } from '@/lib/hooks/useTilt';
import {
  UtensilsCrossed, Sparkles, Dumbbell, Gamepad2, ShoppingBag,
  Coffee, Scissors, Car, GraduationCap, Heart, Compass
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

// Category metadata - names are translated via i18n keys
const categoryMeta = [
  { key: 'restaurants', slug: 'Restaurants', icon: UtensilsCrossed, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', count: 124 },
  { key: 'beautySpa', slug: 'Beauty & Spa', icon: Sparkles, gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', count: 89 },
  { key: 'healthFitness', slug: 'Health & Fitness', icon: Dumbbell, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', count: 67 },
  { key: 'entertainment', slug: 'Entertainment', icon: Gamepad2, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', count: 93 },
  { key: 'shopping', slug: 'Shopping', icon: ShoppingBag, gradient: 'from-blue-500 to-blue-500', bg: 'bg-blue-50', count: 156 },
  { key: 'foodDrink', slug: 'Food & Drink', icon: Coffee, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', count: 78 },
  { key: 'hairGrooming', slug: 'Hair & Grooming', icon: Scissors, gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50', count: 45 },
  { key: 'automotive', slug: 'Automotive', icon: Car, gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', count: 32 },
  { key: 'education', slug: 'Education', icon: GraduationCap, gradient: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50', count: 41 },
  { key: 'wellness', slug: 'Wellness', icon: Heart, gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', count: 58 },
];

function TiltCategoryCard({ cat, name, dealsLabel, onClick }: { cat: typeof categoryMeta[0]; name: string; dealsLabel: string; onClick: () => void }) {
  const tiltRef = useTilt(6);

  return (
    <div ref={tiltRef} className="h-full">
      <button
        onClick={onClick}
        className="category-card w-full h-full p-3 sm:p-5 text-center bg-white border border-gray-100 rounded-xl sm:rounded-2xl hover:border-transparent hover:shadow-xl group"
      >
        <div className={`inline-flex bg-gradient-to-br ${cat.gradient} rounded-lg sm:rounded-xl p-2 sm:p-3 mb-2 sm:mb-3 shadow-md group-hover:shadow-lg group-hover:animate-wiggle transition-shadow`}>
          <cat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.8} />
        </div>
        <h3 className="font-semibold text-gray-900 text-[11px] sm:text-sm mb-0.5 sm:mb-1 leading-tight">
          {name}
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-400">{dealsLabel}</p>
      </button>
    </div>
  );
}

export function CategoryGrid() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <Compass className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-blue-600">{t('home.categories.badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {t('home.categories.title')}
            </h2>
            <p className="text-gray-500 mt-2 text-base sm:text-lg">
              {t('home.categories.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {categoryMeta.map((cat, i) => (
            <ScrollReveal key={cat.slug} animation="scale-up" delay={i * 60}>
              <TiltCategoryCard
                cat={cat}
                name={t(`home.categories.${cat.key}` as any)}
                dealsLabel={t('home.categories.dealsCount').replace('{{count}}', String(cat.count))}
                onClick={() => router.push(`/deals?category=${cat.slug}`)}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
