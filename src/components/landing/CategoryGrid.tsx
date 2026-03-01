'use client';

import { useRouter } from 'next/navigation';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useTilt } from '@/lib/hooks/useTilt';
import {
  UtensilsCrossed, Sparkles, Dumbbell, Gamepad2, ShoppingBag,
  Coffee, Scissors, Car, GraduationCap, Heart, Compass
} from 'lucide-react';

const categories = [
  {
    name: 'Restaurants',
    slug: 'restaurants',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    count: 124,
  },
  {
    name: 'Spa & Beauty',
    slug: 'beauty-spa',
    icon: Sparkles,
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    count: 89,
  },
  {
    name: 'Health & Fitness',
    slug: 'health-fitness',
    icon: Dumbbell,
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    count: 67,
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    icon: Gamepad2,
    gradient: 'from-sky-500 to-blue-500',
    bg: 'bg-sky-50',
    count: 93,
  },
  {
    name: 'Shopping',
    slug: 'shopping',
    icon: ShoppingBag,
    gradient: 'from-blue-500 to-blue-500',
    bg: 'bg-blue-50',
    count: 156,
  },
  {
    name: 'Food & Drink',
    slug: 'food-drink',
    icon: Coffee,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    count: 78,
  },
  {
    name: 'Hair & Grooming',
    slug: 'hair-grooming',
    icon: Scissors,
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    count: 45,
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    icon: Car,
    gradient: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50',
    count: 32,
  },
  {
    name: 'Classes & Courses',
    slug: 'classes',
    icon: GraduationCap,
    gradient: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-50',
    count: 41,
  },
  {
    name: 'Wellness',
    slug: 'wellness',
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
        className="category-card w-full h-full p-4 sm:p-5 text-center bg-white border border-gray-100 rounded-2xl hover:border-transparent hover:shadow-xl group"
      >
        <div className={`inline-flex bg-gradient-to-br ${cat.gradient} rounded-xl p-3 mb-3 shadow-md group-hover:shadow-lg group-hover:animate-wiggle transition-shadow`}>
          <cat.icon className="w-6 h-6 text-white" strokeWidth={1.8} />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm mb-1">
          {cat.name}
        </h3>
        <p className="text-xs text-gray-400">{cat.count}+ deals</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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
