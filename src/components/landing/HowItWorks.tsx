'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useParallax } from '@/lib/hooks/useParallax';
import { Search, Wallet, QrCode, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: '1. Discover Deals',
    description:
      'Browse Sponti Deals near you by location, category, or deal type. Find exclusive Sponti Coupons with the deepest discounts.',
    gradient: 'from-primary-500 to-orange-600',
    shadow: 'shadow-orange-200',
  },
  {
    icon: Wallet,
    title: '2. Claim & Deposit',
    description:
      'Claim your deal and pay a small deposit directly to the business. Get a unique QR code instantly upon payment confirmation.',
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-200',
  },
  {
    icon: QrCode,
    title: '3. Redeem & Save',
    description:
      'Visit the business, show your QR code, and enjoy your discount. Act fast — Sponti Coupons expire in 24 hours!',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-200',
  },
];

export function HowItWorks() {
  const orb1Ref = useParallax(0.08);
  const orb2Ref = useParallax(0.15);
  const orb3Ref = useParallax(0.1);

  return (
    <section id="how-it-works" className="relative py-12 sm:py-16 md:py-20 bg-gray-50 scroll-mt-20 overflow-hidden">
      {/* Floating parallax orbs for depth */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div ref={orb1Ref} className="absolute -top-10 -left-20 w-72 h-72 bg-gradient-to-br from-primary-500/8 to-orange-500/5 rounded-full blur-3xl" />
        <div ref={orb2Ref} className="absolute top-1/3 -right-16 w-56 h-56 bg-gradient-to-br from-blue-500/6 to-blue-500/4 rounded-full blur-3xl" />
        <div ref={orb3Ref} className="absolute -bottom-10 left-1/3 w-64 h-64 bg-gradient-to-br from-emerald-500/6 to-teal-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-3 text-lg">Three simple steps to incredible savings</p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">
          {steps.map((step, i) => (
            <ScrollReveal key={step.title} animation="fade-up" delay={i * 150}>
              <div className="text-center floating-card card p-5 sm:p-8 bg-white relative h-full">
                {/* Gradient icon container */}
                <div className={`inline-flex bg-gradient-to-br ${step.gradient} rounded-2xl p-5 mb-6 shadow-lg ${step.shadow}`}>
                  <step.icon className="w-10 h-10 text-white" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>

                {/* Arrow connector (hidden on last item and mobile) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <div className="bg-white rounded-full p-1.5 shadow-md border border-gray-100">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
