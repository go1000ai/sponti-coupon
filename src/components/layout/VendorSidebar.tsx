'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Tag,
  ScanLine,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  User,
  ChevronDown,
  Wallet,
  BarChart3,
  Sparkles,
  MessageSquare,
  MapPin,
  Users,
  Key,
  Palette,
  Gift,
} from 'lucide-react';

interface NavChild {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/vendor/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { label: 'Analytics', href: '/vendor/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'AI Insights', href: '/vendor/insights', icon: <Sparkles className="w-5 h-5" /> },
  { label: 'My Deals', href: '/vendor/deals/calendar', icon: <Tag className="w-5 h-5" /> },
  { label: 'Scan / Redeem', href: '/vendor/scan', icon: <ScanLine className="w-5 h-5" /> },
  { label: 'Reviews', href: '/vendor/reviews', icon: <MessageSquare className="w-5 h-5" /> },
  { label: 'Loyalty', href: '/vendor/loyalty', icon: <Gift className="w-5 h-5" /> },
  { label: 'Locations', href: '/vendor/locations', icon: <MapPin className="w-5 h-5" /> },
  { label: 'Team', href: '/vendor/team', icon: <Users className="w-5 h-5" /> },
  { label: 'API', href: '/vendor/api', icon: <Key className="w-5 h-5" /> },
  { label: 'Branding', href: '/vendor/branding', icon: <Palette className="w-5 h-5" /> },
  { label: 'Subscription', href: '/vendor/subscription', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Payment Methods', href: '/vendor/payments', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Settings', href: '/vendor/settings', icon: <Settings className="w-5 h-5" /> },
];

interface VendorSidebarProps {
  onSignOut: () => void;
  userName: string;
  userEmail: string;
}

export default function VendorSidebar({ onSignOut, userName, userEmail }: VendorSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const isActive = (href: string) => {
    if (href === '/vendor/dashboard') return pathname === '/vendor/dashboard';
    // My Deals calendar link should highlight for all /vendor/deals routes
    if (href === '/vendor/deals/calendar') return pathname.startsWith('/vendor/deals');
    return pathname.startsWith(href);
  };

  // Auto-expand parent groups when a child route is active
  useEffect(() => {
    navItems.forEach(item => {
      if (item.children && pathname.startsWith(item.href)) {
        setExpandedGroups(prev =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });
  }, [pathname]);

  const isGroupActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some(c => isActive(c.href)) || false;
  };

  const toggleGroup = (href: string) => {
    setExpandedGroups(prev =>
      prev.includes(href)
        ? prev.filter(g => g !== href)
        : [...prev, href]
    );
  };

  const isExpanded = (href: string) => {
    return expandedGroups.includes(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Branding — Actual Logo */}
      <div className="p-5 border-b border-secondary-400/30">
        <Link href="/vendor/dashboard" className="block">
          <Image
            src="/logo.png"
            alt="SpontiCoupon"
            width={180}
            height={54}
            className="h-11 w-auto brightness-110"
          />
        </Link>
        <p className="text-[11px] text-secondary-300 mt-1.5 ml-0.5 tracking-wide uppercase font-medium">Vendor Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const groupActive = isGroupActive(item);
          const hasChildren = item.children && item.children.length > 0;
          const expanded = isExpanded(item.href);

          return (
            <div key={item.href}>
              {/* Main nav item */}
              <div className="flex items-center">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : groupActive
                        ? 'bg-secondary-400/30 text-white'
                        : 'text-secondary-200 hover:bg-secondary-400/20 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </Link>
                {hasChildren && (
                  <button
                    onClick={() => toggleGroup(item.href)}
                    className="p-2 text-secondary-300 hover:text-white transition-colors rounded-lg hover:bg-secondary-400/20"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Child items */}
              {hasChildren && expanded && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-secondary-400/20 pl-3">
                  {item.children!.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          childActive
                            ? 'bg-primary-500/20 text-primary-300'
                            : 'text-secondary-300 hover:bg-secondary-400/15 hover:text-white'
                        }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info + Sign Out */}
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
            onClick={onSignOut}
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
