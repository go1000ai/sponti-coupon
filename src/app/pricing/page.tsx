'use client';

import { useState, useEffect } from 'react';
import {
  Check, Sparkles, Zap, ArrowRight, ChevronDown, Loader2,
  Rocket, Crown, Star, Users, Utensils, Scissors, Dumbbell,
  Music, ShoppingBag, Car, Heart, Camera, Coffee, Gift, Clock,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useParallax } from '@/lib/hooks/useParallax';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { CompetitorComparison } from '@/components/landing/CompetitorComparison';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils';

/* ─────── Founders Launch Promo ─────── */
const FOUNDERS_LAUNCH_STATIC = {
  active: new Date() <= new Date('2026-04-30T23:59:59-04:00'), // Expires end of April 30, 2026 ET
  freeMonths: 2,
  totalSpots: 200,
  eligiblePlans: ['pro', 'business'] as string[],
  founderDiscount: 20,             // permanent % off after free period
};

/* ─────── Plan Config ─────── */
const PLANS = [
  {
    key: 'starter' as const,
    icon: Rocket,
    gradient: 'from-accent-500 to-accent-600',
    tagline: 'Perfect for getting started',
    features: [
      '2 Sponti + 4 Regular deals/mo',
      'QR code + 6-digit redemption',
      'Basic analytics (KPI cards)',
      'Deal usage tracking',
      'Email support',
      'Zero transaction fees',
    ],
  },
  {
    key: 'pro' as const,
    icon: Zap,
    gradient: 'from-primary-500 to-primary-600',
    tagline: 'Most popular for growing businesses',
    features: [
      '6 Sponti + 12 Regular deals/mo',
      'Everything in Starter, plus:',
      'Basic charts (3 charts)',
      'Custom deal scheduling',
      'Loyalty rewards program',
      'Priority support',
      'Zero transaction fees',
    ],
  },
  {
    key: 'business' as const,
    icon: Crown,
    gradient: 'from-secondary-500 to-secondary-600',
    tagline: 'For serious local businesses',
    badge: 'BEST VALUE',
    features: [
      '25 Sponti + 50 Regular deals/mo',
      'Everything in Pro, plus:',
      'Featured on homepage + more exposure',
      'AI Deal Assistant & Insights',
      'Advanced analytics (8+ charts)',
      'Competitor benchmarking',
      'Loyalty rewards program',
      'Multi-location & team access',
    ],
  },
];

const ENTERPRISE = {
  key: 'enterprise' as const,
  icon: Star,
};

/* ─────── FAQ Data ─────── */
const FAQ_ITEMS = [
  {
    q: 'How does the Founders Launch work?',
    a: 'The first 200 vendors to sign up for a Pro or Business plan get 2 full months completely free. After the free period, you lock in our permanent Founders Rate — 20% off for life. Credit card is required at sign-up but you won\'t be charged until month 3. Cancel anytime.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. There are no contracts or cancellation fees. You can cancel your subscription at any time from your dashboard, effective at the end of your billing period.',
  },
  {
    q: 'Are there any transaction fees?',
    a: 'None. SpontiCoupon never takes a cut of your sales. Customer deposits go directly to your payment account. We only charge the flat monthly subscription fee.',
  },
  {
    q: 'How do customer deposits work?',
    a: 'When a customer claims a Sponti Coupon, they pay the deposit directly to your connected payment account (Stripe, PayPal, Venmo, etc.). SpontiCoupon never touches the money.',
  },
  {
    q: 'Can I upgrade or downgrade my plan?',
    a: 'Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your current billing period. The price difference is prorated.',
  },
  {
    q: 'What payment methods do you accept for subscriptions?',
    a: 'We accept all major credit cards (Visa, Mastercard, Amex) through our secure payment processor. Your billing is handled through Stripe for maximum security.',
  },
  {
    q: 'Do I need technical skills to use SpontiCoupon?',
    a: 'Not at all. Our platform is designed for local business owners. You can create deals, manage customers, and track analytics through our simple dashboard. We also have AI-powered deal creation to help you get started.',
  },
];

/* ─────── Category Icons for Social Proof ─────── */
const CATEGORIES = [
  { icon: Utensils, label: 'Restaurants' },
  { icon: Scissors, label: 'Salons' },
  { icon: Dumbbell, label: 'Fitness' },
  { icon: Heart, label: 'Wellness' },
  { icon: Coffee, label: 'Cafes' },
  { icon: ShoppingBag, label: 'Retail' },
  { icon: Music, label: 'Entertainment' },
  { icon: Car, label: 'Auto' },
  { icon: Camera, label: 'Photo' },
];

/* ─────── Feature Comparison Matrix ─────── */
const FEATURE_MATRIX = [
  { feature: 'Sponti deals/month', starter: '2', pro: '6', business: '25' },
  { feature: 'Regular deals/month', starter: '4', pro: '12', business: '50' },
  { feature: 'QR code redemption', starter: true, pro: true, business: true },
  { feature: '6-digit backup codes', starter: true, pro: true, business: true },
  { feature: 'Basic analytics (KPI cards)', starter: true, pro: true, business: true },
  { feature: 'Basic charts (3 charts)', starter: false, pro: true, business: true },
  { feature: 'Advanced analytics (8+ charts + table)', starter: false, pro: false, business: true },
  { feature: 'AI Deal Assistant', starter: false, pro: false, business: true },
  { feature: 'AI Insights & scoring', starter: false, pro: false, business: true },
  { feature: 'AI Deal Advisor', starter: false, pro: false, business: true },
  { feature: 'Competitor benchmarking', starter: false, pro: false, business: true },
  { feature: 'Custom scheduling', starter: false, pro: true, business: true },
  { feature: 'Loyalty rewards program', starter: false, pro: true, business: true },
  { feature: 'Multi-location support', starter: false, pro: false, business: true },
  { feature: 'Team member access', starter: false, pro: false, business: true },
  { feature: 'Priority support', starter: false, pro: true, business: true },
  { feature: 'Featured on homepage', starter: false, pro: false, business: true },
  { feature: 'Dedicated support', starter: false, pro: false, business: true },
  { feature: 'Zero transaction fees', starter: true, pro: true, business: true },
];

/* ════════════════════════════════════════════════════════════════
   PRICING PAGE COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [spotsTaken, setSpotsTaken] = useState(0);

  // Fetch real founder spots count from DB
  useEffect(() => {
    fetch('/api/founders')
      .then((r) => r.json())
      .then((data) => setSpotsTaken(data.spots_taken || 0))
      .catch(() => {});
  }, []);

  const FOUNDERS_LAUNCH = { ...FOUNDERS_LAUNCH_STATIC, spotsTaken };

  const handleCheckout = async (tier: string) => {
    setLoadingPlan(tier);
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
      console.error('No checkout URL returned:', data.error);
    } catch (err) {
      console.error('Checkout error:', err);
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
              <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-gradient-to-r from-primary-500/20 to-amber-500/20 backdrop-blur-sm rounded-2xl px-6 py-3.5 mb-8 border border-primary-400/30">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary-400 animate-bounce" />
                  <span className="text-sm font-bold text-white">Founders Launch</span>
                </div>
                <span className="hidden sm:block w-px h-5 bg-white/20" />
                <span className="text-sm text-primary-200">
                  First <span className="font-bold text-white">{FOUNDERS_LAUNCH.totalSpots}</span> vendors get{' '}
                  <span className="font-bold text-primary-300">{FOUNDERS_LAUNCH.freeMonths} months free</span>
                  {' '}+ {FOUNDERS_LAUNCH.founderDiscount}% off forever
                </span>
                <span className="hidden sm:block w-px h-5 bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">
                    {FOUNDERS_LAUNCH.totalSpots - FOUNDERS_LAUNCH.spotsTaken} spots left
                  </span>
                </div>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal animation="fade-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-6 border border-white/10">
              <Sparkles className="w-4 h-4 text-primary-400 animate-sparkle" />
              <span className="text-sm font-semibold text-white/90">Simple, Transparent Pricing</span>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Simple Pricing.
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-amber-400 bg-clip-text text-transparent">
                Powerful Results.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-lg sm:text-xl text-gray-300 mt-5 max-w-2xl mx-auto">
              {FOUNDERS_LAUNCH.active ? (
                <>
                  <span className="text-white font-semibold">2 months free</span> on Pro &amp; Business plans. Zero commission. Zero transaction fees.
                  <br />
                  <span className="text-white/80 font-medium">Credit card required — cancel anytime.</span>
                </>
              ) : (
                <>
                  14-day free trial. Zero commission. Zero transaction fees.
                  <br />
                  <span className="text-white/80 font-medium">Customer deposits go directly to you.</span>
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
                <p ref={businessCountRef} className="text-lg font-bold text-secondary-500">
                  Trusted by {businessCount}+ local businesses
                </p>
              </div>
              <p className="text-gray-500 text-sm">From restaurants to salons, fitness studios to retail shops</p>
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
                { value: '$0', label: 'Transaction fees', sublabel: 'You keep 100% of every sale' },
                { value: '24hr', label: 'Sponti Coupons', sublabel: 'Same-day flash deals' },
                { value: '5min', label: 'Setup time', sublabel: 'Post your first deal today' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-orange-500 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold text-secondary-500 mt-1">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.sublabel}</p>
                </div>
              ))}
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
                    ? 'bg-white text-secondary-500 shadow-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                  isAnnual
                    ? 'bg-white text-secondary-500 shadow-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Annual
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
                  isAnnual ? 'bg-green-500 text-white' : 'bg-green-500/30 text-green-600'
                }`}>
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Founders Rate callout above cards */}
          {FOUNDERS_LAUNCH.active && (
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-5 py-2 mb-4">
                <Gift className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-bold text-primary-600">Founders Launch — Limited Offer</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                The first <span className="font-bold text-secondary-500">{FOUNDERS_LAUNCH.totalSpots} vendors</span> to sign up
                for a Pro or Business plan get{' '}
                <span className="font-bold text-primary-500">{FOUNDERS_LAUNCH.freeMonths} months completely free</span>,
                then lock in a permanent{' '}
                <span className="font-bold text-green-600">{FOUNDERS_LAUNCH.founderDiscount}% Founders Rate for life</span>.
                {' '}Credit card required at sign-up — you won&apos;t be charged until month 3. Cancel anytime.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {FOUNDERS_LAUNCH.totalSpots - FOUNDERS_LAUNCH.spotsTaken} of {FOUNDERS_LAUNCH.totalSpots} founding spots remaining
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
                          2 MONTHS FREE
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
                              2 MONTHS FREE &middot; {plan.badge}
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
                        <h3 className="text-xl font-bold text-secondary-500">{tier.name}</h3>
                      </div>
                      <p className="text-sm text-gray-400 mb-6">{plan.tagline}</p>

                      {/* Price */}
                      <div className="mb-6">
                        {FOUNDERS_LAUNCH.active && FOUNDERS_LAUNCH.eligiblePlans.includes(plan.key) ? (
                          <>
                            {/* Promo: 2 months free + founders rate */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-gradient-to-r from-primary-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                2 Months Free
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                $0
                              </span>
                              <span className="text-gray-400 text-base font-medium">/mo</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">
                              <span className="line-through">{formatCurrency(price)}/mo</span>
                              {' '}&rarr;{' '}
                              <span className="text-green-600 font-semibold">
                                {formatCurrency(Math.round(price * (1 - FOUNDERS_LAUNCH.founderDiscount / 100)))}/mo after
                              </span>
                              {' '}(Founders Rate — {FOUNDERS_LAUNCH.founderDiscount}% off forever)
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                {formatCurrency(price)}
                              </span>
                              <span className="text-gray-400 text-base font-medium">/mo</span>
                            </div>
                            {isAnnual && (
                              <p className="text-xs text-green-600 font-medium mt-1.5">
                                {formatCurrency(price * 12)}/year &middot; Save {formatCurrency(tier.price * 12 - price * 12)}
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
                            <span className={isFeatured ? 'text-secondary-500 font-medium' : ''}>
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
                                      : 'bg-gray-100 text-secondary-500 hover:bg-gray-200 hover:scale-[1.01]'
                                } ${loadingPlan !== null ? 'opacity-75 cursor-not-allowed' : ''}`}
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    {isPromo ? 'Start 2 Months Free' : 'Start My Free Trial'}
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                  </>
                                )}
                              </button>
                              <p className="text-[11px] text-gray-400 text-center mt-3">
                                {isPromo
                                  ? 'Credit card required. Cancel anytime.'
                                  : '14-day free trial. Cancel anytime.'
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
                    <h3 className="text-xl font-bold text-white">Enterprise</h3>
                    <p className="text-gray-300 text-sm mt-0.5">
                      For regional chains, franchises &amp; multi-location businesses
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <span className="text-3xl font-bold text-white">{formatCurrency(getPrice('enterprise'))}<span className="text-base font-medium text-gray-400">/mo</span></span>
                  <button
                    onClick={() => handleCheckout('enterprise')}
                    disabled={loadingPlan !== null}
                    className={`bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap w-full sm:w-auto text-center flex items-center justify-center gap-2 ${loadingPlan !== null ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {loadingPlan === 'enterprise' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Contact Sales'
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Unlimited Deals', desc: 'Sponti + Regular, no limits' },
                  { label: 'Loyalty Program', desc: 'Punch cards & points to retain customers' },
                  { label: 'Custom Branding', desc: 'White-label deal pages & domain' },
                  { label: 'API + Integrations', desc: 'POS, CRM & dedicated support' },
                ].map(item => (
                  <div key={item.label} className="bg-white/10 rounded-xl p-3 sm:p-4 text-center sm:text-left">
                    <p className="font-semibold text-white text-sm">{item.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
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
              <h2 className="text-3xl font-bold text-secondary-500">Compare Plans</h2>
              <p className="text-gray-500 mt-2">See what&apos;s included in each plan</p>
              <p className="text-xs text-gray-400 mt-1 sm:hidden">← Scroll to compare →</p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={150}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-4 px-6 font-semibold text-gray-600 w-[40%]">Feature</th>
                      <th className="text-center py-4 px-6 font-semibold text-accent-600 w-[20%]">Starter</th>
                      <th className="text-center py-4 px-6 font-semibold text-primary-600 w-[20%]">Pro</th>
                      <th className="text-center py-4 px-6 font-semibold text-secondary-500 bg-secondary-50/40 w-[20%]">
                        Business
                        <span className="block text-[10px] text-secondary-400 font-normal">Best Value</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleFeatures.map((row) => (
                      <tr key={row.feature} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-secondary-500">{row.feature}</td>
                        {(['starter', 'pro', 'business'] as const).map((plan) => {
                          const val = row[plan];
                          const isBusiness = plan === 'business';
                          return (
                            <td key={plan} className={`py-3.5 px-6 text-center ${isBusiness ? 'bg-secondary-50/20' : ''}`}>
                              {typeof val === 'boolean' ? (
                                val ? (
                                  <Check className="w-5 h-5 text-green-500 mx-auto" />
                                ) : (
                                  <span className="text-gray-300">&mdash;</span>
                                )
                              ) : (
                                <span className={`font-semibold ${isBusiness ? 'text-secondary-600' : 'text-secondary-500'}`}>{val}</span>
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
                  Show all features
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── SECTION 6: FAQ Accordion ─── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary-500">Frequently Asked Questions</h2>
              <p className="text-gray-500 mt-2">Everything you need to know about SpontiCoupon pricing</p>
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
                    <span className="font-semibold text-secondary-500 text-sm pr-4">{faq.q}</span>
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
                ? 'Join the Founders Launch — 2 Months Free'
                : 'Try SpontiCoupon Free for 14 Days'
              }
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
              {FOUNDERS_LAUNCH.active ? (
                <>
                  Be one of the first {FOUNDERS_LAUNCH.totalSpots} vendors and lock in{' '}
                  <span className="text-white font-semibold">{FOUNDERS_LAUNCH.founderDiscount}% off forever</span>.
                  {' '}Zero commission. Customer deposits go directly to you.
                </>
              ) : (
                'Join 500+ local businesses already using SpontiCoupon. Start your free trial today — cancel anytime.'
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 px-4 sm:px-0">
              <button
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="group btn-primary w-full sm:w-auto px-10 py-4 text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/35 hover:scale-105 transition-all duration-300 text-center"
              >
                <span className="flex items-center justify-center gap-2">
                  {FOUNDERS_LAUNCH.active ? 'Claim My Founders Spot' : 'Start My Free Trial'}
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-gray-400 text-xs">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-primary-400" />
                <span>{FOUNDERS_LAUNCH.active ? '2 months free' : '14-day free trial'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-green-400" />
                <span>Zero commission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
