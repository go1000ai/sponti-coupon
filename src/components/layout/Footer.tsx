'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  // Hide footer on vendor, admin, and customer dashboard pages — they have their own sidebar layouts
  if (pathname.startsWith('/vendor') || pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <footer className="bg-secondary-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="SpontiCoupon"
                width={160}
                height={50}
                className="h-12 w-auto brightness-110"
              />
            </div>
            <p className="text-gray-400 text-sm">
              Sponti Deals that won&apos;t wait. Save big on local businesses with 24-hour spontaneous coupons.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Customers</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/deals" className="hover:text-primary-500 transition-colors">Browse Deals</Link></li>
              <li><Link href="/auth/signup" className="hover:text-primary-500 transition-colors">Create Account</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary-500 transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Businesses</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/auth/signup?type=vendor" className="hover:text-primary-500 transition-colors">List Your Business</Link></li>
              <li><Link href="/pricing" className="hover:text-primary-500 transition-colors">Pricing</Link></li>
              <li><Link href="/vendor-faq" className="hover:text-primary-500 transition-colors">Vendor FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/about" className="hover:text-primary-500 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary-500 transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary-500 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary-500 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Online Commerce Hub, LLC DBA SpontiCoupon. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
