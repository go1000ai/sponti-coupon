'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { XCircle, Megaphone, Share2, DollarSign, Sparkles } from 'lucide-react';

const PAIN_POINTS = [
  {
    num: '01',
    emoji: '💸',
    title: 'Commission Fees',
    bad: 'They take up to 50% of every sale',
    good: '$0 commission — you keep 100%',
    explain: 'Most platforms charge 30–50% of every transaction. On a $50 deal, you could lose $25 in commission alone. With SpontiCoupon, you pay a flat monthly fee and keep every dollar from every sale.',
  },
  {
    num: '02',
    emoji: '⏳',
    title: 'Slow Payouts',
    bad: 'Wait 60–90 days to get paid',
    good: 'Deposits go to you instantly',
    explain: 'Competitors hold your earnings for months while they earn interest on your money. SpontiCoupon routes customer deposits straight to your account — no waiting, no holding period.',
  },
  {
    num: '03',
    emoji: '🔒',
    title: 'Payment Control',
    bad: 'Platform holds your money',
    good: 'You control every payment',
    explain: 'On other platforms, they collect the payment and decide when (or if) to release it. With SpontiCoupon, payments go directly to you. Your money, your control, from day one.',
  },
  {
    num: '04',
    emoji: '📋',
    title: 'Long Contracts',
    bad: '6–12 month lock-in agreements',
    good: 'No contract — cancel anytime',
    explain: 'Many deal sites lock vendors into 6–12 month contracts with early termination fees. SpontiCoupon is month-to-month. If it\'s not working for you, cancel anytime — no penalties, no questions.',
  },
  {
    num: '05',
    emoji: '🙈',
    title: 'Hidden Fees',
    bad: 'Marketing fees, setup fees, penalties',
    good: 'One flat monthly price',
    explain: 'Setup fees, featured placement charges, marketing add-ons, cancellation penalties — they add up fast. SpontiCoupon has one transparent monthly price. What you see is what you pay.',
  },
  {
    num: '06',
    emoji: '📉',
    title: 'Devalued Brand',
    bad: 'Deep discounts cheapen your image',
    good: 'You set the deal on your terms',
    explain: 'Other platforms push extreme discounts that train customers to only visit when there\'s a coupon. You choose your discount level, set your own terms, and protect your brand value.',
  },
  {
    num: '07',
    emoji: '🔄',
    title: 'No Repeat Customers',
    bad: 'One-time bargain hunters, then gone',
    good: 'Built-in loyalty program included',
    explain: 'Other platforms send you deal-chasers who never return. SpontiCoupon includes a built-in loyalty rewards program — customers earn points with every visit and come back to redeem them. You build real, lasting relationships instead of one-time transactions.',
  },
  {
    num: '08',
    emoji: '📊',
    title: 'Limited Insights',
    bad: 'Basic or no analytics',
    good: 'Ava insights, ROI dashboard & more',
    explain: 'Most platforms give you a basic redemption count and nothing else. SpontiCoupon provides Ava-powered insights with an ROI dashboard, customer tracking, repeat rates, revenue estimates, and actionable recommendations.',
  },
];

export function WhyChooseUs() {
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  const toggleCard = (num: string) => {
    setFlippedCard(prev => (prev === num ? null : num));
  };

  return (
    <section className="pt-20 pb-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section Label ── */}
        <ScrollReveal animation="fade-up">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-8">
            <div className="w-10 h-1 rounded-full bg-gradient-to-r from-primary-500 to-orange-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
              Why Choose Us
            </span>
          </div>
        </ScrollReveal>

        {/* ── Two-Column Header ── */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start mb-16">
          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="font-bebas text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-secondary-500 tracking-wide text-center md:text-left">
              Every Dollar You Earn
              <br />
              Should Be{' '}
              <span className="font-instrument italic text-primary-500">Yours.</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <div className="md:pt-4 text-center md:text-left">
              <p className="text-lg text-gray-600 leading-relaxed">
                Traditional deal platforms take{' '}
                <span className="font-bold text-red-500">up to 50%</span> of every sale you make.
                Then they hold your money for months.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mt-3">
                We built SpontiCoupon to fix that.
              </p>
              <p className="text-lg font-semibold text-secondary-500 leading-relaxed mt-3">
                Zero commission. Zero hidden fees. You keep everything.
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* ── Pain Points Title ── */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <h3 className="font-bebas text-3xl sm:text-4xl text-secondary-500 tracking-wide">
              What&apos;s Wrong With Other Platforms
            </h3>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              Here&apos;s what vendors deal with on traditional coupon sites — and how we do it differently.
            </p>
          </div>
        </ScrollReveal>

        {/* ── 2×4 Pain Point Card Grid (overlay on hover/tap) ── */}
        <p className="text-center text-xs text-gray-400 mb-4 sm:hidden">Tap a card to learn more</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PAIN_POINTS.map((item, index) => {
            const isActive = flippedCard === item.num;
            return (
              <ScrollReveal key={item.num} animation="fade-up" delay={index * 80}>
                <div
                  className="group relative bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-[220px] cursor-pointer"
                  onClick={() => toggleCard(item.num)}
                >
                  {/* Large faded number */}
                  <span className="absolute top-4 right-5 text-5xl font-extrabold text-primary-100 select-none pointer-events-none">
                    {item.num}
                  </span>

                  {/* Front content (always visible) */}
                  <div className="relative z-10 flex flex-col h-full">
                    <span className="text-3xl block mb-2">{item.emoji}</span>
                    <h3 className="text-base font-bold text-secondary-500 mb-auto">{item.title}</h3>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-sm text-red-500/90 leading-snug">{item.bad}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SpontiIcon className="w-4 h-4 shrink-0" />
                        <p className="text-sm text-green-600 font-medium leading-snug">{item.good}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dark overlay (desktop: hover, mobile: tap) */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-secondary-500/95 to-secondary-700/95 rounded-2xl p-5 sm:p-6 flex flex-col transition-opacity duration-300 z-20 ${
                    isActive ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-[13px] text-gray-200 leading-relaxed flex-1 overflow-y-auto">
                      {item.explain}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/10">
                      <SpontiIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold text-primary-300">SpontiCoupon</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* ── Coming Soon: Automated Social Media Posts ── */}
        <ScrollReveal animation="fade-up">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500/5 via-amber-50 to-primary-500/5 border border-primary-200/60 p-6 sm:p-8 md:p-10 mb-16">
            {/* Coming Soon badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-primary-200/40 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Coming Soon
              </div>
            </div>

            <div className="text-center max-w-3xl mx-auto mb-8">
              <h3 className="font-bebas text-3xl sm:text-4xl text-secondary-500 tracking-wide mb-3">
                Automated Social Media Posts
              </h3>
              <p className="text-gray-600 leading-relaxed text-base sm:text-lg">
                Soon you&apos;ll be able to publish your coupons directly to your social media platforms
                <span className="font-semibold text-secondary-500"> and </span>
                our SpontiCoupon channels — all with a single click.
                No more hiring a social media manager or spending hours creating posts.
              </p>
            </div>

            {/* How it works — 3 steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 mb-3">
                  <Megaphone className="w-6 h-6 text-primary-500" />
                </div>
                <h4 className="text-sm font-bold text-secondary-500 mb-1.5">Create Your Deal</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Build a coupon from your dashboard — we auto-generate a professional, branded social media post for you.
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 mb-3">
                  <Share2 className="w-6 h-6 text-primary-500" />
                </div>
                <h4 className="text-sm font-bold text-secondary-500 mb-1.5">One-Click Publish</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Post to your Instagram, Facebook, and TikTok — plus get featured on SpontiCoupon&apos;s own social channels for extra exposure.
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 mb-3">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
                <h4 className="text-sm font-bold text-secondary-500 mb-1.5">Save Thousands</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Skip the $500–$2,000/mo social media manager. Your deals get professional posts and maximum reach — included in your plan.
                </p>
              </div>
            </div>

            {/* Savings callout + plan availability */}
            <div className="bg-white/80 rounded-xl border border-primary-100 p-5 sm:p-6 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                Most small businesses spend{' '}
                <span className="font-bold text-red-500">$500 – $2,000/month</span>{' '}
                on a social media manager or agency. With SpontiCoupon&apos;s automated posting, you get
                professional deal promotions across all your platforms — saving you{' '}
                <span className="font-bold text-green-600">$6,000 – $24,000 per year</span>.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <SpontiIcon className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-500">
                  Available on <span className="text-secondary-500">Business</span> &amp; <span className="text-secondary-500">Enterprise</span> plans
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Bottom Math Comparison Banner ── */}
        {/*
          Math breakdown (realistic):
          - $100 service → 50% off coupon → customer pays $50
          - Competitor: takes 50% commission on the $50 → vendor gets $25, waits 60-90 days
          - SpontiCoupon: $0 commission → vendor gets the full $50, paid instantly
          - Difference: $25 more in your pocket
        */}
        <ScrollReveal animation="scale-up">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700 p-6 sm:p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center">

              {/* Left: Competitor */}
              <div className="bg-white/10 rounded-xl p-5 sm:p-6 border border-white/10 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-sm font-semibold text-red-300 uppercase tracking-wider">
                    Competitor
                  </span>
                </div>
                <div className="space-y-1.5 text-gray-300 text-sm leading-relaxed mb-4">
                  <p>$100 service &rarr; 50% off coupon</p>
                  <p>Customer pays <span className="text-white font-medium">$50</span></p>
                  <p>Platform takes <span className="text-red-300 font-medium">50% commission</span></p>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vendor keeps</p>
                  <p className="text-3xl font-extrabold text-red-400">$25</p>
                  <p className="text-xs text-gray-400 mt-1">...and waits 60–90 days for it</p>
                </div>
              </div>

              {/* Center: VS + Verdict */}
              <div className="text-center px-4 py-2 md:py-0">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 mb-4">
                  <span className="text-xl font-extrabold text-white">VS</span>
                </div>
                <p className="text-sm text-gray-300 max-w-[200px] mx-auto leading-relaxed">
                  Same deal. Same discount.
                  <br />
                  <span className="font-bold text-primary-400">$25 more in your pocket.</span>
                </p>
              </div>

              {/* Right: SpontiCoupon */}
              <div className="bg-primary-500/15 rounded-xl p-5 sm:p-6 border border-primary-500/30 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <SpontiIcon className="w-5 h-5" />
                  </div>
                  <Image
                    src="/logo.png"
                    alt="SpontiCoupon"
                    width={120}
                    height={36}
                    className="h-5 w-auto brightness-110"
                  />
                </div>
                <div className="space-y-1.5 text-gray-300 text-sm leading-relaxed mb-4">
                  <p>$100 service &rarr; 50% off coupon</p>
                  <p>Customer pays <span className="text-white font-medium">$50</span></p>
                  <p><span className="text-primary-300 font-medium">$0 commission</span> — you keep it all</p>
                </div>
                <div className="border-t border-primary-500/30 pt-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vendor keeps</p>
                  <p className="text-3xl font-extrabold text-primary-400">$50</p>
                  <p className="text-xs text-gray-400 mt-1">...deposited to your account instantly</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
