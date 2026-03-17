'use client';

import { useState, useMemo } from 'react';
import {
  Check, Sparkles, Zap, ArrowRight, ChevronDown, Loader2,
  Rocket, Crown, Star, Users, Utensils, Scissors, Dumbbell,
  Music, ShoppingBag, Car, Heart, Camera, Coffee, Gift, Clock,
  Timer, CalendarDays, Stamp,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useParallax } from '@/lib/hooks/useParallax';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { CompetitorComparison } from '@/components/landing/CompetitorComparison';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { ROICalculator } from '@/components/sections/ROICalculator';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

/* ─────── Founders Launch Promo ─────── */
const FOUNDERS_LAUNCH_STATIC = {
  active: new Date() <= new Date('2026-04-30T23:59:59-04:00'), // Expires end of April 30, 2026 ET
  freeMonths: 2,
  totalSpots: 200,
  eligiblePlans: ['pro', 'business'] as string[],
  founderDiscount: 20,             // permanent % off after free period
};

const ENTERPRISE = {
  key: 'enterprise' as const,
  icon: Star,
};

/* ════════════════════════════════════════════════════════════════
   PRICING PAGE COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { t } = useLanguage();

  const FOUNDERS_LAUNCH = FOUNDERS_LAUNCH_STATIC;

  /* ─────── Translated Plan Config ─────── */
  const PLANS = useMemo(() => [
    {
      key: 'starter' as const,
      icon: Rocket,
      gradient: 'from-accent-500 to-accent-600',
      tagline: t('pricing.starterTagline'),
      features: [
        t('pricing.starterF1'),
        t('pricing.starterF2'),
        t('pricing.starterF3'),
        t('pricing.starterF4'),
        t('pricing.starterF5'),
        t('pricing.starterF6'),
      ],
    },
    {
      key: 'pro' as const,
      icon: Zap,
      gradient: 'from-primary-500 to-primary-600',
      tagline: t('pricing.proTagline'),
      features: [
        t('pricing.proF1'),
        t('pricing.proF2'),
        t('pricing.proF3'),
        t('pricing.proF4'),
        t('pricing.proF5'),
        t('pricing.proF6'),
        t('pricing.proF7'),
      ],
    },
    {
      key: 'business' as const,
      icon: Crown,
      gradient: 'from-secondary-500 to-secondary-600',
      tagline: t('pricing.businessTagline'),
      badge: t('pricing.bestValue'),
      features: [
        t('pricing.businessF1'),
        t('pricing.businessF2'),
        t('pricing.businessF3'),
        t('pricing.businessF4'),
        t('pricing.businessF5'),
        t('pricing.businessF6'),
        t('pricing.businessF7'),
        t('pricing.businessF8'),
        t('pricing.businessF9'),
        t('pricing.businessF10'),
      ],
    },
  ], [t]);

  /* ─────── Translated FAQ Data ─────── */
  const FAQ_ITEMS = useMemo(() => [
    { q: t('pricing.faqQ1'), a: t('pricing.faqA1') },
    { q: t('pricing.faqQ2'), a: t('pricing.faqA2') },
    { q: t('pricing.faqQ3'), a: t('pricing.faqA3') },
    { q: t('pricing.faqQ4'), a: t('pricing.faqA4') },
    { q: t('pricing.faqQ5'), a: t('pricing.faqA5') },
    { q: t('pricing.faqQ6'), a: t('pricing.faqA6') },
    { q: t('pricing.faqQ7'), a: t('pricing.faqA7') },
  ], [t]);

  /* ─────── Translated Category Icons ─────── */
  const CATEGORIES = useMemo(() => [
    { icon: Utensils, label: t('pricing.catRestaurants') },
    { icon: Scissors, label: t('pricing.catSalons') },
    { icon: Dumbbell, label: t('pricing.catFitness') },
    { icon: Heart, label: t('pricing.catWellness') },
    { icon: Coffee, label: t('pricing.catCafes') },
    { icon: ShoppingBag, label: t('pricing.catRetail') },
    { icon: Music, label: t('pricing.catEntertainment') },
    { icon: Car, label: t('pricing.catAuto') },
    { icon: Camera, label: t('pricing.catPhoto') },
  ], [t]);

  /* ─────── Translated Feature Comparison Matrix ─────── */
  const FEATURE_MATRIX = useMemo(() => [
    { feature: t('pricing.featureSpontiDeals'), starter: '2', pro: '15', business: '50', enterprise: t('pricing.unlimited') },
    { feature: t('pricing.featureSteadyDeals'), starter: '4', pro: '30', business: '100', enterprise: t('pricing.unlimited') },
    { feature: t('pricing.featureQrCode'), starter: true, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureBackupCodes'), starter: true, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureBasicAnalytics'), starter: true, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureBasicCharts'), starter: false, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureAdvancedAnalytics'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureAvaDealAssistant'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureAvaInsights'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureAvaDealAdvisor'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureAvaWebsiteImport'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureCompetitorBenchmarking'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureCustomScheduling'), starter: false, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureLoyaltyRewards'), starter: false, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureMultiLocation'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureTeamMembers'), starter: '0', pro: '0', business: t('pricing.upTo5'), enterprise: t('pricing.unlimited') },
    { feature: t('pricing.featurePrioritySupport'), starter: false, pro: true, business: true, enterprise: true },
    { feature: t('pricing.featureFeaturedHomepage'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureDedicatedSupport'), starter: false, pro: false, business: true, enterprise: true },
    { feature: t('pricing.featureCustomBranding'), starter: false, pro: false, business: false, enterprise: true },
    { feature: t('pricing.featureApiAccess'), starter: false, pro: false, business: false, enterprise: true },
    { feature: t('pricing.featureZeroFees'), starter: true, pro: true, business: true, enterprise: true },
  ], [t]);

  const handleCheckout = async (tier: string) => {
    setLoadingPlan(tier);
    setCheckoutError(null);
    try {
      const isPromo = FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(tier);
      const res = await fetch('/api/stripe/create-guest-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          interval: isAnnual ? 'year' : 'month',
          ...(isPromo ? { promo: 'founders' } : {}),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error || t('pricing.checkoutErrorFallback'));
    } catch {
      setCheckoutError(t('pricing.checkoutNetworkError'));
    }
    setLoadingPlan(null);
  };

  const parallaxRef1 = useParallax(0.15);
  const parallaxRef2 = useParallax(0.25);
  const parallaxRef3 = useParallax(0.1);

  const { ref: businessCountRef, displayValue: businessCount } = useCountUp(500, 2000);

  const getPrice = (key: string) => {
    const tier = SUBSCRIPTION_TIERS[key as keyof typeof SUBSCRIPTION_TIERS];
    return isAnnual ? tier.annualPrice : tier.price;
  };

  const visibleFeatures = showAllFeatures ? FEATURE_MATRIX : FEATURE_MATRIX.slice(0, 7);

  return (
    <div className="overflow-hidden">
      {/* ─── SECTION 1: Hero with Parallax ─── */}
      <section className="relative bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-800 pt-20 pb-32 overflow-hidden">
        {/* Floating parallax shapes */}
        <div ref={parallaxRef1} className="absolute top-20 left-[10%] w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-float-slow" />
        <div ref={parallaxRef2} className="absolute top-40 right-[15%] w-48 h-48 bg-accent-500/10 rounded-full blur-2xl animate-float-slower" />
        <div ref={parallaxRef3} className="absolute bottom-10 left-[30%] w-56 h-56 bg-amber-500/10 rounded-full blur-3xl animate-pulse-soft" />

        {/* Decorative grid dots */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          {/* ── Founders Launch Banner ── */}
          {FOUNDERS_LAUNCH.active && (
            <ScrollReveal animation="scale-up">
              <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-gradient-to-r from-primary-500/30 to-amber-500/30 backdrop-blur-sm rounded-2xl px-6 py-3.5 mb-8 border border-white/30">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary-400 animate-bounce" />
                  <span className="text-sm font-bold text-white">{t('pricing.foundersLaunch')}</span>
                </div>
                <span className="hidden sm:block w-px h-5 bg-white/30" />
                <span className="text-sm text-white">
                  {t('pricing.firstVendorsGet', { total: String(FOUNDERS_LAUNCH.totalSpots) })}{' '}
                  <span className="font-bold text-primary-300">{t('pricing.monthsFree', { months: String(FOUNDERS_LAUNCH.freeMonths) })}</span>
                  {' '}{t('pricing.plusDiscountForever', { discount: String(FOUNDERS_LAUNCH.founderDiscount) })}
                </span>
                <span className="hidden sm:block w-px h-5 bg-white/30" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300">
                    Limited founding vendor spots remaining — don&apos;t miss out!
                  </span>
                </div>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal animation="fade-up">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-primary-400 animate-sparkle" />
              <span className="text-sm font-semibold text-white">{t('pricing.title')}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {t('pricing.simplePricing')}
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-amber-400 bg-clip-text text-transparent">
                {t('pricing.powerfulResults')}
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-lg sm:text-xl text-white mt-5 max-w-2xl mx-auto">
              {FOUNDERS_LAUNCH.active ? (
                <>
                  <span className="text-white font-semibold">{t('pricing.heroPromo')}</span> {t('pricing.heroPromoSuffix')}
                  <br />
                  <span className="text-white font-medium">{t('pricing.heroPromoCreditCard')}</span>
                </>
              ) : (
                <>
                  {t('pricing.heroNoPromo')}
                  <br />
                  <span className="text-white font-medium">{t('pricing.heroNoPromoCreditCard')}</span>
                </>
              )}
            </p>
          </ScrollReveal>

        </div>

        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-50" style={{ clipPath: 'ellipse(75% 100% at 50% 100%)' }} />
      </section>

      {/* ─── SECTION 2: Competitor Comparison (value before price) ─── */}
      <CompetitorComparison />

      {/* ─── WHY CHOOSE US ─── */}
      <WhyChooseUs />

      {/* ─── SECTION 3: Social Proof Strip ─── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-3">
                <div className="pulse-dot">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <p ref={businessCountRef} className="text-lg font-bold text-gray-900">
                  {t('pricing.trustedBy', { count: String(businessCount) })}
                </p>
              </div>
              <p className="text-gray-500 text-sm">{t('pricing.trustedBySubtitle')}</p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={150}>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {CATEGORIES.map(({ icon: CatIcon, label }, i) => (
                <div
                  key={label}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all duration-300"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <CatIcon className="w-6 h-6 text-primary-500" strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Quick stat callouts */}
          <ScrollReveal animation="fade-up" delay={300}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              {[
                { value: '$0', label: t('pricing.transactionFees'), sublabel: t('pricing.youKeep100') },
                { value: '24hr', label: t('pricing.spontiCoupons'), sublabel: t('pricing.sameDayDeals') },
                { value: '5min', label: t('pricing.setupTime'), sublabel: t('pricing.postFirstDeal') },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-orange-500 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── DEAL TYPES EXPLAINER ─── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Two Ways to Attract Customers
              </h2>
              <p className="text-gray-500 mt-2">
                Choose the deal type that fits your business — or use both
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Sponti Deals */}
            <ScrollReveal animation="fade-up" delay={100}>
              <div className="relative rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-orange-50 p-6 sm:p-8 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center shadow-lg shadow-primary-200/50">
                    <Timer className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Sponti Deals</h3>
                    <p className="text-sm font-semibold text-primary-500">Flash Deals</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  Limited-time deals that last <span className="font-bold text-primary-600">4 to 24 hours</span>. Customers see a live countdown timer and act fast — creating urgency that drives immediate traffic to your business.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span>Fill slow days or empty time slots</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span>Clear excess inventory quickly</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span>Countdown timer creates urgency</span>
                  </li>
                </ul>
                <div className="mt-4 inline-flex items-center gap-1.5 bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  <Zap className="w-3 h-3" /> Best for instant foot traffic
                </div>
              </div>
            </ScrollReveal>

            {/* Steady Deals */}
            <ScrollReveal animation="fade-up" delay={200}>
              <div className="relative rounded-2xl border-2 border-secondary-200 bg-gradient-to-br from-sky-50 to-blue-50 p-6 sm:p-8 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary-500 to-blue-500 flex items-center justify-center shadow-lg shadow-secondary-200/50">
                    <CalendarDays className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Steady Deals</h3>
                    <p className="text-sm font-semibold text-secondary-500">Ongoing Deals</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  Deals that run for <span className="font-bold text-secondary-600">days or weeks</span>. Always visible to customers searching for deals near them — giving your business consistent exposure and a steady stream of new customers.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-secondary-500 mt-0.5 shrink-0" />
                    <span>Promote your everyday offers</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-secondary-500 mt-0.5 shrink-0" />
                    <span>Build repeat customer traffic</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-secondary-500 mt-0.5 shrink-0" />
                    <span>Always-on visibility in your area</span>
                  </li>
                </ul>
                <div className="mt-4 inline-flex items-center gap-1.5 bg-secondary-100 text-secondary-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  <CalendarDays className="w-3 h-3" /> Best for consistent growth
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Loyalty Rewards Callout */}
          <ScrollReveal animation="fade-up" delay={300}>
            <div className="mt-8 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200/50 shrink-0">
                <Stamp className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Built-In Loyalty Rewards</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Keep customers coming back with two built-in loyalty options: <span className="font-semibold">loyalty points</span> that customers earn with every purchase, or a <span className="font-semibold">digital punch card</span> where they unlock a reward after a set number of visits. You choose which works best for your business — no extra apps, no extra cost.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0">
                <Check className="w-3 h-3" /> Included in Pro+
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── SECTION 5: Pricing Cards ─── */}
      <section id="plans" className="relative bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Monthly / Annual Toggle */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1 bg-gray-200 rounded-full p-1.5">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  !isAnnual
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('pricing.monthly')}
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                  isAnnual
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('pricing.annual')}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
                  isAnnual ? 'bg-green-500 text-white' : 'bg-green-500/30 text-green-600'
                }`}>
                  {t('pricing.savePercent', { percent: '20' })}
                </span>
              </button>
            </div>
          </div>

          {/* Checkout error banner */}
          {checkoutError && (
            <div className="mb-8 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{t('pricing.unableToStartCheckout')}</p>
                <p className="text-sm text-red-600 mt-0.5">{checkoutError}</p>
              </div>
              <button onClick={() => setCheckoutError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <span className="sr-only">{t('pricing.dismiss')}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Founders Rate callout above cards */}
          {FOUNDERS_LAUNCH.active && (
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-5 py-2 mb-4">
                <Gift className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-bold text-primary-600">{t('pricing.foundersLaunchLimited')}</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {t('pricing.foundersLaunchDesc', {
                  total: String(FOUNDERS_LAUNCH.totalSpots),
                  months: String(FOUNDERS_LAUNCH.freeMonths),
                  discount: String(FOUNDERS_LAUNCH.founderDiscount),
                })}
              </p>
              <p className="text-sm text-amber-400 mt-2 font-semibold">
                ⏳ Spots are filling up fast — secure your founding vendor pricing today!
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {PLANS.map((plan) => {
              const tier = SUBSCRIPTION_TIERS[plan.key];
              const price = getPrice(plan.key);
              const isFeatured = plan.key === 'business';
              const IconComp = plan.icon;

              return (
                <div key={plan.key} className="flex flex-col">
                  <div className="relative flex flex-col flex-1">
                    {/* Founders Launch badge (Pro & Business) */}
                    {FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(plan.key) && !plan.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-gradient-to-r from-primary-500 to-amber-500 text-white text-[11px] font-bold px-5 py-1.5 rounded-full shadow-lg shadow-primary-200/50 flex items-center gap-1.5 whitespace-nowrap animate-pulse">
                          <Gift className="w-3.5 h-3.5" />
                          {t('pricing.twoMonthsFree')}
                        </div>
                      </div>
                    )}

                    {/* Popular badge (Business) */}
                    {plan.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <div className={`text-white text-[11px] font-bold px-5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap ${
                          FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(plan.key)
                            ? 'bg-gradient-to-r from-primary-500 to-amber-500 shadow-primary-200/50 animate-pulse'
                            : 'bg-gradient-to-r from-primary-500 to-orange-500 shadow-primary-200/50'
                        }`}>
                          {FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(plan.key) ? (
                            <>
                              <Gift className="w-3.5 h-3.5" />
                              {t('pricing.twoMonthsFree')} &middot; {plan.badge}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              {plan.badge}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={`flex flex-col flex-1 ${isFeatured ? 'pricing-card-featured p-8 lg:p-10' : 'pricing-card p-8'}`}>
                      {/* Icon + Name */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`bg-gradient-to-br ${plan.gradient} rounded-xl p-2.5 shadow-md`}>
                          <IconComp className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-6">{plan.tagline}</p>

                      {/* Price */}
                      <div className="mb-6">
                        {FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(plan.key) ? (
                          <>
                            {/* Promo: 2 months free + founders rate */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-gradient-to-r from-primary-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                {t('pricing.twoMonthsFreeTag')}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                $0
                              </span>
                              <span className="text-gray-600 text-base font-medium">{t('pricing.moSuffix')}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                              <span className="line-through">{formatCurrency(price)}{t('pricing.moSuffix')}</span>
                              {' '}&rarr;{' '}
                              <span className="text-green-600 font-semibold">
                                {t('pricing.foundersRateAfter', { price: formatCurrency(Math.round(price * (1 - FOUNDERS_LAUNCH.founderDiscount / 100))) })}
                              </span>
                              {' '}{t('pricing.foundersRateDiscount', { discount: String(FOUNDERS_LAUNCH.founderDiscount) })}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                {formatCurrency(price)}
                              </span>
                              <span className="text-gray-600 text-base font-medium">{t('pricing.moSuffix')}</span>
                            </div>
                            {isAnnual && (
                              <p className="text-xs text-green-600 font-medium mt-1.5">
                                {formatCurrency(price * 12)}{t('pricing.yearSuffix')} &middot; {t('pricing.saveSuffix', { amount: formatCurrency(tier.price * 12 - price * 12) })}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Divider */}
                      <div className={`h-px mb-6 ${isFeatured ? 'bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200' : 'bg-gray-100'}`} />

                      {/* Features — flex-1 pushes the CTA to the bottom */}
                      <ul className="space-y-3 mb-8 flex-1">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
                            <div className={`rounded-full p-0.5 mt-0.5 shrink-0 ${
                              isFeatured ? 'bg-gradient-to-br from-primary-500 to-orange-500' : 'bg-green-100'
                            }`}>
                              <Check className={`w-3 h-3 ${isFeatured ? 'text-white' : 'text-green-600'}`} />
                            </div>
                            <span className={isFeatured ? 'text-gray-900 font-medium' : ''}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA — pinned to bottom via flex */}
                      <div className="mt-auto">
                        {(() => {
                          const isPromo = FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(plan.key);
                          const isLoading = loadingPlan === plan.key;
                          return (
                            <>
                              <button
                                onClick={() => handleCheckout(plan.key)}
                                disabled={loadingPlan !== null}
                                className={`group flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                                  isFeatured
                                    ? 'bg-gradient-to-r from-primary-500 to-orange-500 text-white shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-300/50 hover:scale-[1.02]'
                                    : isPromo
                                      ? 'bg-gradient-to-r from-primary-500 to-orange-500 text-white shadow-md shadow-primary-200/30 hover:shadow-lg hover:scale-[1.02]'
                                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:scale-[1.01]'
                                } ${loadingPlan !== null ? 'opacity-75 cursor-not-allowed' : ''}`}
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('pricing.loadingText')}
                                  </>
                                ) : (
                                  <>
                                    {isPromo ? t('pricing.start2MonthsFree') : t('pricing.startMyFreeTrial')}
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                  </>
                                )}
                              </button>
                              <p className="text-[11px] text-gray-500 text-center mt-3">
                                {isPromo
                                  ? t('pricing.creditCardRequired')
                                  : t('pricing.fourteenDayTrial')
                                }
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise Callout */}
          <div>
            <div className="mt-12 bg-gradient-to-r from-secondary-500 to-secondary-700 rounded-2xl p-6 sm:p-8 md:p-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6 mb-6 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-amber-500/20 rounded-xl p-3">
                    <ENTERPRISE.icon className="w-7 h-7 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('pricing.enterprise.name')}</h3>
                    <p className="text-white text-sm mt-0.5 opacity-90">
                      {t('pricing.enterpriseTagline')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <span className="text-3xl font-bold text-white">{formatCurrency(getPrice('enterprise'))}<span className="text-base font-medium text-white">{t('pricing.moSuffix')}</span></span>
                  <button
                    onClick={() => handleCheckout('enterprise')}
                    disabled={loadingPlan !== null}
                    className={`bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap w-full sm:w-auto text-center flex items-center justify-center gap-2 ${loadingPlan !== null ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {loadingPlan === 'enterprise' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('pricing.loadingText')}
                      </>
                    ) : (
                      t('pricing.startTrial')
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {[
                  { label: t('pricing.unlimitedDeals'), desc: t('pricing.unlimitedDealsDesc') },
                  { label: t('pricing.unlimitedTeam'), desc: t('pricing.unlimitedTeamDesc') },
                  { label: t('pricing.customBranding'), desc: t('pricing.customBrandingDesc') },
                  { label: t('pricing.apiIntegrations'), desc: t('pricing.apiIntegrationsDesc') },
                ].map(item => (
                  <div key={item.label} className="bg-white/15 rounded-xl p-3 sm:p-4 text-center sm:text-left">
                    <p className="font-semibold text-white text-sm">{item.label}</p>
                    <p className="text-white text-xs mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: Feature Comparison Table ─── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">{t('pricing.comparePlans')}</h2>
              <p className="text-gray-500 mt-2">{t('pricing.comparePlansSubtitle')}</p>
              <p className="text-xs text-gray-400 mt-1 sm:hidden">&larr; {t('pricing.scrollToCompare')} &rarr;</p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={150}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-4 px-6 font-semibold text-gray-600 w-[32%]">{t('pricing.features')}</th>
                      <th className="text-center py-4 px-6 font-semibold text-accent-600 w-[17%]">{t('pricing.starter.name')}</th>
                      <th className="text-center py-4 px-6 font-semibold text-primary-600 w-[17%]">{t('pricing.pro.name')}</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-900 bg-secondary-50/40 w-[17%]">
                        {t('pricing.business.name')}
                        <span className="block text-[10px] text-secondary-400 font-normal">{t('pricing.bestValue')}</span>
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-amber-600 bg-amber-50/40 w-[17%]">
                        {t('pricing.enterprise.name')}
                        <span className="block text-[10px] text-amber-500 font-normal">{t('pricing.custom')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleFeatures.map((row) => (
                      <tr key={row.feature} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-gray-900">{row.feature}</td>
                        {(['starter', 'pro', 'business', 'enterprise'] as const).map((plan) => {
                          const val = row[plan];
                          const isBusiness = plan === 'business';
                          const isEnterprise = plan === 'enterprise';
                          return (
                            <td key={plan} className={`py-3.5 px-6 text-center ${isBusiness ? 'bg-secondary-50/20' : isEnterprise ? 'bg-amber-50/20' : ''}`}>
                              {typeof val === 'boolean' ? (
                                val ? (
                                  <Check className="w-5 h-5 text-green-500 mx-auto" />
                                ) : (
                                  <span className="text-gray-300">&mdash;</span>
                                )
                              ) : (
                                <span className={`font-semibold ${isEnterprise ? 'text-amber-600' : isBusiness ? 'text-secondary-600' : 'text-gray-900'}`}>{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!showAllFeatures && FEATURE_MATRIX.length > 7 && (
                <button
                  onClick={() => setShowAllFeatures(true)}
                  className="w-full py-3.5 text-center text-sm font-semibold text-primary-500 hover:bg-primary-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
                >
                  {t('pricing.showAllFeatures')}
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── ROI CALCULATOR ─── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
                {t('pricing.roiCalculator')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                {t('pricing.roiTitle')}
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                {t('pricing.roiSubtitle')}
              </p>
            </div>
          </ScrollReveal>

          {/* No-brainer callout */}
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="max-w-2xl mx-auto mb-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white text-center shadow-lg shadow-orange-200/50">
              <p className="text-lg font-black mb-1">{t('pricing.roiCalloutTitle')}</p>
              <p className="text-sm text-orange-100 leading-relaxed">
                {t('pricing.roiCalloutBody')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={150}>
            <ROICalculator />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── SECTION 6: FAQ Accordion ─── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">{t('pricing.faqTitle')}</h2>
              <p className="text-gray-500 mt-2">{t('pricing.faqSubtitle')}</p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, index) => (
              <ScrollReveal key={index} animation="fade-up" delay={index * 80}>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      openFaqIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 7: Final CTA with Guarantee ─── */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-800 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <ScrollReveal animation="scale-up">
            <div className="inline-flex bg-primary-500/20 rounded-full p-4 mb-6">
              <SpontiIcon className="w-10 h-10 text-primary-400" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {FOUNDERS_LAUNCH.active
                ? t('pricing.ctaFoundersTitle')
                : t('pricing.ctaTrialTitle')
              }
            </h2>
            <p className="text-lg text-white mb-8 max-w-xl mx-auto">
              {FOUNDERS_LAUNCH.active ? (
                t('pricing.ctaFoundersBody', {
                  total: String(FOUNDERS_LAUNCH.totalSpots),
                  discount: String(FOUNDERS_LAUNCH.founderDiscount),
                })
              ) : (
                t('pricing.ctaTrialBody')
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="group btn-primary w-full sm:w-auto px-10 py-4 text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/35 hover:scale-105 transition-all duration-300 text-center"
              >
                <span className="flex items-center justify-center gap-2">
                  {FOUNDERS_LAUNCH.active ? t('pricing.claimMyFoundersSpot') : t('pricing.startMyFreeTrial')}
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-white text-xs">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-primary-400" />
                <span>{FOUNDERS_LAUNCH.active ? t('pricing.heroPromo') : t('pricing.fourteenDayTrial')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-green-400" />
                <span>{t('pricing.zeroCommission')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-green-400" />
                <span>{t('pricing.cancelAnytime')}</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

    </div>
  );
}
