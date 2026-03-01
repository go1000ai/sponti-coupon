import Link from 'next/link';
import Image from 'next/image';
import { Heart, Shield, Zap, Users, ArrowRight, Store, DollarSign, Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'About Us | SpontiCoupon',
  description: 'Learn about SpontiCoupon — the bridge between great deals for customers and profitable growth for local vendors.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-24 px-4">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Image src="/logo.png" alt="SpontiCoupon" width={220} height={66} className="mx-auto mb-8 brightness-110" />
          <h1 className="text-3xl sm:text-5xl font-bold mb-6">
            Bridging <span className="gradient-text">Deals</span> & Local Business
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            We created SpontiCoupon because we saw a problem: vendors lose money and wait too long to get paid. Customers don&apos;t get the best value. And vendors don&apos;t get loyal customers.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-orange-50 text-primary-600 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-primary-100">
              <Sparkles className="w-4 h-4" /> Our Mission
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Why We Built SpontiCoupon</h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
              SpontiCoupon is the bridge between getting amazing deals and helping vendors make a real profit. We collect a simple flat rate to keep small businesses successful — no hidden fees, no large commissions, no long payment waits.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: <DollarSign className="w-7 h-7 text-primary-600" />,
                bg: 'from-primary-100 to-orange-100',
                title: 'Fair for Vendors',
                desc: 'We charge a flat subscription — not a percentage of every sale. Vendors keep more of what they earn.',
              },
              {
                icon: <Heart className="w-7 h-7 text-accent-600" />,
                bg: 'from-accent-100 to-blue-100',
                title: 'Great for Customers',
                desc: 'Real discounts on local businesses you love, with transparent terms and verified reviews.',
              },
              {
                icon: <Users className="w-7 h-7 text-blue-600" />,
                bg: 'from-blue-100 to-sky-100',
                title: 'Building Loyalty',
                desc: 'Our loyalty program turns deal hunters into regulars, creating lasting relationships.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 tilt-card rounded-2xl">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-accent-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">What Makes Us Different</h2>
            <p className="text-gray-500 mt-2">Built from the ground up to be fair, transparent, and effective</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: <Zap className="w-5 h-5 text-primary-500" />, color: 'primary', title: 'Sponti Coupons', desc: 'Sponti deals that last 4-24 hours, creating urgency and excitement. Vendors control deposit requirements.' },
              { icon: <Shield className="w-5 h-5 text-green-500" />, color: 'green', title: 'Verified Reviews', desc: 'Only customers who actually redeemed a deal can leave reviews — no fake reviews, ever.' },
              { icon: <Store className="w-5 h-5 text-accent-500" />, color: 'accent', title: 'Vendor First', desc: 'Flat-rate pricing, instant payouts, and analytics to help vendors grow — not just survive.' },
              { icon: <Heart className="w-5 h-5 text-red-500" />, color: 'red', title: 'Loyalty Built In', desc: 'Punch cards and points programs that reward repeat customers automatically.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 tilt-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shadow-sm">{item.icon}</div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why not the old way */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Why Not the Old Way?</h2>
            <p className="text-gray-500 mt-2">Traditional deal platforms hurt the businesses they claim to help</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-8 border border-red-100">
              <h3 className="font-bold text-red-600 mb-4 text-lg">Traditional Deal Platforms</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Take 30-50% of each sale',
                  'Delay vendor payouts for 30-60 days',
                  'No control over deal terms',
                  'No loyalty or repeat customer tools',
                  'Fake reviews are rampant',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 font-bold">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-accent-50 rounded-2xl p-8 border border-green-100 gradient-border">
              <h3 className="font-bold text-green-600 mb-4 text-lg">SpontiCoupon</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Flat monthly fee — keep 100% of revenue',
                  'Vendors get paid instantly, directly',
                  'Full control over terms, deposits, limits',
                  'Built-in loyalty punch cards & points',
                  'Only verified, QR-confirmed reviews',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">Whether you&apos;re looking for deals or listing your business, we&apos;re here for you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/deals" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all hover:scale-[1.02]">
              Browse Deals <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/for-business" className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2 hover:bg-white/20 transition-all">
              <Store className="w-4 h-4" /> List Your Business
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
