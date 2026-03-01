'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';
import { useCountUp } from '@/lib/hooks/useCountUp';
import {
  CircleCheck, HandCoins, TrendingDown, TrendingUp,
  ReceiptText, Landmark, Ban, Sparkles, PiggyBank,
  Clock, Wallet, CalendarX, XCircle,
  Zap, BadgeCheck, ArrowDownUp
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';

const traditionalPlatform = [
  { icon: ReceiptText, text: 'Up to 50% commission taken from every sale' },
  { icon: HandCoins, text: 'Platform collects & controls all customer payments' },
  { icon: Clock, text: 'Wait 60–90 days to receive your earnings' },
  { icon: TrendingDown, text: 'The more you sell, the more they take' },
  { icon: CalendarX, text: 'Locked into long-term contracts' },
  { icon: Ban, text: 'Hidden fees, chargebacks, and fine print' },
];

const spontiCoupon = [
  { icon: PiggyBank, text: '$0 commission — not now, not ever' },
  { icon: Landmark, text: 'Deposits go directly to YOUR account' },
  { icon: Zap, text: 'Get paid instantly — no waiting 60-90 days' },
  { icon: TrendingUp, text: 'Flat monthly rate — predictable costs' },
  { icon: Wallet, text: 'You keep 100% of every transaction' },
  { icon: CircleCheck, text: 'No contracts, no hidden fees — cancel anytime' },
];

function AnimatedBar({ targetPercent, color, label, amount, delay = 0 }: {
  targetPercent: number;
  color: string;
  label: string;
  amount: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div ref={ref} className="space-y-1.5 sm:space-y-2">
      <div className="flex justify-between text-xs sm:text-sm gap-2">
        <span className="font-medium text-white opacity-90">{label}</span>
        <span className="font-bold text-white shrink-0">{amount}</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-6 sm:h-7 overflow-hidden">
        <div
          className={`h-6 sm:h-7 rounded-full ${color} transition-all ease-out flex items-center justify-end pr-2 sm:pr-3`}
          style={{
            width: isVisible ? `${targetPercent}%` : '0%',
            transitionDelay: `${delay}ms`,
            transitionDuration: '1.5s',
          }}
        >
          <span className="text-[10px] sm:text-xs font-bold text-white">{targetPercent}%</span>
        </div>
      </div>
    </div>
  );
}

export function CompetitorComparison() {
  const { ref: savingsRef, displayValue: savingsValue } = useCountUp(4801, 2000);

  return (
    <section className="py-10 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-orange-50 rounded-full px-5 py-2 mb-4 shadow-sm">
              <Sparkles className="w-4 h-4 text-primary-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-primary-600">The Smart Choice</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Why Businesses Choose SpontiCoupon
            </h2>
            <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">
              See how we compare to commission-based deal platforms
            </p>
          </div>
        </ScrollReveal>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-5 sm:gap-8 mb-10 sm:mb-16">
          {/* Traditional Platform */}
          <ScrollReveal animation="slide-right" delay={0}>
            <div className="card p-5 sm:p-8 border-gray-200 bg-gray-50 h-full">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl p-2.5 shadow-md shadow-gray-200">
                  <ReceiptText className="w-6 h-6 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-600">Traditional Deal Platforms</h3>
                  <p className="text-sm text-gray-400">Commission-based model</p>
                </div>
              </div>
              <div className="space-y-4">
                {traditionalPlatform.map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="bg-red-50 rounded-lg p-1.5 shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-red-400" strokeWidth={2} />
                    </div>
                    <p className="text-gray-600 text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-3xl font-bold text-gray-400">Up to 50%</p>
                <p className="text-sm text-gray-400">of every sale goes to the platform</p>
              </div>
              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">On a $100 deal, you could lose up to $50 per transaction. Then wait up to 90 days to get the rest.</p>
              </div>
            </div>
          </ScrollReveal>

          {/* SpontiCoupon */}
          <ScrollReveal animation="slide-left" delay={150}>
            <div className="card p-5 sm:p-8 border-primary-200 bg-white ring-2 ring-primary-500/20 h-full relative !overflow-visible">
              <div className="absolute -top-3 right-4 sm:right-6 bg-gradient-to-r from-primary-500 to-orange-500 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-md shadow-orange-200">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-primary-500 to-orange-600 rounded-xl p-2.5 shadow-lg shadow-orange-200">
                  <SpontiIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">SpontiCoupon</h3>
                  <p className="text-sm text-gray-400">Flat-rate model</p>
                </div>
              </div>
              <div className="space-y-4">
                {spontiCoupon.map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="bg-green-50 rounded-lg p-1.5 shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-green-500" strokeWidth={2} />
                    </div>
                    <p className="text-gray-900 text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-primary-100">
                <p className="text-3xl font-bold text-primary-500">$0</p>
                <p className="text-sm text-gray-500">commission — flat monthly subscription</p>
              </div>
              <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium">On a $100 deal, you keep $100. Money hits your account instantly.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Savings Scenario */}
        <ScrollReveal animation="scale-up">
          <div className="card p-5 sm:p-8 md:p-12 bg-gradient-to-br from-secondary-500 to-secondary-700 text-white">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-2">
              See the Difference on $10,000 in Monthly Sales
            </h3>
            <p className="text-center text-white opacity-80 mb-6 sm:mb-10 text-sm sm:text-base">
              Here&apos;s what you actually take home
            </p>

            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
              <AnimatedBar
                targetPercent={50}
                color="bg-gradient-to-r from-red-400 to-red-500"
                label="Commission Platform (50%)"
                amount="You keep $5,000"
                delay={0}
              />
              <AnimatedBar
                targetPercent={98}
                color="bg-gradient-to-r from-emerald-400 to-green-500"
                label="SpontiCoupon ($199/mo)"
                amount="You keep $9,801"
                delay={300}
              />
            </div>

            {/* Savings callout */}
            <div ref={savingsRef} className="text-center mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-white/20 px-1">
              <p className="text-white text-xs sm:text-sm uppercase tracking-wide mb-2 opacity-80">You take home more every month</p>
              <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-400">
                ${savingsValue.toLocaleString()}
              </p>
              <p className="text-white mt-2 opacity-80 text-sm sm:text-base">
                That&apos;s <span className="text-white font-semibold opacity-100">${(savingsValue * 12).toLocaleString()}</span> more in your pocket every year
              </p>
              <p className="text-white/90 text-xs sm:text-sm mt-3 sm:mt-4 font-medium">
                Your entire annual subscription pays for itself in <span className="text-primary-400 font-bold">less than one month</span>. That&apos;s 11 months of pure profit.
              </p>
              <p className="text-white text-[11px] sm:text-xs mt-2 opacity-70">
                Need unlimited deals? Our Enterprise plan at $499/mo gives you <span className="text-primary-400 font-semibold">unlimited Sponti + Steady deals</span> — and you&apos;d still take home $4,501/mo more vs. commission platforms.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Feature Comparison Table */}
        <ScrollReveal animation="fade-up" delay={200}>
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Feature-by-Feature Comparison
            </h3>
            <div className="card overflow-hidden border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-2.5 sm:py-4 sm:px-6 font-semibold text-gray-600">Feature</th>
                      <th className="text-center py-3 px-2 sm:py-4 sm:px-6 font-semibold text-gray-400">Traditional Platforms</th>
                      <th className="text-center py-3 px-2 sm:py-4 sm:px-6 font-semibold text-primary-600 bg-primary-50/50">SpontiCoupon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { feature: 'Commission per sale', trad: 'Up to 50%', sponti: '0%', spontiHighlight: true },
                      { feature: 'When you get paid', trad: '60–90 days', sponti: 'Instantly', spontiHighlight: true },
                      { feature: 'Who controls the money', trad: 'The platform', sponti: 'You — always', spontiHighlight: true },
                      { feature: 'Monthly cost', trad: '$0 + huge commissions', sponti: 'Flat $49–$199/mo', spontiHighlight: false },
                      { feature: 'Contract length', trad: '6–12 month lock-in', sponti: 'No contract — cancel anytime', spontiHighlight: true },
                      { feature: 'Hidden fees', trad: 'Marketing fees, setup fees, penalties', sponti: 'None', spontiHighlight: true },
                      { feature: 'Sponti Deals (same day)', trad: 'Not available', sponti: '4–24 hr Sponti Coupons', spontiHighlight: true },
                      { feature: 'Customer deposit', trad: 'Platform collects & holds', sponti: 'Direct to your account', spontiHighlight: true },
                      { feature: 'QR + 6-digit redemption', trad: 'QR only (some)', sponti: 'QR + 6-digit code', spontiHighlight: false },
                      { feature: 'Vendor dashboard', trad: 'Limited analytics', sponti: 'Real-time analytics', spontiHighlight: false },
                    ].map((row) => (
                      <tr key={row.feature} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-2.5 sm:py-3.5 sm:px-6 font-medium text-gray-900">{row.feature}</td>
                        <td className="py-2.5 px-2 sm:py-3.5 sm:px-6 text-center text-gray-400">
                          <span className="inline-flex items-center gap-1 sm:gap-1.5">
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-300 shrink-0" />
                            {row.trad}
                          </span>
                        </td>
                        <td className={`py-2.5 px-2 sm:py-3.5 sm:px-6 text-center bg-primary-50/30 ${row.spontiHighlight ? 'font-semibold text-primary-600' : 'text-gray-900'}`}>
                          <span className="inline-flex items-center gap-1 sm:gap-1.5">
                            <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 shrink-0" />
                            {row.sponti}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom line CTA */}
        <ScrollReveal animation="scale-up" delay={100}>
          <div className="mt-12 text-center bg-gradient-to-r from-primary-50 to-orange-50 border border-primary-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Stop Giving Away Your Revenue
            </h3>
            <p className="text-gray-600 max-w-xl mx-auto mb-6">
              Other platforms take up to 50% of every sale and make you wait months for your money.
              With SpontiCoupon, every dollar goes directly to you — instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/auth/signup?type=vendor" className="btn-primary inline-flex items-center gap-2">
                <Zap className="w-4 h-4" /> Start Your Free Trial
              </a>
              <a href="/pricing" className="text-primary-500 font-semibold inline-flex items-center gap-1 px-4 py-3 hover:underline">
                View Pricing <ArrowDownUp className="w-4 h-4" />
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
