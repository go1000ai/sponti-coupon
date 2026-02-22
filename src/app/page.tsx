import Link from 'next/link';
import { Zap, Clock, Shield, CreditCard, MapPin, ArrowRight, Store, Users, Tag } from 'lucide-react';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/40 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-300">Flash Deals. Real Savings. Right Now.</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
              Unbeatable Flash Deals
              <span className="text-primary-500"> Near You</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mt-6 leading-relaxed">
              Discover 24-hour spontaneous deals from local businesses. Exclusive discounts that won&apos;t wait — save big before the countdown hits zero.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/deals" className="btn-primary text-center text-lg px-8 py-4 inline-flex items-center justify-center gap-2">
                Browse Deals <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/auth/vendor-signup" className="btn-outline border-white/30 text-white hover:bg-white/10 text-center text-lg px-8 py-4">
                List Your Business
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-500">How It Works</h2>
            <p className="text-gray-500 mt-3 text-lg">Three simple steps to incredible savings</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex bg-primary-50 rounded-2xl p-5 mb-5">
                <MapPin className="w-10 h-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-secondary-500 mb-2">1. Discover Deals</h3>
              <p className="text-gray-500">
                Browse flash deals near you by location, category, or deal type. Find exclusive Sponti Coupons with the deepest discounts.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex bg-primary-50 rounded-2xl p-5 mb-5">
                <CreditCard className="w-10 h-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-secondary-500 mb-2">2. Claim & Deposit</h3>
              <p className="text-gray-500">
                Claim your deal and pay a small deposit directly to the business. Get a unique QR code instantly upon payment confirmation.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex bg-primary-50 rounded-2xl p-5 mb-5">
                <Zap className="w-10 h-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-secondary-500 mb-2">3. Redeem & Save</h3>
              <p className="text-gray-500">
                Visit the business, show your QR code, and enjoy your discount. Act fast — Sponti Coupons expire in 24 hours!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Businesses */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-secondary-500">
                Grow Your Business with Flash Deals
              </h2>
              <p className="text-gray-500 mt-4 text-lg">
                Sponti Coupon is the only deal platform with zero transaction fees. We charge a flat monthly subscription — that&apos;s it. Customer deposits go directly to you.
              </p>

              <div className="space-y-4 mt-8">
                <div className="flex items-start gap-3">
                  <div className="bg-green-50 rounded-lg p-2 mt-0.5">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-500">Zero Commission</h4>
                    <p className="text-gray-500 text-sm">No transaction fees, no commission. Flat monthly pricing starting at $49/mo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 rounded-lg p-2 mt-0.5">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-500">Flash Deal Urgency</h4>
                    <p className="text-gray-500 text-sm">Create 24-hour Sponti Coupons with live countdown timers that drive immediate foot traffic.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-50 rounded-lg p-2 mt-0.5">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-500">Direct Deposits</h4>
                    <p className="text-gray-500 text-sm">Customer deposits go straight to your Stripe. We never touch customer money.</p>
                  </div>
                </div>
              </div>

              <Link href="/auth/vendor-signup" className="btn-primary inline-flex items-center gap-2 mt-8">
                <Store className="w-4 h-4" /> Start Your Free Trial
              </Link>
            </div>

            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Plans Starting at</h3>
              <div className="text-5xl font-bold mb-2">$49<span className="text-xl font-normal text-white/70">/mo</span></div>
              <ul className="space-y-3 mt-6">
                {['4 deals per month', 'QR code system included', 'Zero transaction fees', 'Real-time analytics', 'Customer deposit management'].map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-white/90">
                    <Zap className="w-4 h-4 text-white/70" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="block bg-white text-primary-500 font-bold text-center py-3 rounded-lg mt-8 hover:bg-gray-50 transition-colors">
                View All Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-secondary-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-500">10K+</div>
              <div className="text-gray-400 mt-1">Active Deals</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-500">5K+</div>
              <div className="text-gray-400 mt-1">Local Businesses</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-500">500K+</div>
              <div className="text-gray-400 mt-1">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-500">$2M+</div>
              <div className="text-gray-400 mt-1">Saved by Customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary-500">
            Ready to Start Saving?
          </h2>
          <p className="text-gray-500 mt-4 text-lg">
            Join thousands of savvy shoppers discovering incredible flash deals every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4 inline-flex items-center justify-center gap-2">
              <Users className="w-5 h-5" /> Sign Up Free
            </Link>
            <Link href="/deals" className="btn-outline text-lg px-8 py-4 inline-flex items-center justify-center gap-2">
              <Tag className="w-5 h-5" /> Browse Deals
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
