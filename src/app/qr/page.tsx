import Link from 'next/link';

export const metadata = {
  title: 'Scan to claim 3 months free — SpontiCoupon',
  description: 'Founding Vendor offer: 3 months free, no credit card. Scan to sign up.',
};

export default function QrPage() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
        Founding Vendor Offer &middot; Only 15 Spots
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
        Get <span className="text-primary-600">3 months free</span>
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Full Business plan &middot; <strong className="text-gray-900">No credit card</strong> &middot; Keep 100% of sales
      </p>

      <div className="bg-white rounded-3xl shadow-2xl border border-white/70 p-6 sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/founding-vendor-qr.svg"
          alt="Scan to sign up for SpontiCoupon"
          className="w-60 h-60 sm:w-72 sm:h-72"
        />
      </div>

      <p className="text-base text-gray-500 mt-6">Point your phone camera here to sign up</p>
      <Link href="/founding-vendor" className="text-primary-600 font-bold mt-1 hover:underline">
        sponticoupon.com/founding-vendor
      </Link>
    </div>
  );
}
