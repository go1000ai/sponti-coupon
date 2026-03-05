'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, RefreshCw, Image as ImageIcon, Share2, BarChart2, PenLine, Tag } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const COMMISSION_PRESETS = [10, 20, 30, 40, 50];

const TIERS = [
  { name: 'Starter',    price: 49,  maxDeals: 6,        featureKeys: ['6 active deals', 'Basic analytics', 'Email support'] },
  { name: 'Pro',        price: 99,  maxDeals: 45,       featureKeys: ['45 active deals', 'Advanced analytics', 'Auto social posts'] },
  { name: 'Business',   price: 199, maxDeals: 150,      featureKeys: ['150 active deals', 'Full analytics suite', 'Priority support'] },
  { name: 'Enterprise', price: 499, maxDeals: Infinity, featureKeys: ['Unlimited deals', 'Full analytics suite', 'Dedicated manager'] },
];

function recommendTier(dealsPerMonth: number) {
  return TIERS.find(t => dealsPerMonth <= t.maxDeals) ?? TIERS[TIERS.length - 1];
}

const BUSINESS = TIERS[2]; // always shown as the "get everything" upsell

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function ROICalculator() {
  const { t } = useLanguage();
  const [commission, setCommission]       = useState(50);
  const [customPct, setCustomPct]         = useState('');
  const [dealsPerMonth, setDealsPerMonth] = useState(4);
  const [avgDealValue, setAvgDealValue]   = useState(50);
  const [claimsPerDeal, setClaimsPerDeal] = useState(20);
  const [showResults, setShowResults]     = useState(false);

  const effectivePct = (() => {
    const n = parseFloat(customPct);
    if (!isNaN(n) && n >= 0 && n <= 100) return n;
    return commission;
  })();

  const grossMonthly       = dealsPerMonth * claimsPerDeal * avgDealValue;
  const platformCut        = grossMonthly * (effectivePct / 100);
  const currentNet         = grossMonthly - platformCut;
  const tier               = recommendTier(dealsPerMonth);
  const spontiNet          = grossMonthly - tier.price;
  const monthlyDiff        = spontiNet - currentNet;
  const annualDiff         = monthlyDiff * 12;
  const annualPlatformCost = platformCut * 12;

  const aiItems = [
    { icon: <ImageIcon className="w-4 h-4" />, titleKey: 'roiCalc.aiImage', descKey: 'roiCalc.aiImageDesc' },
    { icon: <Share2 className="w-4 h-4" />,    titleKey: 'roiCalc.aiSocial', descKey: 'roiCalc.aiSocialDesc' },
    { icon: <BarChart2 className="w-4 h-4" />, titleKey: 'roiCalc.aiAnalytics', descKey: 'roiCalc.aiAnalyticsDesc' },
    { icon: <PenLine className="w-4 h-4" />,   titleKey: 'roiCalc.aiCaptions', descKey: 'roiCalc.aiCaptionsDesc' },
    { icon: <Tag className="w-4 h-4" />,       titleKey: 'roiCalc.aiTags', descKey: 'roiCalc.aiTagsDesc' },
  ];

  const featureKeys = [
    'roiCalc.activeDeals',
    'roiCalc.aiImageGen',
    'roiCalc.autoSocialPosts',
    'roiCalc.advancedAnalytics',
    'roiCalc.prioritySupport',
    'roiCalc.zeroCommissionEver',
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* -- Inputs -- */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">

        {/* Commission % */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-3">
            {t('roiCalc.commissionQuestion')}
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMISSION_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setCommission(p); setCustomPct(''); setShowResults(false); }}
                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                  effectivePct === p && customPct === ''
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-orange-300'
                }`}
              >
                {p}%
              </button>
            ))}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent">
              <input
                type="number" min={0} max={100}
                value={customPct}
                onChange={(e) => { setCustomPct(e.target.value); setShowResults(false); }}
                placeholder={t('roiCalc.other')}
                className="w-20 px-3 py-2 text-sm font-bold text-gray-700 outline-none"
              />
              <span className="pr-3 text-sm text-gray-400 font-bold">%</span>
            </div>
          </div>
          {effectivePct > 0 && (
            <p className="text-xs text-red-500 font-medium">
              {t('roiCalc.giveAwayWarning', { percent: String(effectivePct), amount: fmt(grossMonthly * effectivePct / 100) })}
            </p>
          )}
        </div>

        {/* Deals / month */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-bold text-gray-800">{t('roiCalc.dealsPerMonth')}</label>
            <span className="text-xl font-black text-orange-500">{dealsPerMonth}</span>
          </div>
          <input type="range" min={1} max={30} value={dealsPerMonth}
            onChange={(e) => { setDealsPerMonth(Number(e.target.value)); setShowResults(false); }}
            className="w-full accent-orange-500" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>30+</span></div>
        </div>

        {/* Claims per deal */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-bold text-gray-800">{t('roiCalc.customersPerDeal')}</label>
            <span className="text-xl font-black text-orange-500">{claimsPerDeal}</span>
          </div>
          <input type="range" min={1} max={200} value={claimsPerDeal}
            onChange={(e) => { setClaimsPerDeal(Number(e.target.value)); setShowResults(false); }}
            className="w-full accent-orange-500" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>200</span></div>
        </div>

        {/* Avg deal value */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-bold text-gray-800">{t('roiCalc.avgDealValue')}</label>
            <span className="text-xl font-black text-orange-500">{fmt(avgDealValue)}</span>
          </div>
          <input type="range" min={5} max={500} step={5} value={avgDealValue}
            onChange={(e) => { setAvgDealValue(Number(e.target.value)); setShowResults(false); }}
            className="w-full accent-orange-500" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$5</span><span>$500</span></div>
        </div>

        {/* Live gross preview */}
        <div className="bg-gray-50 rounded-xl px-5 py-4 flex items-center justify-between border border-gray-100">
          <div>
            <p className="text-xs text-gray-500">{t('roiCalc.monthlyGross')}</p>
            <p className="text-3xl font-black text-gray-900">{fmt(grossMonthly)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-500">{t('roiCalc.platformKeeps')}</p>
            <p className="text-xl font-black text-red-500">{fmt(platformCut)}</p>
          </div>
        </div>

        <button
          onClick={() => setShowResults(true)}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-colors"
        >
          {t('roiCalc.calculateSavings')}
        </button>
      </div>

      {/* -- Results -- */}
      {showResults && (
        <div className="space-y-4">

          {/* Two clear boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Current platform cost */}
            <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
              <Image src="/roi-before.png" alt={t('roiCalc.stressedOwner')} width={400} height={300} className="w-full h-56 object-cover object-center" />
              <div className="p-5">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">{t('roiCalc.currentPlatformTakes')}</p>
                <p className="text-4xl font-black text-red-600">&minus;{fmt(platformCut)}<span className="text-base font-medium text-red-400">{t('roiCalc.perMo')}</span></p>
                <p className="text-sm text-red-500 mt-1">{t('roiCalc.percentGone', { percent: String(effectivePct) })}</p>
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-2xl font-black text-red-500">&minus;{fmt(annualPlatformCost)}<span className="text-sm font-medium">{t('roiCalc.perYear')}</span></p>
                  <p className="text-xs text-red-400">{t('roiCalc.handedOver')}</p>
                </div>
              </div>
            </div>

            {/* SpontiCoupon */}
            <div className="bg-orange-50 border border-orange-300 rounded-2xl overflow-hidden">
              <Image src="/roi-after.png" alt={t('roiCalc.happyOwner')} width={400} height={300} className="w-full h-56 object-cover object-center" />
              <div className="p-5">
                <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-2">SpontiCoupon {tier.name} costs you</p>
                <p className="text-4xl font-black text-orange-600">{fmt(tier.price)}<span className="text-base font-medium text-orange-400">{t('roiCalc.moFlat')}</span></p>
                <p className="text-sm text-orange-500 mt-1">{t('roiCalc.zeroCommission')}</p>
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-2xl font-black text-green-600">+{fmt(Math.max(0, annualDiff))}<span className="text-sm font-medium">{t('roiCalc.yearBackInPocket')}</span></p>
                  <p className="text-xs text-gray-500">{t('roiCalc.vsLostToPlatform', { amount: fmt(annualPlatformCost) })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Savings summary -- consistent math */}
          <div className="bg-gray-900 text-white rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-4xl">😊</span>
              <p className="text-sm text-gray-400">{t('roiCalc.youPutBack')}</p>
            </div>
            <p className="text-5xl font-black text-green-400">+{fmt(Math.max(0, monthlyDiff))}<span className="text-2xl text-gray-400 font-medium">{t('roiCalc.perMo')}</span></p>
            <p className="text-gray-400 text-sm mt-2">
              {t('roiCalc.savingsMath', { platformFee: fmt(platformCut), spontiFee: fmt(tier.price), saved: fmt(Math.max(0, monthlyDiff)) })}
            </p>
            <p className="text-orange-400 font-bold text-lg mt-2">{t('roiCalc.morePerYear', { amount: fmt(Math.max(0, annualDiff)) })}</p>
            <p className="text-gray-400 text-sm mt-4 italic">
              {t('roiCalc.extraPerYear', { amount: fmt(Math.max(0, annualDiff)) })}
            </p>
          </div>

          {/* Start here -- entry plan */}
          {tier.name !== BUSINESS.name && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('roiCalc.startHere')}</span>
                  <h3 className="text-lg font-black text-gray-900 mt-0.5">{t('roiCalc.planPrice', { name: tier.name, price: fmt(tier.price) })}</h3>
                  <p className="text-sm text-gray-500">{t('roiCalc.zeroCommissionStart')}</p>
                </div>
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                {tier.featureKeys.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={`/auth/signup?type=vendor&plan=${tier.name.toLowerCase()}`} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-orange-400 text-orange-500 hover:bg-orange-50 rounded-xl font-bold transition-colors text-sm">
                {t('roiCalc.startWith', { name: tier.name })} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Business upsell -- always shown */}
          <div className="bg-white rounded-2xl border-2 border-orange-400 overflow-hidden">
            {/* Header bar */}
            <div className="bg-orange-500 px-6 py-3 flex items-center justify-between">
              <span className="text-white font-black text-sm uppercase tracking-wide">{t('roiCalc.bestValueBusiness')}</span>
              <span className="text-white font-black text-lg">{fmt(BUSINESS.price)}{t('roiCalc.perMo')}</span>
            </div>

            <div className="p-5 sm:p-6 space-y-5">

              {/* Savings hook */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                  {t('roiCalc.savingsHook', {
                    platformFee: fmt(platformCut),
                    spontiFee: fmt(BUSINESS.price),
                    saved: fmt(Math.max(0, platformCut - BUSINESS.price)),
                  })}
                </p>
                <p className="text-sm text-gray-500 mt-1.5">
                  {t('roiCalc.pureProfit', { amount: fmt(Math.max(0, (platformCut - BUSINESS.price) * 12)) })}
                </p>
              </div>

              {/* AI section */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{t('roiCalc.whatAIDoes')}</p>
                <ul className="space-y-4">
                  {aiItems.map((item) => (
                    <li key={item.titleKey} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 leading-snug">{t(item.titleKey)}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t(item.descKey)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature checklist */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {featureKeys.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup?type=vendor&plan=business"
                className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-colors"
              >
                {t('roiCalc.getBusinessKeepMore')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowResults(false)}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {t('roiCalc.recalculate')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
