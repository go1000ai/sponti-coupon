'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';
import { useEffect, useState, useRef } from 'react';
import {
  ShieldCheck, Banknote, Clock, Smartphone, QrCode, HeartHandshake,
  XCircle, CheckCircle2, ArrowRight
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import Link from 'next/link';

function AnimatedBar({ targetWidth, color, delay = 0 }: { targetWidth: number; color: string; delay?: number }) {
  const { ref, isVisible } = useScrollAnimation();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setWidth(targetWidth), delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, targetWidth, delay]);

  return (
    <div ref={ref} className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
      <div
        className={`h-4 rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function CountUpNumber({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const { ref, isVisible } = useScrollAnimation();
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      const duration = 1500;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.round(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isVisible, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export function WhySpontiCoupon() {
  return (
    <section className="py-12 sm:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-emerald-600">Why Choose Us</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Not Your Typical Deal Platform
            </h2>
            <p className="text-gray-500 mt-3 text-base sm:text-lg max-w-2xl mx-auto">
              Traditional platforms take massive commissions from local businesses. We built something better.
            </p>
          </div>
        </ScrollReveal>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {/* Traditional Platforms */}
          <ScrollReveal animation="slide-right">
            <div className="card p-6 sm:p-8 border-red-100 bg-red-50/30 relative">
              <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
                Traditional
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-6">
                Commission-Based Platforms
              </h3>
              <div className="space-y-4">
                {[
                  '15-50% commission per sale',
                  'Platform holds your money',
                  'Generic voucher system',
                  'No customer support phone line',
                  'Hidden fees and restrictions',
                  'Merchants locked into contracts',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* SpontiCoupon */}
          <ScrollReveal animation="slide-left">
            <div className="card p-6 sm:p-8 border-primary-100 bg-gradient-to-br from-primary-50/50 to-orange-50/50 relative floating-card ring-2 ring-primary-200">
              <div className="absolute top-4 right-4 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <SpontiIcon className="w-3 h-3" /> SpontiCoupon
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
                SpontiCoupon
              </h3>
              <div className="space-y-4">
                {[
                  '$0 commission — ever',
                  'Direct deposits to your bank',
                  'QR code instant redemption',
                  'Live support for merchants',
                  'Transparent flat monthly pricing',
                  'Cancel anytime, no contracts',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-gray-900 text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Savings Scenario */}
        <ScrollReveal animation="fade-up">
          <div className="card p-6 sm:p-8 md:p-10 bg-gradient-to-br from-secondary-500 to-secondary-700 text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h3 className="text-lg sm:text-xl font-bold mb-2">
                See the Difference in Real Numbers
              </h3>
              <p className="text-white text-sm mb-8 opacity-80">
                Imagine selling $10,000 in deals this month:
              </p>

              <div className="space-y-6">
                {/* Traditional */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white opacity-90">Commission-based platform (50%)</span>
                    <span className="text-sm text-red-400 font-semibold">You keep $5,000</span>
                  </div>
                  <AnimatedBar targetWidth={50} color="bg-red-500/80" delay={200} />
                  <p className="text-xs text-red-400 mt-1 opacity-80">Platform takes $5,000</p>
                </div>

                {/* SpontiCoupon */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white opacity-90">SpontiCoupon Business ($199/mo)</span>
                    <span className="text-sm text-green-400 font-semibold">You keep $9,801</span>
                  </div>
                  <AnimatedBar targetWidth={98} color="bg-gradient-to-r from-green-500 to-emerald-400" delay={600} />
                  <p className="text-xs text-green-400 mt-1 opacity-80">Flat fee: just $199</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm opacity-80">You take home more every month</p>
                  <p className="text-3xl sm:text-4xl font-bold text-primary-500">
                    $<CountUpNumber target={4801} />
                  </p>
                  <p className="text-white text-xs mt-1 opacity-70">Annual subscription pays for itself in less than one month</p>
                </div>
                <Link
                  href="/auth/signup?type=vendor"
                  className="btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12">
          {[
            {
              icon: Banknote,
              title: 'Zero Commissions',
              description: 'Keep 100% of your revenue. We charge a flat monthly subscription, not a cut of your sales.',
              gradient: 'from-green-500 to-emerald-600',
            },
            {
              icon: Clock,
              title: '24-Hour Sponti Deals',
              description: 'Create urgency with time-limited Sponti Coupons that drive immediate foot traffic.',
              gradient: 'from-primary-500 to-orange-600',
            },
            {
              icon: QrCode,
              title: 'Instant QR Redemption',
              description: 'No vouchers to print. Customers show a QR code, you scan it. Done in seconds.',
              gradient: 'from-blue-500 to-blue-600',
            },
            {
              icon: Smartphone,
              title: 'Mobile-First Design',
              description: 'Beautiful experience on any device. PWA support means customers can install it like an app.',
              gradient: 'from-sky-500 to-blue-600',
            },
            {
              icon: HeartHandshake,
              title: 'Merchant Partnership',
              description: 'We succeed when you succeed. Dedicated support, analytics dashboard, and growth tools.',
              gradient: 'from-rose-500 to-pink-600',
            },
            {
              icon: ShieldCheck,
              title: 'Verified Businesses',
              description: 'Every merchant is verified. Customers trust our platform because we vet every business.',
              gradient: 'from-teal-500 to-cyan-600',
            },
          ].map((feature, i) => (
            <ScrollReveal key={feature.title} animation="fade-up" delay={i * 100}>
              <div className="floating-card card p-5 sm:p-6 bg-white">
                <div className={`inline-flex bg-gradient-to-br ${feature.gradient} rounded-xl p-3 mb-4 shadow-md`}>
                  <feature.icon className="w-6 h-6 text-white" strokeWidth={1.8} />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
