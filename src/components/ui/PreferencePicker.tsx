'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed, Sparkles, Dumbbell, Gamepad2, ShoppingBag,
  Coffee, Scissors, Car, GraduationCap, Heart, X, ArrowRight
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';

const CATEGORIES = [
  { name: 'Restaurants', slug: 'restaurants', icon: UtensilsCrossed, gradient: 'from-orange-500 to-red-500' },
  { name: 'Spa & Beauty', slug: 'beauty-spa', icon: Sparkles, gradient: 'from-pink-500 to-rose-500' },
  { name: 'Fitness', slug: 'health-fitness', icon: Dumbbell, gradient: 'from-emerald-500 to-teal-500' },
  { name: 'Entertainment', slug: 'entertainment', icon: Gamepad2, gradient: 'from-violet-500 to-purple-500' },
  { name: 'Shopping', slug: 'shopping', icon: ShoppingBag, gradient: 'from-blue-500 to-indigo-500' },
  { name: 'Food & Drink', slug: 'food-drink', icon: Coffee, gradient: 'from-amber-500 to-orange-500' },
  { name: 'Hair & Grooming', slug: 'hair-grooming', icon: Scissors, gradient: 'from-cyan-500 to-blue-500' },
  { name: 'Automotive', slug: 'automotive', icon: Car, gradient: 'from-slate-500 to-gray-600' },
  { name: 'Classes', slug: 'classes', icon: GraduationCap, gradient: 'from-yellow-500 to-amber-500' },
  { name: 'Wellness', slug: 'wellness', icon: Heart, gradient: 'from-rose-500 to-pink-600' },
];

const STORAGE_KEY = 'sponti_preferences_dismissed';

export function PreferencePicker() {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<'pick' | 'ready'>('pick');
  const router = useRouter();

  useEffect(() => {
    // Only show once — never again after dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Brief delay so the page loads first, then show the popup
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up-fade">
        {step === 'pick' ? (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary-500 to-orange-600 p-6 text-white">
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <SpontiIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Personalize Your Experience</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">
                What deals interest you?
              </h3>
              <p className="text-white/80 text-sm mt-1">
                Pick your favorites and we&apos;ll show you the best deals first
              </p>
            </div>

            {/* Category Grid */}
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CATEGORIES.map(cat => {
                  const isSelected = selected.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => toggleCategory(cat.slug)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`bg-gradient-to-br ${cat.gradient} rounded-lg p-1.5 shrink-0`}>
                        <cat.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary-600' : 'text-gray-600'}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={dismiss} className="flex-1 text-gray-500 text-sm font-medium py-3 hover:text-gray-700 transition-colors">
                  Skip
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {selected.length > 0 ? `Continue (${selected.length})` : 'Show All Deals'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Confirmation Step */
          <div className="p-6 sm:p-8 text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <SpontiIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-secondary-500 mb-2">
              You&apos;re all set!
            </h3>
            <p className="text-gray-500 text-sm mb-2">
              We&apos;ll prioritize{' '}
              <span className="font-semibold text-secondary-500">
                {selected.map(s => CATEGORIES.find(c => c.slug === s)?.name).join(', ')}
              </span>{' '}
              deals for you.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              You can change your preferences anytime in your account settings.
            </p>
            <button onClick={handleExplore} className="btn-primary w-full flex items-center justify-center gap-2">
              Explore Deals <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
