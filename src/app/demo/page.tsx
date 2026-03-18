import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'See SpontiCoupon in Action | Demo',
  description: 'Watch how SpontiCoupon helps local businesses attract more customers, build loyalty, and grow revenue — with zero commissions.',
  openGraph: {
    title: 'See SpontiCoupon in Action',
    description: 'Watch how local businesses create deals in minutes, attract new customers, and build loyalty — with zero commissions.',
    images: ['/videos/demo-thumb.jpg'],
  },
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-[#E8632B]/10 border border-[#E8632B]/20 rounded-full px-4 py-1.5 text-sm text-[#E8632B] font-medium mb-6">
          <span className="w-2 h-2 bg-[#E8632B] rounded-full animate-pulse" />
          Watch the Demo
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
          See How SpontiCoupon <br className="hidden md:block" />
          <span className="text-[#E8632B]">Grows Your Business</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Watch how local businesses create deals in minutes with AI, attract new customers,
          and build loyalty programs — all with zero commissions.
        </p>
      </div>

      {/* Video */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-gray-800">
          <video
            controls
            playsInline
            autoPlay
            poster="/videos/demo-thumb.jpg"
            className="w-full"
          >
            <source src="/videos/demo-video.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Key Points */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-white font-bold text-lg mb-2">Live in 5 Minutes</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Paste your website URL — AI creates your deals automatically. Or describe your offer and Ava writes everything for you.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-white font-bold text-lg mb-2">Zero Commissions</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Keep 100% of every dollar. Customers pay you directly. We only charge a flat monthly subscription.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="text-white font-bold text-lg mb-2">Built-In Loyalty</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Punch cards and points rewards built in. Customers auto-enroll when they redeem — turning visitors into regulars.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Ready to Attract More Customers?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Join hundreds of local businesses already growing with SpontiCoupon.
            Your first deal could be live in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup?role=vendor"
              className="bg-gradient-to-r from-[#E8632B] to-[#FF8C42] text-white font-bold px-8 py-3.5 rounded-xl text-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing#plans"
              className="text-gray-400 hover:text-white font-medium px-8 py-3.5 rounded-xl border border-gray-700 hover:border-gray-500 transition-all"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            No credit card required to start
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Online Commerce Hub, LLC DBA SpontiCoupon
      </div>
    </div>
  );
}
