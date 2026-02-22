'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Menu, X, User, Store, LayoutDashboard, LogOut, ScanLine } from 'lucide-react';

export function Navbar() {
  const { user, role, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="SpontiCoupon"
              width={267}
              height={80}
              className="h-20 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/deals" className="nav-link-animated text-gray-600 hover:text-primary-500 transition-colors font-medium pb-1">
              Browse Deals
            </Link>

            {!loading && !user && (
              <>
                <Link href="/auth/login" className="nav-link-animated text-gray-600 hover:text-primary-500 transition-colors font-medium pb-1">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
                  Sign Up Free
                </Link>
                <Link href="/auth/vendor-signup" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                  For Businesses
                </Link>
              </>
            )}

            {!loading && user && role === 'vendor' && (
              <>
                <Link href="/vendor/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/vendor/deals" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <Store className="w-4 h-4" /> My Deals
                </Link>
                <Link href="/vendor/scan" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <ScanLine className="w-4 h-4" /> Scan QR
                </Link>
                <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-medium">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            )}

            {!loading && user && role === 'customer' && (
              <>
                <Link href="/my-deals" className="text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  My Deals
                </Link>
                <Link href="/account" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <User className="w-4 h-4" /> Account
                </Link>
                <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-medium">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            )}

            {!loading && user && role === 'admin' && (
              <>
                <Link href="/admin" className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors font-medium">
                  <LayoutDashboard className="w-4 h-4" /> Admin
                </Link>
                <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-medium">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2.5"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-1">
          <Link href="/deals" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>
            Browse Deals
          </Link>
          {!loading && !user && (
            <>
              <Link href="/auth/login" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link href="/auth/signup" className="block btn-primary text-center text-sm py-3 mt-2" onClick={() => setMobileOpen(false)}>
                Sign Up Free
              </Link>
              <Link href="/auth/vendor-signup" className="block text-gray-400 hover:text-gray-600 text-center text-sm py-3 mt-1" onClick={() => setMobileOpen(false)}>
                For Businesses
              </Link>
            </>
          )}
          {!loading && user && role === 'vendor' && (
            <>
              <Link href="/vendor/dashboard" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href="/vendor/deals" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>My Deals</Link>
              <Link href="/vendor/scan" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>Scan QR</Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="block text-red-500 font-medium py-3 w-full text-left">Sign Out</button>
            </>
          )}
          {!loading && user && role === 'customer' && (
            <>
              <Link href="/my-deals" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>My Deals</Link>
              <Link href="/account" className="block text-gray-600 hover:text-primary-500 font-medium py-3" onClick={() => setMobileOpen(false)}>Account</Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="block text-red-500 font-medium py-3 w-full text-left">Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
