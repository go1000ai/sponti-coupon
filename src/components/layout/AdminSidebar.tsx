'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Users,
  Tag,
  QrCode,
  DollarSign,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Headphones,
  Gift,
  Coins,
  Grid3X3,
  Star,
  CreditCard,
  Bell,
  BarChart3,
  UserCog,
  Settings,
} from 'lucide-react';
import Image from 'next/image';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { label: 'Overview', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { label: 'Vendors', href: '/admin/vendors', icon: <Store className="w-5 h-5" /> },
      { label: 'Customers', href: '/admin/customers', icon: <Users className="w-5 h-5" /> },
      { label: 'Deals', href: '/admin/deals', icon: <Tag className="w-5 h-5" /> },
      { label: 'Claims', href: '/admin/claims', icon: <QrCode className="w-5 h-5" /> },
      { label: 'Reviews', href: '/admin/reviews', icon: <MessageSquare className="w-5 h-5" /> },
    ],
  },
  {
    label: 'Loyalty',
    items: [
      { label: 'Loyalty Programs', href: '/admin/loyalty', icon: <Gift className="w-5 h-5" /> },
      { label: 'SpontiPoints', href: '/admin/spontipoints', icon: <Coins className="w-5 h-5" /> },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Categories', href: '/admin/categories', icon: <Grid3X3 className="w-5 h-5" /> },
      { label: 'Featured Deals', href: '/admin/featured', icon: <Star className="w-5 h-5" /> },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: <CreditCard className="w-5 h-5" /> },
      { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
      { label: 'Support', href: '/admin/support', icon: <Headphones className="w-5 h-5" /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Revenue', href: '/admin/revenue', icon: <DollarSign className="w-5 h-5" /> },
      { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users & Roles', href: '/admin/users', icon: <UserCog className="w-5 h-5" /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

interface AdminSidebarProps {
  onSignOut: () => void;
  userName?: string | null;
  userEmail?: string | null;
}

export default function AdminSidebar({ onSignOut, userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className="p-6 border-b border-secondary-400/30">
        <div className="flex flex-col items-center justify-center gap-2 w-full text-center">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Image
              src="/logo.png"
              alt="SpontiCoupon"
              width={160}
              height={120}
              className="w-40 h-auto mx-auto hover:opacity-80 transition-opacity"
              priority
            />
          </a>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-secondary-300 block w-full text-center">
            Admin Portal
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-secondary-300">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                        : 'text-secondary-200 hover:bg-secondary-400/20 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info + Sign Out */}
      <div className="p-4 border-t border-secondary-400/30">
        {(userName || userEmail) && (
          <div className="px-4 py-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary-400">
                  {userName ? userName.charAt(0).toUpperCase() : userEmail?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                {userName && (
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                )}
                {userEmail && (
                  <p className="text-xs text-secondary-300 truncate">{userEmail}</p>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-secondary-200 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
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
    </>
  );
}
