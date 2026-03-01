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
  DollarSign,
  BarChart3,
  MessageSquare,
  MapPin,
  Users,
  Key,
  Palette,
  Gift,
  ImagePlus,
  Globe,
  ArrowLeftRight,
  ShoppingBag,
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
  dataTour?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/vendor/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { label: 'Analytics', href: '/vendor/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Ava Insights', href: '/vendor/insights', icon: <img src="/ava.png" alt="Ava" className="w-5 h-5 rounded-full object-cover" /> },
  { label: 'My Deals', href: '/vendor/deals/calendar', icon: <Tag className="w-5 h-5" />, dataTour: 'vendor-nav-deals' },
  { label: 'Website Import', href: '/vendor/deals/from-website', icon: <Globe className="w-5 h-5" />, dataTour: 'vendor-website-import' },
  { label: 'Media Library', href: '/vendor/media', icon: <ImagePlus className="w-5 h-5" />, dataTour: 'vendor-nav-media' },
  { label: 'Scan / Redeem', href: '/vendor/scan', icon: <ScanLine className="w-5 h-5" /> },
  { label: 'Reviews', href: '/vendor/reviews', icon: <MessageSquare className="w-5 h-5" />, dataTour: 'vendor-nav-reviews' },
  { label: 'Loyalty', href: '/vendor/loyalty', icon: <Gift className="w-5 h-5" />, dataTour: 'vendor-nav-loyalty' },
  { label: 'Locations', href: '/vendor/locations', icon: <MapPin className="w-5 h-5" /> },
  { label: 'Team', href: '/vendor/team', icon: <Users className="w-5 h-5" /> },
  { label: 'API', href: '/vendor/api', icon: <Key className="w-5 h-5" /> },
  { label: 'Branding', href: '/vendor/branding', icon: <Palette className="w-5 h-5" />, dataTour: 'vendor-nav-branding' },
  { label: 'Subscription', href: '/vendor/subscription', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Get Paid', href: '/vendor/payments', icon: <DollarSign className="w-5 h-5" /> },
  { label: 'Support', href: '/vendor/support', icon: <img src="/mia.png" alt="Mia" className="w-5 h-5 rounded-full object-cover" />, dataTour: 'vendor-nav-support' },
  { label: 'Settings', href: '/vendor/settings', icon: <Settings className="w-5 h-5" />, dataTour: 'vendor-nav-settings' },
];

interface VendorSidebarProps {
  onSignOut: () => void;
  userName: string;
  personalName: string;
  userEmail: string;
  logoUrl?: string | null;
  isAlsoCustomer?: boolean;
  onSwitchToCustomer?: () => void;
  onBecomeCustomer?: () => void;
}

export default function VendorSidebar({ onSignOut, userName, personalName, userEmail, logoUrl, isAlsoCustomer, onSwitchToCustomer, onBecomeCustomer }: VendorSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Scroll window to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/vendor/dashboard') return pathname === '/vendor/dashboard';
    // Website Import has its own nav item
    if (href === '/vendor/deals/from-website') return pathname.startsWith('/vendor/deals/from-website');
    // My Deals calendar link should highlight for all /vendor/deals routes except from-website
    if (href === '/vendor/deals/calendar') return pathname.startsWith('/vendor/deals') && !pathname.startsWith('/vendor/deals/from-website');
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

  const renderSidebarContent = (enableTourAttrs: boolean) => (
    <div className="flex flex-col h-full">
      {/* Branding — Actual Logo */}
      <div className="p-5 border-b border-gray-700/30">
        <a href="/" target="_blank" rel="noopener noreferrer" className="block">
          <Image
            src="/logo.png"
            alt="SpontiCoupon"
            width={180}
            height={54}
            className="h-11 w-auto brightness-110 hover:opacity-80 transition-opacity"
          />
        </a>
        <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5 tracking-wide uppercase font-medium">Vendor Portal</p>
      </div>

      {/* Role Switcher / Become a Customer */}
      <div className="px-3 pt-3 pb-1">
        {isAlsoCustomer ? (
          <button
            onClick={() => {
              setMobileOpen(false);
              onSwitchToCustomer?.();
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 hover:text-primary-200 transition-all duration-200 border border-primary-500/20"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Switch to Customer</span>
          </button>
        ) : onBecomeCustomer ? (
          <button
            onClick={() => {
              setMobileOpen(false);
              onBecomeCustomer?.();
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-700/15 text-gray-300 hover:bg-primary-500/15 hover:text-primary-300 transition-all duration-200 border border-secondary-400/20 hover:border-primary-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Become a Customer</span>
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav {...(enableTourAttrs ? { 'data-tour': 'vendor-sidebar' } : {})} className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const groupActive = isGroupActive(item);
          const hasChildren = item.children && item.children.length > 0;
          const expanded = isExpanded(item.href);

          return (
            <div key={item.href}>
              {/* Main nav item */}
              <div className="flex items-center" {...(enableTourAttrs && item.dataTour ? { 'data-tour': item.dataTour } : {})}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : groupActive
                        ? 'bg-gray-700/30 text-white'
                        : 'text-gray-300 hover:bg-gray-700/20 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </Link>
                {hasChildren && (
                  <button
                    onClick={() => toggleGroup(item.href)}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/20"
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
                            : 'text-gray-400 hover:bg-gray-700/15 hover:text-white'
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
      <div className="border-t border-gray-700/30">
        {/* User profile info */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-700/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-gray-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-[11px] text-gray-400 truncate">{personalName}</p>
            <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
          </div>
        </div>
        {/* Sign Out button */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-900/30 ring-1 ring-white/10"
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

      {/* Mobile sidebar — no data-tour attrs so Joyride targets the desktop sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-gray-300 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {renderSidebarContent(false)}
      </aside>

      {/* Desktop sidebar — has data-tour attrs for guided tour */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-gray-900 z-30">
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}
