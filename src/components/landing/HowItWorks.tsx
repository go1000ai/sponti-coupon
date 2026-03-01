'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Search, Wallet, QrCode, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Discover Deals',
    description: 'Browse by location or category. Find Sponti Deals and Steady Deals near you.',
    gradient: 'from-primary-500 to-orange-600',
  },
  {
    icon: Wallet,
    title: 'Claim Your Deal',
    description: 'Claim for free, pay a deposit, or pay in full. Payments go directly to the business.',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: QrCode,
    title: 'Redeem & Save',
    description: 'Get a QR code and 6-digit backup code instantly. Show it at the business and enjoy.',
    gradient: 'from-emerald-500 to-teal-600',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-10 sm:py-12 bg-gray-50 scroll-mt-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            How It Works
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {steps.map((step, i) => (
            <ScrollReveal key={step.title} animation="fade-up" delay={i * 100}>
              <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-0 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 relative h-full">
                <div className={`inline-flex bg-gradient-to-br ${step.gradient} rounded-xl p-3 shrink-0 md:mb-3`}>
                  <step.icon className="w-6 h-6 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{step.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow connector between cards (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <div className="bg-white rounded-full p-1 shadow-sm border border-gray-100">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
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
