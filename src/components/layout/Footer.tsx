'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Facebook } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  // Hide footer on vendor, admin, and customer dashboard pages — they have their own sidebar layouts
  if (pathname.startsWith('/vendor') || pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <footer className="bg-gradient-to-b from-gray-900 via-gray-900 to-secondary-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-[0.03] pointer-events-none" />
      {/* Subtle blue accent glow at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-secondary-700/30 to-transparent pointer-events-none" />
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
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.facebook.com/sponticoupon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Customers</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/deals" className="hover:text-secondary-400 transition-colors">Browse Deals</Link></li>
              <li><Link href="/auth/signup" className="hover:text-secondary-400 transition-colors">Create Account</Link></li>
              <li><Link href="/how-it-works" className="hover:text-secondary-400 transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Businesses</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/auth/signup?type=vendor" className="hover:text-secondary-400 transition-colors">List Your Business</Link></li>
              <li><Link href="/pricing" className="hover:text-secondary-400 transition-colors">Pricing</Link></li>
              <li><Link href="/faq" className="hover:text-secondary-400 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/about" className="hover:text-secondary-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-secondary-400 transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-secondary-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-secondary-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/vendor-terms" className="hover:text-secondary-400 transition-colors">Vendor Terms</Link></li>
              <li><Link href="/loyalty-terms" className="hover:text-secondary-400 transition-colors">SpontiPoints Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700/50 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Online Commerce Hub, LLC DBA SpontiCoupon. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
