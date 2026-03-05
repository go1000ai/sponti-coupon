'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Shield, Zap, Users, ArrowRight, Store, DollarSign, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-24 px-4">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Image src="/logo.png" alt="SpontiCoupon" width={220} height={66} className="mx-auto mb-8 brightness-110" />
          <h1 className="text-3xl sm:text-5xl font-bold mb-6">
            {t('about.heroTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t('about.heroDesc')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-orange-50 text-primary-600 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-primary-100">
              <Sparkles className="w-4 h-4" /> {t('about.mission')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{t('about.whyBuilt')}</h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
              {t('about.whyBuiltDesc')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: <DollarSign className="w-7 h-7 text-primary-600" />,
                bg: 'from-primary-100 to-orange-100',
                title: t('about.fairForVendors'),
                desc: t('about.fairForVendorsDesc'),
              },
              {
                icon: <Heart className="w-7 h-7 text-accent-600" />,
                bg: 'from-accent-100 to-blue-100',
                title: t('about.greatForCustomers'),
                desc: t('about.greatForCustomersDesc'),
              },
              {
                icon: <Users className="w-7 h-7 text-blue-600" />,
                bg: 'from-blue-100 to-sky-100',
                title: t('about.buildingLoyalty'),
                desc: t('about.buildingLoyaltyDesc'),
              },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 tilt-card rounded-2xl">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-accent-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('about.whatMakesDifferent')}</h2>
            <p className="text-gray-500 mt-2">{t('about.whatMakesDifferentDesc')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: <Zap className="w-5 h-5 text-primary-500" />, color: 'primary', title: t('about.spontiCouponsTitle'), desc: t('about.spontiCouponsDesc') },
              { icon: <Shield className="w-5 h-5 text-green-500" />, color: 'green', title: t('about.verifiedReviews'), desc: t('about.verifiedReviewsDesc') },
              { icon: <Store className="w-5 h-5 text-accent-500" />, color: 'accent', title: t('about.vendorFirst'), desc: t('about.vendorFirstDesc') },
              { icon: <Heart className="w-5 h-5 text-red-500" />, color: 'red', title: t('about.loyaltyBuiltIn'), desc: t('about.loyaltyBuiltInDesc') },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 tilt-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shadow-sm">{item.icon}</div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why not the old way */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('about.whyNotOldWay')}</h2>
            <p className="text-gray-500 mt-2">{t('about.whyNotOldWayDesc')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-8 border border-red-100">
              <h3 className="font-bold text-red-600 mb-4 text-lg">{t('about.traditionalPlatforms')}</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  t('about.traditionalItem1'),
                  t('about.traditionalItem2'),
                  t('about.traditionalItem3'),
                  t('about.traditionalItem4'),
                  t('about.traditionalItem5'),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 font-bold">&#x2715;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-accent-50 rounded-2xl p-8 border border-green-100 gradient-border">
              <h3 className="font-bold text-green-600 mb-4 text-lg">{t('about.sponticouponTitle')}</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  t('about.sponticouponItem1'),
                  t('about.sponticouponItem2'),
                  t('about.sponticouponItem3'),
                  t('about.sponticouponItem4'),
                  t('about.sponticouponItem5'),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t('about.ctaTitle')}</h2>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">{t('about.ctaDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/deals" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all hover:scale-[1.02]">
              {t('about.browseDeals')} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2 hover:bg-white/20 transition-all">
              <Store className="w-4 h-4" /> {t('about.listYourBusiness')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
