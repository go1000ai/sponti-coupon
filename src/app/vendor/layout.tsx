'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { createClient } from '@/lib/supabase/client';
import VendorSidebar from '@/components/layout/VendorSidebar';
import { Ban, CreditCard } from 'lucide-react';

function VendorLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, role, loading, signOut, isAlsoCustomer, switchRole, becomeCustomer } = useAuth();
  const { status: subscriptionStatus, loading: tierLoading } = useVendorTier();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [vendorLogoUrl, setVendorLogoUrl] = useState<string | null>(null);

  // Scroll to top on every route change
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
    });
  }, [pathname]);

  // Only allow through if subscription was just completed successfully
  const isSubscriptionSuccess = searchParams.get('subscription') === 'success';

  // Fetch vendor business name and logo
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('vendors')
      .select('business_name, logo_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.business_name) {
          setVendorName(data.business_name);
        }
        if (data?.logo_url) {
          setVendorLogoUrl(data.logo_url);
        }
      });
  }, [user]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/vendor/dashboard');
    }
  }, [loading, user, router]);

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Still waiting for redirect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (role !== 'vendor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Ban className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary-500">Access Denied</h1>
          <p className="text-gray-400 mt-2">You do not have vendor privileges.</p>
        </div>
      </div>
    );
  }

  // Paywall: block access unless subscription is active/trialing or just completed
  // Vendors with 'incomplete' (or null/unknown) status cannot access the dashboard
  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  if (!hasActiveSubscription && !isSubscriptionSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-6">
          <CreditCard className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary-500">Subscription Required</h1>
          <p className="text-gray-500 mt-2 mb-6">
            Complete your subscription to access the vendor dashboard and start creating deals.
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
          >
            Complete Subscription
          </Link>
          <Link
            href="/pricing"
            className="block text-sm text-gray-400 hover:text-primary-500 mt-3"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorSidebar
        onSignOut={signOut}
        userName={vendorName || 'Vendor'}
        personalName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
        userEmail={user?.email || ''}
        logoUrl={vendorLogoUrl}
        isAlsoCustomer={isAlsoCustomer}
        onSwitchToCustomer={() => switchRole('customer')}
        onBecomeCustomer={becomeCustomer}
      />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
        </div>
      }
    >
      <VendorLayoutInner>{children}</VendorLayoutInner>
    </Suspense>
  );
}
