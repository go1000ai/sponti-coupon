'use client';

import { ROICalculator } from '@/components/sections/ROICalculator';

export default function ROIPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 px-4 text-center">
        <div className="inline-block bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          Free ROI Calculator
        </div>
        <h1 className="text-4xl sm:text-6xl font-black mb-5 leading-tight">
          How much are you<br />
          <span className="text-orange-400">leaving on the table?</span>
        </h1>
        <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">
          Enter your current platform&apos;s commission rate and your monthly numbers.
          See exactly how much more you&apos;d keep with SpontiCoupon.
        </p>

        {/* 3 trust stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-10 text-center">
          {[
            { value: '0%', label: 'Commission ever' },
            { value: '$0', label: 'Hidden fees' },
            { value: '100%', label: 'Yours to keep' },
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
