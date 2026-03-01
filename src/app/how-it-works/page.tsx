import Link from 'next/link';
import { Search, CreditCard, QrCode, Star, Zap, Tag, ArrowRight, Gift } from 'lucide-react';

export const metadata = {
  title: 'How It Works | SpontiCoupon',
  description: 'Learn how SpontiCoupon works — browse deals, claim with one click, and redeem with QR codes at local businesses.',
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-accent-700 text-white py-24 px-4">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">How SpontiCoupon Works</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">Save big on local businesses in just 3 simple steps</p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4 -mt-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: <Search className="w-8 h-8 text-primary-500" />, title: 'Browse Deals', desc: 'Explore deals from local businesses near you. Filter by category, location, and deal type. Find the perfect deal for any occasion.', gradient: 'from-primary-500 to-orange-500' },
              { step: '2', icon: <CreditCard className="w-8 h-8 text-accent-500" />, title: 'Claim Your Deal', desc: 'Claim a Steady Deal for free, or lock in a Sponti Coupon. The vendor sets the terms — deposit, full prepay, or free claim. You get a unique QR code instantly.', gradient: 'from-accent-500 to-blue-600' },
              { step: '3', icon: <QrCode className="w-8 h-8 text-green-500" />, title: 'Redeem & Save', desc: 'Show your QR code at the business. The staff scans it, and you enjoy your discount. It\'s that simple!', gradient: 'from-green-500 to-emerald-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-8 text-center relative tilt-card">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${s.gradient} text-white font-bold text-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>{s.step}</div>
                <div className="mb-4 flex justify-center">{s.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deal Types */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-accent-50/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">Two Types of Deals</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 tilt-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-accent-100 to-blue-100 rounded-xl p-3"><Tag className="w-6 h-6 text-accent-600" /></div>
                <h3 className="text-xl font-bold text-gray-900">Steady Deals</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" /> Last 1-30 days</li>
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" /> Claim for free — no deposit needed</li>
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" /> Standard discounts from local businesses</li>
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" /> Redeem at your convenience</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary-50 to-orange-50 rounded-2xl p-8 shadow-sm border border-primary-100 tilt-card gradient-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-primary-100 to-orange-100 rounded-xl p-3"><Zap className="w-6 h-6 text-primary-500" /></div>
                <h3 className="text-xl font-bold text-primary-600">Sponti Coupons</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" /> Sponti deals lasting 4-24 hours</li>
                <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" /> Deeper discounts than Steady Deals</li>
                <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" /> Vendor sets the terms (deposit, prepay, or free)</li>
                <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" /> Limited-time urgency creates excitement</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Loyalty */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-amber-400 mb-6 shadow-lg shadow-primary-200">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Earn Rewards Automatically</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Every time you redeem a deal, you may earn stamps or points in the business&apos;s loyalty program. Collect enough and redeem free rewards — it happens automatically!
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to start saving?</h2>
          <p className="text-gray-300 mb-6">Browse local deals and claim your first one today.</p>
          <Link href="/deals" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all hover:scale-[1.02]">
            Browse Deals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
