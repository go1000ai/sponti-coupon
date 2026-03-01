'use client';

import { useRouter } from 'next/navigation';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useTilt } from '@/lib/hooks/useTilt';
import {
  UtensilsCrossed, Sparkles, Dumbbell, Gamepad2, ShoppingBag,
  Coffee, Scissors, Car, GraduationCap, Heart, Compass
} from 'lucide-react';

// slug values must match the vendor category values stored in the database
const categories = [
  {
    name: 'Restaurants',
    slug: 'Restaurants',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    count: 124,
  },
  {
    name: 'Beauty & Spa',
    slug: 'Beauty & Spa',
    icon: Sparkles,
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    count: 89,
  },
  {
    name: 'Health & Fitness',
    slug: 'Health & Fitness',
    icon: Dumbbell,
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    count: 67,
  },
  {
    name: 'Entertainment',
    slug: 'Entertainment',
    icon: Gamepad2,
    gradient: 'from-sky-500 to-blue-500',
    bg: 'bg-sky-50',
    count: 93,
  },
  {
    name: 'Shopping',
    slug: 'Shopping',
    icon: ShoppingBag,
    gradient: 'from-blue-500 to-blue-500',
    bg: 'bg-blue-50',
    count: 156,
  },
  {
    name: 'Food & Drink',
    slug: 'Food & Drink',
    icon: Coffee,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    count: 78,
  },
  {
    name: 'Hair & Grooming',
    slug: 'Hair & Grooming',
    icon: Scissors,
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    count: 45,
  },
  {
    name: 'Automotive',
    slug: 'Automotive',
    icon: Car,
    gradient: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50',
    count: 32,
  },
  {
    name: 'Education',
    slug: 'Education',
    icon: GraduationCap,
    gradient: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-50',
    count: 41,
  },
  {
    name: 'Wellness',
    slug: 'Wellness',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    count: 58,
  },
];

function TiltCategoryCard({ cat, onClick }: { cat: typeof categories[0]; onClick: () => void }) {
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
          {cat.name}
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-400">{cat.count}+ deals</p>
      </button>
    </div>
  );
}

export function CategoryGrid() {
  const router = useRouter();

  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <Compass className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-blue-600">Explore Categories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              What Are You Looking For?
            </h2>
            <p className="text-gray-500 mt-2 text-base sm:text-lg">
              Browse deals by category to find exactly what you need
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {categories.map((cat, i) => (
            <ScrollReveal key={cat.slug} animation="scale-up" delay={i * 60}>
              <TiltCategoryCard
                cat={cat}
                onClick={() => router.push(`/deals?category=${cat.slug}`)}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
