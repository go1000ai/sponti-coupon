'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Facebook, Instagram } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
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
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.facebook.com/sponticoupon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={t('footer.followFacebook')}
              >
                <Facebook className="w-4 h-4 text-white" />
              </a>
              <a
                href="https://www.instagram.com/sponticoupon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={t('footer.followInstagram')}
              >
                <Instagram className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.forCustomers')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/deals" className="hover:text-secondary-400 transition-colors">{t('footer.browseDeals')}</Link></li>
              <li><Link href="/auth/signup" className="hover:text-secondary-400 transition-colors">{t('footer.createAccount')}</Link></li>
              <li><Link href="/how-it-works" className="hover:text-secondary-400 transition-colors">{t('footer.howItWorks')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.forBusinesses')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/auth/signup?type=vendor" className="hover:text-secondary-400 transition-colors">{t('footer.listYourBusiness')}</Link></li>
              <li><Link href="/pricing" className="hover:text-secondary-400 transition-colors">{t('footer.pricing')}</Link></li>
              <li><Link href="/roi" className="hover:text-secondary-400 transition-colors">{t('footer.roiCalculator')}</Link></li>
              <li><Link href="/faq" className="hover:text-secondary-400 transition-colors">{t('footer.faq')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.company')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/about" className="hover:text-secondary-400 transition-colors">{t('footer.aboutUs')}</Link></li>
              <li><Link href="/contact" className="hover:text-secondary-400 transition-colors">{t('footer.contact')}</Link></li>
              <li><Link href="/accessibility" className="hover:text-secondary-400 transition-colors">{t('footer.accessibility')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/privacy" className="hover:text-secondary-400 transition-colors">{t('footer.privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-secondary-400 transition-colors">{t('footer.termsOfService')}</Link></li>
              <li><Link href="/vendor-terms" className="hover:text-secondary-400 transition-colors">{t('footer.vendorTerms')}</Link></li>
              <li><Link href="/loyalty-terms" className="hover:text-secondary-400 transition-colors">{t('footer.spontiPointsTerms')}</Link></li>
              <li><Link href="/dispute-policy" className="hover:text-secondary-400 transition-colors">{t('footer.disputePolicy')}</Link></li>
              <li><Link href="/dmca-policy" className="hover:text-secondary-400 transition-colors">{t('footer.dmca')}</Link></li>
              <li><Link href="/cookies" className="hover:text-secondary-400 transition-colors">{t('footer.cookiePolicy')}</Link></li>
              <li><Link href="/privacy#do-not-sell" className="hover:text-secondary-400 transition-colors">{t('footer.doNotSell')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700/50 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
