'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useParallax } from '@/lib/hooks/useParallax';
import {
  Zap, ShieldCheck, BadgePercent, Lock, QrCode, Bell, Heart,
  ChevronDown, ArrowRight, Sparkles
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function FeaturesAccordion() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t('home.featuresAccordion.feat1Title'),
      description: t('home.featuresAccordion.feat1Desc'),
      gradient: 'from-primary-500 to-orange-600',
    },
    {
      icon: ShieldCheck,
      title: t('home.featuresAccordion.feat2Title'),
      description: t('home.featuresAccordion.feat2Desc'),
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      icon: BadgePercent,
      title: t('home.featuresAccordion.feat3Title'),
      description: t('home.featuresAccordion.feat3Desc'),
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: Lock,
      title: t('home.featuresAccordion.feat4Title'),
      description: t('home.featuresAccordion.feat4Desc'),
      gradient: 'from-sky-500 to-blue-600',
    },
    {
      icon: QrCode,
      title: t('home.featuresAccordion.feat5Title'),
      description: t('home.featuresAccordion.feat5Desc'),
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Bell,
      title: t('home.featuresAccordion.feat6Title'),
      description: t('home.featuresAccordion.feat6Desc'),
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      icon: Heart,
      title: t('home.featuresAccordion.feat7Title'),
      description: t('home.featuresAccordion.feat7Desc'),
      gradient: 'from-rose-500 to-pink-600',
    },
  ];
  const [openIndex, setOpenIndex] = useState(0);
  const orb1Ref = useParallax(0.05);
  const orb2Ref = useParallax(0.12);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="relative py-12 sm:py-16 md:py-20 bg-white overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div ref={orb1Ref} className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl hidden md:block" />
        <div ref={orb2Ref} className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent-500/5 rounded-full blur-3xl hidden md:block" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-amber-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <Sparkles className="w-4 h-4 text-primary-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-primary-600">{t('home.featuresAccordion.badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {t('home.featuresAccordion.title')}
            </h2>
            <p className="text-gray-500 mt-2 text-base sm:text-lg">
              {t('home.featuresAccordion.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        {/* Accordion */}
        <div className="space-y-2">
          {features.map((feature, i) => {
            const isOpen = openIndex === i;
            const Icon = feature.icon;

            return (
              <ScrollReveal key={feature.title} animation="fade-up" delay={i * 80}>
                <div
                  className={`rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? 'border-primary-200 bg-primary-50/30 shadow-md border-l-4 border-l-primary-500'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm hover:bg-gray-50/50'
                  }`}
                >
                  {/* Accordion button */}
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center gap-4 p-4 sm:p-5 text-left group"
                  >
                    <div className={`shrink-0 inline-flex bg-gradient-to-br ${feature.gradient} rounded-xl p-2.5 shadow-md transition-transform duration-300 ${
                      isOpen ? 'scale-110' : 'group-hover:animate-wiggle'
                    }`}>
                      <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <span className={`flex-1 font-semibold text-base sm:text-lg transition-colors duration-200 ${
                      isOpen ? 'text-primary-600' : 'text-gray-900 group-hover:text-primary-500'
                    }`}>
                      {feature.title}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180 text-primary-500' : ''
                    }`} />
                  </button>

                  {/* Accordion panel */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="px-4 sm:px-5 pb-4 sm:pb-5 pl-[60px] sm:pl-[72px] text-gray-600 leading-relaxed text-sm sm:text-base">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* CTA after accordion */}
        <ScrollReveal animation="fade-up" delay={600}>
          <div className="text-center mt-10">
            <Link
              href="/deals"
              className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5 hover:scale-105 transition-transform duration-200 animate-glow"
            >
              {t('home.featuresAccordion.browseDeals')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-gray-400 text-sm mt-3">
              {t('home.featuresAccordion.noSignup')}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
