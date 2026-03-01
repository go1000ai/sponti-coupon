'use client';

import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Rocket, BadgeDollarSign, Landmark, ArrowRight } from 'lucide-react';

export function BusinessBanner() {
  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="scale-up">
          <div className="card p-5 sm:p-8 md:p-12 bg-gradient-to-br from-secondary-500 to-secondary-700 text-white overflow-hidden relative">
            {/* Decorative orbs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                  Are You a Business Owner?
                </h2>
                <p className="text-gray-300 text-base sm:text-lg mb-6 max-w-xl">
                  List your deals on SpontiCoupon with zero commission fees. Flat monthly pricing — deposits go directly to your account.
                </p>

                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/20 rounded-lg p-1.5">
                      <BadgeDollarSign className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-medium text-gray-200">$0 Commission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-sky-500/20 rounded-lg p-1.5">
                      <Landmark className="w-5 h-5 text-sky-400" strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-medium text-gray-200">Direct Deposits</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/auth/signup?type=vendor"
                    className="btn-primary inline-flex items-center gap-2 hover:scale-105 transition-transform duration-200"
                  >
                    <Rocket className="w-4 h-4" /> Start Your Free Trial
                  </Link>
                  <Link
                    href="/for-business"
                    className="text-primary-400 font-semibold inline-flex items-center gap-1 px-4 py-3 hover:text-primary-300 transition-colors"
                  >
                    Learn More <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="hidden md:flex flex-col items-center gap-2 text-center shrink-0">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                  <p className="text-5xl font-bold text-primary-400">$0</p>
                  <p className="text-gray-300 text-sm mt-1">commission — ever</p>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-white font-medium text-sm">Flat monthly subscription</p>
                    <p className="text-gray-400 text-xs mt-1">Cancel anytime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
