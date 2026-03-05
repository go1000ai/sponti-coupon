'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { Menu, X, User, Store, LayoutDashboard, LogOut, ScanLine, Bell } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export function Navbar() {
  const { user, role, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Hide navbar on vendor, admin, and customer dashboard pages — they have their own sidebar navigation
  if (pathname.startsWith('/vendor') || pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-[60]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="SpontiCoupon"
              width={267}
              height={80}
              className="h-14 sm:h-20 md:h-24 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <LanguageToggle />
            <Link href="/deals" className="relative inline-flex items-center gap-1.5 text-primary-500 font-bold pb-1 hover:text-primary-600 transition-colors group">
              <SpontiIcon className="w-5 h-5 group-hover:animate-wiggle" />
              {t('nav.browseDeals')}
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-full animate-pulse" />
            </Link>

            {/* Show Sign In / Sign Up / For Businesses when no confirmed user */}
            {!user && (
              <>
                <Link href="/auth/login" className="nav-link-animated text-gray-600 hover:text-primary-500 transition-colors font-medium pb-1">
                  {t('nav.signIn')}
                </Link>
                <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
                  {t('nav.signUp')}
                </Link>
                <Link href="/pricing" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                  {t('nav.forBusinesses')}
                </Link>
              </>
            )}

            {!loading && user && role === 'vendor' && (
              <>
                <Link href="/vendor/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
                </Link>
                <Link href="/vendor/deals" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <Store className="w-4 h-4" /> {t('nav.myDeals')}
                </Link>
                <Link href="/vendor/scan" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <ScanLine className="w-4 h-4" /> {t('nav.scanQR')}
                </Link>
                <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-medium">
                  <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                </button>
              </>
            )}

            {!loading && user && role === 'customer' && (
              <>
                <Link href="/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
                </Link>
                <Link href="/dashboard/my-deals" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  {t('nav.myDeals')}
                </Link>
                <Link
                  href="/dashboard/notifications"
                  className="relative p-2 text-gray-500 hover:text-primary-500 transition-colors"
                  aria-label={t('nav.notifications')}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </Link>
                <Link href="/dashboard/settings" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <User className="w-4 h-4" /> {t('nav.account')}
                </Link>
                <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-medium">
                  <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                </button>
              </>
            )}

            {!loading && user && role === 'admin' && (
              <>
                <Link href="/admin" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <LayoutDashboard className="w-4 h-4" /> {t('nav.admin')}
                </Link>
                <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-medium">
                  <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2.5"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('nav.menu')}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-1">
          <LanguageToggle className="mb-2" />
          <Link href="/deals" className="block text-primary-500 font-bold py-3 inline-flex items-center gap-1.5 border-b-2 border-primary-500" onClick={() => setMobileOpen(false)}>
            <SpontiIcon className="w-5 h-5" /> {t('nav.browseDeals')}
          </Link>
          {!user && (
            <>
              <Link href="/auth/login" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>
                {t('nav.signIn')}
              </Link>
              <Link href="/auth/signup" className="block btn-primary text-center text-sm py-3 mt-2" onClick={() => setMobileOpen(false)}>
                {t('nav.signUp')}
              </Link>
              <Link href="/pricing" className="block text-gray-400 hover:text-gray-600 text-center text-sm py-3 mt-1" onClick={() => setMobileOpen(false)}>
                {t('nav.forBusinesses')}
              </Link>
            </>
          )}
          {!loading && user && role === 'vendor' && (
            <>
              <Link href="/vendor/dashboard" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</Link>
              <Link href="/vendor/deals" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>{t('nav.myDeals')}</Link>
              <Link href="/vendor/scan" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>{t('nav.scanQR')}</Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="block text-red-500 font-medium py-3 w-full text-left">{t('nav.signOut')}</button>
            </>
          )}
          {!loading && user && role === 'customer' && (
            <>
              <Link href="/dashboard" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</Link>
              <Link href="/dashboard/my-deals" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>{t('nav.myDeals')}</Link>
              <Link href="/dashboard/notifications" className="flex items-center gap-2 text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>
                <Bell className="w-4 h-4" />
                {t('nav.notifications')}
                <span className="w-2 h-2 bg-red-500 rounded-full" />
              </Link>
              <Link href="/dashboard/settings" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>{t('nav.account')}</Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="block text-red-500 font-medium py-3 w-full text-left">{t('nav.signOut')}</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
