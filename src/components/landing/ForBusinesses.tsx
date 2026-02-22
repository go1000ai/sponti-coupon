'use client';

import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import {
  BadgeDollarSign, Timer, Landmark, Rocket, ArrowRight,
  ScanLine, LineChart, Zap, MapPinned, ShieldCheck
} from 'lucide-react';

const benefits = [
  {
    icon: BadgeDollarSign,
    gradient: 'from-emerald-500 to-green-600',
    shadow: 'shadow-green-200',
    title: 'Zero Commission',
    description: 'No transaction fees, no commission. Flat monthly pricing — that\'s it.',
  },
  {
    icon: Timer,
    gradient: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-200',
    title: 'Flash Deal Urgency',
    description: 'Create 24-hour Sponti Coupons with live countdown timers that drive immediate foot traffic.',
  },
  {
    icon: Landmark,
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-purple-200',
    title: 'Direct Deposits',
    description: 'Customer deposits go straight to your Stripe. We never touch customer money.',
  },
];

const features = [
  { icon: ScanLine, label: 'QR Code Redemption', gradient: 'from-primary-500 to-orange-600' },
  { icon: LineChart, label: 'Real-Time Analytics', gradient: 'from-blue-500 to-cyan-500' },
  { icon: Zap, label: 'Instant Deal Publishing', gradient: 'from-amber-500 to-yellow-500' },
  { icon: MapPinned, label: 'Multi-Location Support', gradient: 'from-emerald-500 to-teal-500' },
];

export function ForBusinesses() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Benefits */}
          <ScrollReveal animation="slide-right">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-secondary-500">
                Grow Your Business with Flash Deals
              </h2>
              <p className="text-gray-500 mt-4 text-lg">
                The only deal platform with zero transaction fees. We charge a flat monthly subscription — customer deposits go directly to you.
              </p>

              <div className="space-y-6 mt-8">
                {benefits.map((b) => (
                  <div key={b.title} className="flex items-start gap-4">
                    <div className={`bg-gradient-to-br ${b.gradient} rounded-xl p-3 mt-0.5 shrink-0 shadow-md ${b.shadow}`}>
                      <b.icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secondary-500">{b.title}</h4>
                      <p className="text-gray-500 text-sm mt-0.5">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link href="/auth/vendor-signup" className="btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                  <Rocket className="w-4 h-4" /> Start Your Free Trial
                </Link>
                <Link href="/pricing" className="text-primary-500 font-semibold inline-flex items-center gap-1 px-4 py-3 hover:underline">
                  View Pricing <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Visual feature grid */}
          <ScrollReveal animation="slide-left">
            <div className="bg-gradient-to-br from-secondary-500 to-secondary-700 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-2">Everything You Need</h3>
              <p className="text-gray-300 mb-8">All the tools to attract customers and grow revenue.</p>

              <div className="grid grid-cols-2 gap-4">
                {features.map((f) => (
                  <div
                    key={f.label}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-5 text-center hover:bg-white/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`bg-gradient-to-br ${f.gradient} rounded-lg p-2.5 inline-flex mb-3 shadow-lg`}>
                      <f.icon className="w-7 h-7 text-white" strokeWidth={1.8} />
                    </div>
                    <p className="text-sm font-medium text-white/90">{f.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-white/10 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg p-2.5 shadow-md">
                  <ShieldCheck className="w-5 h-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-semibold text-sm">No hidden fees</p>
                  <p className="text-xs text-gray-300">Flat rate subscription. Cancel anytime.</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
