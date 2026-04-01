'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed, Sparkles, Dumbbell, Gamepad2, ShoppingBag,
  Coffee, Scissors, Car, GraduationCap, Heart, X, ArrowRight, Check,
  Flame
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const CATEGORY_DEFS = [
  { nameKey: 'restaurants', slug: 'restaurants', icon: UtensilsCrossed, emoji: '🍽️', gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', ring: 'ring-orange-500', text: 'text-orange-600' },
  { nameKey: 'spaBeauty', slug: 'beauty-spa', icon: Sparkles, emoji: '✨', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', ring: 'ring-pink-500', text: 'text-pink-600' },
  { nameKey: 'fitness', slug: 'health-fitness', icon: Dumbbell, emoji: '💪', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', ring: 'ring-emerald-500', text: 'text-emerald-600' },
  { nameKey: 'entertainment', slug: 'entertainment', icon: Gamepad2, emoji: '🎮', gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', ring: 'ring-sky-500', text: 'text-sky-600' },
  { nameKey: 'shopping', slug: 'shopping', icon: ShoppingBag, emoji: '🛍️', gradient: 'from-blue-500 to-blue-500', bg: 'bg-blue-50', ring: 'ring-blue-500', text: 'text-blue-600' },
  { nameKey: 'foodDrink', slug: 'food-drink', icon: Coffee, emoji: '☕', gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', ring: 'ring-amber-500', text: 'text-amber-600' },
  { nameKey: 'hairGrooming', slug: 'hair-grooming', icon: Scissors, emoji: '💇', gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50', ring: 'ring-cyan-500', text: 'text-cyan-600' },
  { nameKey: 'automotive', slug: 'automotive', icon: Car, emoji: '🚗', gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', ring: 'ring-slate-500', text: 'text-slate-600' },
  { nameKey: 'classes', slug: 'classes', icon: GraduationCap, emoji: '📚', gradient: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50', ring: 'ring-yellow-500', text: 'text-yellow-600' },
  { nameKey: 'wellness', slug: 'wellness', icon: Heart, emoji: '❤️', gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', ring: 'ring-rose-500', text: 'text-rose-600' },
];

const STORAGE_KEY = 'sponti_preferences_dismissed';

export function PreferencePicker() {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<'pick' | 'ready'>('pick');
  const router = useRouter();
  const { t } = useLanguage();

  const CATEGORIES = useMemo(() =>
    CATEGORY_DEFS.map(cat => ({
      ...cat,
      name: t(`preferencePicker.${cat.nameKey}`),
    })),
  [t]);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => setVisible(true));
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
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
      className={`fixed inset-0 flex items-center justify-center z-50 px-4 transition-all duration-300 ${
        visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
      onClick={() => {}}
    >
      <div
        className={`bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto transition-all duration-500 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
        }`}
      >
        {step === 'pick' ? (
          <>
            {/* Header with dark gradient and logo */}
            <div className="relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8632B]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#29ABE2]/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

              <div className="relative px-6 pt-6 pb-8">
                <button
                  onClick={dismiss}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  <X className="w-4 h-4 text-white/80" />
                </button>

                {/* Logo */}
                <div className="flex items-center gap-3 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="SpontiCoupon"
                    className="h-10 w-auto drop-shadow-lg"
                  />
                </div>

                {/* Tagline with fire icon */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 bg-[#E8632B]/20 border border-[#E8632B]/30 rounded-full px-3 py-1">
                    <Flame className="w-3.5 h-3.5 text-[#E8632B]" />
                    <span className="text-[#E8632B] text-[11px] font-bold tracking-wider uppercase">
                      {t('preferencePicker.personalize')}
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold text-white leading-tight">
                  {t('preferencePicker.whatInterests')}
                </h3>
                <p className="text-white/50 text-sm mt-1.5">
                  {t('preferencePicker.tapFavorites')}
                </p>
              </div>
            </div>

            {/* Category Grid */}
            <div className="px-5 py-5">
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map((cat, i) => {
                  const isSelected = selected.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => toggleCategory(cat.slug)}
                      className={`group relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? `${cat.bg} border-transparent ring-2 ${cat.ring} shadow-lg scale-[1.03]`
                          : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-md hover:scale-[1.01]'
                      }`}
                      style={{
                        animation: visible ? `fadeSlideUp 0.4s ease-out ${i * 40 + 200}ms both` : 'none',
                      }}
                    >
                      <div className={`relative shrink-0 text-xl transition-transform duration-200 ${isSelected ? 'scale-125' : 'group-hover:scale-110'}`}>
                        {cat.emoji}
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 shadow-sm animate-bounce-once">
                            <Check className="w-2 h-2 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-semibold transition-colors ${
                        isSelected ? cat.text : 'text-gray-700 group-hover:text-gray-900'
                      }`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-1">
              {selected.length > 0 && (
                <div className="text-center mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                    <span className="bg-[#E8632B] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {selected.length}
                    </span>
                    {selected.length === 1
                      ? t('preferencePicker.categorySelected', { count: String(selected.length) })
                      : t('preferencePicker.categoriesSelected', { count: String(selected.length) })
                    }
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={dismiss}
                  className="px-5 py-3.5 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
                >
                  {t('preferencePicker.skip')}
                </button>
                <button
                  onClick={handleContinue}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                    selected.length > 0
                      ? 'bg-gradient-to-r from-[#E8632B] to-[#FF8C42] text-white shadow-lg shadow-[#E8632B]/25 hover:shadow-xl hover:shadow-[#E8632B]/35 hover:scale-[1.02]'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {selected.length > 0 ? t('preferencePicker.showMyDeals') : t('preferencePicker.showAllDeals')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Confirmation Step */
          <div className="p-8 text-center">
            {/* Logo at top */}
            <div className="mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="SpontiCoupon" className="h-10 w-auto mx-auto" />
            </div>

            {/* Animated checkmark */}
            <div className="relative mx-auto w-20 h-20 mb-5">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
              <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full w-20 h-20 flex items-center justify-center shadow-lg shadow-green-500/25">
                <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
              {t('preferencePicker.allSet')}
            </h3>
            <p className="text-gray-500 text-sm mb-1 leading-relaxed">
              {t('preferencePicker.prioritizeDeals', {
                categories: selected.map(s => CATEGORIES.find(c => c.slug === s)?.name).join(', '),
              })}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              {t('preferencePicker.changeAnytime')}
            </p>
            <button
              onClick={handleExplore}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#E8632B] to-[#FF8C42] text-white font-bold text-sm shadow-lg shadow-[#E8632B]/25 hover:shadow-xl hover:shadow-[#E8632B]/35 hover:scale-[1.01] transition-all duration-200"
            >
              {t('preferencePicker.exploreDeals')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
