'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  LayoutDashboard,
  Ticket,
  Heart,
  Bell,
  Settings,
  Compass,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Coupons', href: '/dashboard/my-deals', icon: Ticket },
  { label: 'Deals For You', href: '/dashboard/for-you', icon: Heart },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const browseItem = { label: 'Browse Deals', href: '/deals', icon: Compass };

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : userEmail.split('@')[0];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const allItems = [...navItems, browseItem];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-secondary-400/30">
        <Link href="/dashboard" className="block">
          <Image
            src="/logo.png"
            alt="SpontiCoupon"
            width={180}
            height={54}
            className="h-11 w-auto brightness-110"
          />
        </Link>
        <p className="text-[11px] text-secondary-300 mt-1.5 ml-0.5 tracking-wide uppercase font-medium">Customer Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-secondary-200 hover:bg-secondary-400/20 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Browse Deals - separate section */}
        <div className="pt-3 mt-3 border-t border-secondary-400/30">
          <Link
            href={browseItem.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive(browseItem.href)
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-primary-300 hover:bg-secondary-400/20 hover:text-primary-200'
            }`}
          >
            <Compass className="w-5 h-5 flex-shrink-0" />
            <span>{browseItem.label}</span>
          </Link>
        </div>
      </nav>

      {/* User Info + Sign Out (bottom) */}
      <div className="border-t border-secondary-400/30">
        {/* User profile info */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary-400/40 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-secondary-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-[11px] text-secondary-300 truncate">{userEmail}</p>
          </div>
        </div>
        {/* Sign Out button */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={() => {
              setMobileOpen(false);
              signOut();
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-secondary-200 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-secondary-500 text-white rounded-lg shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-secondary-500 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-secondary-200 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-secondary-500 z-30">
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Mobile top bar with page title */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 pl-16">
          <h2 className="font-semibold text-secondary-500 text-sm">
            {allItems.find((item) => isActive(item.href))?.label || 'Dashboard'}
          </h2>
        </div>

        {/* Page content */}
        <main className="flex-1 bg-gray-50 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
