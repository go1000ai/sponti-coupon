'use client';

import { ROICalculator } from '@/components/sections/ROICalculator';
import { useLanguage } from '@/lib/i18n';

export default function ROIPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 px-4 text-center">
        <div className="inline-block bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          {t('roi.title')}
        </div>
        <h1 className="text-4xl sm:text-6xl font-black mb-5 leading-tight">
          {t('roi.heroTitle')}<br />
          <span className="text-orange-400">{t('roi.heroTitleAccent')}</span>
        </h1>
        <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">
          {t('roi.heroDesc')}
        </p>

        {/* 3 trust stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-10 text-center">
          {[
            { value: '0%', label: t('roi.commissionEver') },
            { value: '$0', label: t('roi.hiddenFees') },
            { value: '100%', label: t('roi.yoursToKeep') },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-black text-orange-400">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <ROICalculator />
      </div>

    </div>
  );
}
