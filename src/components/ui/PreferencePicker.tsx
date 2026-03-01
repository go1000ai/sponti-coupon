'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed, Sparkles, Dumbbell, Gamepad2, ShoppingBag,
  Coffee, Scissors, Car, GraduationCap, Heart, X, ArrowRight, Check
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';

const CATEGORIES = [
  { name: 'Restaurants', slug: 'restaurants', icon: UtensilsCrossed, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', ring: 'ring-orange-500', text: 'text-orange-600' },
  { name: 'Spa & Beauty', slug: 'beauty-spa', icon: Sparkles, gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', ring: 'ring-pink-500', text: 'text-pink-600' },
  { name: 'Fitness', slug: 'health-fitness', icon: Dumbbell, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', ring: 'ring-emerald-500', text: 'text-emerald-600' },
  { name: 'Entertainment', slug: 'entertainment', icon: Gamepad2, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', ring: 'ring-sky-500', text: 'text-sky-600' },
  { name: 'Shopping', slug: 'shopping', icon: ShoppingBag, gradient: 'from-blue-500 to-blue-500', bg: 'bg-blue-50', ring: 'ring-blue-500', text: 'text-blue-600' },
  { name: 'Food & Drink', slug: 'food-drink', icon: Coffee, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', ring: 'ring-amber-500', text: 'text-amber-600' },
  { name: 'Hair & Grooming', slug: 'hair-grooming', icon: Scissors, gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50', ring: 'ring-cyan-500', text: 'text-cyan-600' },
  { name: 'Automotive', slug: 'automotive', icon: Car, gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', ring: 'ring-slate-500', text: 'text-slate-600' },
  { name: 'Classes', slug: 'classes', icon: GraduationCap, gradient: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50', ring: 'ring-yellow-500', text: 'text-yellow-600' },
  { name: 'Wellness', slug: 'wellness', icon: Heart, gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', ring: 'ring-rose-500', text: 'text-rose-600' },
];

const STORAGE_KEY = 'sponti_preferences_dismissed';

export function PreferencePicker() {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<'pick' | 'ready'>('pick');
  const router = useRouter();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setShow(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const toggleCategory = (slug: string) => {
    setSelected(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) {
      dismiss();
      return;
    }
    setStep('ready');
  };

  const handleExplore = () => {
    dismiss();
    if (selected.length === 1) {
      router.push(`/deals?category=${selected[0]}`);
    } else {
      router.push('/deals');
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up-fade">
        {step === 'pick' ? (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-secondary-500 via-secondary-400 to-primary-500 px-6 pt-8 pb-10">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

              <button
                onClick={dismiss}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 transition-all duration-200 backdrop-blur-sm"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="relative">
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
                  <SpontiIcon className="w-3.5 h-3.5" />
                  <span className="text-white/90 text-[11px] font-semibold tracking-wide uppercase">Personalize</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white leading-tight">
                  What deals interest you?
                </h3>
                <p className="text-white/70 text-sm mt-1.5">
                  Tap your favorites for a personalized feed
                </p>
              </div>
            </div>

            {/* Category Grid — overlaps header */}
            <div className="px-5 sm:px-6 -mt-5">
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map((cat, i) => {
                  const isSelected = selected.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => toggleCategory(cat.slug)}
                      className={`group relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? `${cat.bg} border-transparent ring-2 ${cat.ring} shadow-md scale-[1.02]`
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className={`relative bg-gradient-to-br ${cat.gradient} rounded-xl p-2 shrink-0 shadow-sm transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                        <cat.icon className="w-4 h-4 text-white" />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <Check className="w-2.5 h-2.5 text-green-500" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-semibold transition-colors ${isSelected ? cat.text : 'text-gray-600 group-hover:text-gray-800'}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 pt-5 pb-6">
              {selected.length > 0 && (
                <p className="text-center text-xs text-gray-400 mb-3">
                  {selected.length} {selected.length === 1 ? 'category' : 'categories'} selected
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={dismiss}
                  className="px-5 py-3 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleContinue}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    selected.length > 0
                      ? 'bg-gradient-to-r from-primary-500 to-orange-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.01]'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {selected.length > 0 ? 'Show My Deals' : 'Show All Deals'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Confirmation Step */
          <div className="p-8 text-center">
            {/* Animated checkmark */}
            <div className="relative mx-auto w-20 h-20 mb-5">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
              <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full w-20 h-20 flex items-center justify-center shadow-lg shadow-green-500/25">
                <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
              You&apos;re all set!
            </h3>
            <p className="text-gray-500 text-sm mb-1 leading-relaxed">
              We&apos;ll prioritize{' '}
              <span className="font-bold text-gray-900">
                {selected.map(s => CATEGORIES.find(c => c.slug === s)?.name).join(', ')}
              </span>{' '}
              deals for you.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Change anytime in settings
            </p>
            <button
              onClick={handleExplore}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.01] transition-all duration-200"
            >
              Explore Deals <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
