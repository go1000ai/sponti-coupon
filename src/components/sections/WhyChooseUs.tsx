'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { XCircle, Megaphone, Share2, DollarSign, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const PAIN_POINT_KEYS = [
  { num: '01', emoji: '\uD83D\uDCB8', titleKey: 'whyChooseUs.pain01Title', badKey: 'whyChooseUs.pain01Bad', goodKey: 'whyChooseUs.pain01Good', explainKey: 'whyChooseUs.pain01Explain' },
  { num: '02', emoji: '\u231B', titleKey: 'whyChooseUs.pain02Title', badKey: 'whyChooseUs.pain02Bad', goodKey: 'whyChooseUs.pain02Good', explainKey: 'whyChooseUs.pain02Explain' },
  { num: '03', emoji: '\uD83D\uDD12', titleKey: 'whyChooseUs.pain03Title', badKey: 'whyChooseUs.pain03Bad', goodKey: 'whyChooseUs.pain03Good', explainKey: 'whyChooseUs.pain03Explain' },
  { num: '04', emoji: '\uD83D\uDCCB', titleKey: 'whyChooseUs.pain04Title', badKey: 'whyChooseUs.pain04Bad', goodKey: 'whyChooseUs.pain04Good', explainKey: 'whyChooseUs.pain04Explain' },
  { num: '05', emoji: '\uD83D\uDE48', titleKey: 'whyChooseUs.pain05Title', badKey: 'whyChooseUs.pain05Bad', goodKey: 'whyChooseUs.pain05Good', explainKey: 'whyChooseUs.pain05Explain' },
  { num: '06', emoji: '\uD83D\uDCC9', titleKey: 'whyChooseUs.pain06Title', badKey: 'whyChooseUs.pain06Bad', goodKey: 'whyChooseUs.pain06Good', explainKey: 'whyChooseUs.pain06Explain' },
  { num: '07', emoji: '\uD83D\uDD04', titleKey: 'whyChooseUs.pain07Title', badKey: 'whyChooseUs.pain07Bad', goodKey: 'whyChooseUs.pain07Good', explainKey: 'whyChooseUs.pain07Explain' },
  { num: '08', emoji: '\uD83D\uDCCA', titleKey: 'whyChooseUs.pain08Title', badKey: 'whyChooseUs.pain08Bad', goodKey: 'whyChooseUs.pain08Good', explainKey: 'whyChooseUs.pain08Explain' },
];

export function WhyChooseUs() {
  const { t } = useLanguage();
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  const toggleCard = (num: string) => {
    setFlippedCard(prev => (prev === num ? null : num));
  };

  return (
    <section className="pt-20 pb-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* -- Section Label -- */}
        <ScrollReveal animation="fade-up">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-8">
            <div className="w-10 h-1 rounded-full bg-gradient-to-r from-primary-500 to-orange-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
              {t('whyChooseUs.sectionLabel')}
            </span>
          </div>
        </ScrollReveal>

        {/* -- Two-Column Header -- */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start mb-16">
          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="font-bebas text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-gray-900 tracking-wide text-center md:text-left">
              {t('whyChooseUs.headlineLine1')}
              <br />
              {t('whyChooseUs.headlineLine2')}{' '}
              <span className="font-instrument italic text-primary-500">{t('whyChooseUs.headlineAccent')}</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <div className="md:pt-4 text-center md:text-left">
              <p className="text-lg text-gray-600 leading-relaxed">
                {t('whyChooseUs.descLine1')}{' '}
                <span className="font-bold text-red-500">{t('whyChooseUs.descHighlight')}</span>{' '}
                {t('whyChooseUs.descLine1End')}
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mt-3">
                {t('whyChooseUs.descLine2')}
              </p>
              <p className="text-lg font-semibold text-gray-900 leading-relaxed mt-3">
                {t('whyChooseUs.descLine3')}
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* -- Pain Points Title -- */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <h3 className="font-bebas text-3xl sm:text-4xl text-gray-900 tracking-wide">
              {t('whyChooseUs.painPointsTitle')}
            </h3>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              {t('whyChooseUs.painPointsSubtitle')}
            </p>
          </div>
        </ScrollReveal>

        {/* -- 2x4 Pain Point Card Grid (overlay on hover/tap) -- */}
        <p className="text-center text-xs text-gray-400 mb-4 sm:hidden">{t('whyChooseUs.tapToLearnMore')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PAIN_POINT_KEYS.map((item, index) => {
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
                    <h3 className="text-base font-bold text-gray-900 mb-auto">{t(item.titleKey)}</h3>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-sm text-red-500/90 leading-snug">{t(item.badKey)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SpontiIcon className="w-4 h-4 shrink-0" />
                        <p className="text-sm text-green-600 font-medium leading-snug">{t(item.goodKey)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dark overlay (desktop: hover, mobile: tap) */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-secondary-500/95 to-secondary-700/95 rounded-2xl p-5 sm:p-6 flex flex-col transition-opacity duration-300 z-20 ${
                    isActive ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <h3 className="text-sm font-bold text-white">{t(item.titleKey)}</h3>
                    </div>
                    <p className="text-[13px] text-gray-200 leading-relaxed flex-1 overflow-y-auto">
                      {t(item.explainKey)}
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

        {/* -- Coming Soon: Automated Social Media Posts -- */}
        <ScrollReveal animation="fade-up">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500/5 via-amber-50 to-primary-500/5 border border-primary-200/60 p-6 sm:p-8 md:p-10 mb-16">
            {/* Coming Soon badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-primary-200/40 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                {t('whyChooseUs.comingSoon')}
              </div>
            </div>

            <div className="text-center max-w-3xl mx-auto mb-8">
              <h3 className="font-bebas text-3xl sm:text-4xl text-gray-900 tracking-wide mb-3">
                {t('whyChooseUs.socialPostsTitle')}
              </h3>
              <p className="text-gray-600 leading-relaxed text-base sm:text-lg">
                {t('whyChooseUs.socialPostsDesc')}
              </p>
            </div>

            {/* How it works -- 3 steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 mb-3">
                  <Megaphone className="w-6 h-6 text-primary-500" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1.5">{t('whyChooseUs.socialStep1Title')}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t('whyChooseUs.socialStep1Desc')}
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 mb-3">
                  <Share2 className="w-6 h-6 text-primary-500" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1.5">{t('whyChooseUs.socialStep2Title')}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t('whyChooseUs.socialStep2Desc')}
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 mb-3">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1.5">{t('whyChooseUs.socialStep3Title')}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t('whyChooseUs.socialStep3Desc')}
                </p>
              </div>
            </div>

            {/* Savings callout + plan availability */}
            <div className="bg-white/80 rounded-xl border border-primary-100 p-5 sm:p-6 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('whyChooseUs.socialSavingsDesc', {
                  redAmount: '$500 \u2013 $2,000/month',
                  greenAmount: '$6,000 \u2013 $24,000 per year',
                })}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <SpontiIcon className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-500">
                  {t('whyChooseUs.socialAvailableOn')}{' '}
                  <span className="text-gray-900">{t('whyChooseUs.socialBusinessPlan')}</span> &amp;{' '}
                  <span className="text-gray-900">{t('whyChooseUs.socialEnterprisePlan')}</span>{' '}
                  {t('whyChooseUs.socialPlansLabel')}
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* -- Bottom Math Comparison Banner -- */}
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
                    {t('whyChooseUs.competitor')}
                  </span>
                </div>
                <div className="space-y-1.5 text-white text-sm leading-relaxed mb-4">
                  <p>{t('whyChooseUs.servicePrice')} &rarr; {t('whyChooseUs.couponDiscount')}</p>
                  <p>{t('whyChooseUs.customerPays')} <span className="font-semibold">{t('whyChooseUs.customerPaysAmount')}</span></p>
                  <p>{t('whyChooseUs.competitorCommission')} <span className="text-red-300 font-semibold">{t('whyChooseUs.competitorCommissionRate')}</span></p>
                </div>
                <div className="border-t border-white/20 pt-3">
                  <p className="text-xs text-white/80 uppercase tracking-wide mb-1">{t('whyChooseUs.competitorKeeps')}</p>
                  <p className="text-3xl font-extrabold text-red-400">{t('whyChooseUs.competitorKeepsAmount')}</p>
                  <p className="text-xs text-white/80 mt-1">{t('whyChooseUs.competitorWait')}</p>
                </div>
              </div>

              {/* Center: VS + Verdict */}
              <div className="text-center px-4 py-2 md:py-0">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 mb-4">
                  <span className="text-xl font-extrabold text-white">{t('whyChooseUs.vsLabel')}</span>
                </div>
                <p className="text-sm text-white max-w-[200px] mx-auto leading-relaxed">
                  {t('whyChooseUs.sameDealLine')}
                  <br />
                  <span className="font-bold text-primary-400">{t('whyChooseUs.moreInPocket', { amount: '$25' })}</span>
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
                <div className="space-y-1.5 text-white text-sm leading-relaxed mb-4">
                  <p>{t('whyChooseUs.servicePrice')} &rarr; {t('whyChooseUs.couponDiscount')}</p>
                  <p>{t('whyChooseUs.customerPays')} <span className="font-semibold">{t('whyChooseUs.customerPaysAmount')}</span></p>
                  <p><span className="text-primary-300 font-semibold">{t('whyChooseUs.spontiCommission')}</span> {t('whyChooseUs.spontiCommissionNote')}</p>
                </div>
                <div className="border-t border-primary-500/30 pt-3">
                  <p className="text-xs text-white/80 uppercase tracking-wide mb-1">{t('whyChooseUs.spontiKeeps')}</p>
                  <p className="text-3xl font-extrabold text-primary-400">{t('whyChooseUs.spontiKeepsAmount')}</p>
                  <p className="text-xs text-white/80 mt-1">{t('whyChooseUs.spontiPaid')}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
