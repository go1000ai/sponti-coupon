'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { CreditCard, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}

function SubscribeContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const tier = searchParams.get('plan') || searchParams.get('tier') || 'pro';
  const interval = searchParams.get('interval') || 'month';
  const promo = searchParams.get('promo') || '';

  const tierNames: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
  };

  useEffect(() => {
    if (authLoading || !user) return;

    const createCheckout = async () => {
      try {
        setStatus('redirecting');
        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier,
            vendorId: user.id,
            interval,
            ...(promo ? { promo } : {}),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      }
    };

    createCheckout();
  }, [user, authLoading, tier, interval, promo]);

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary-500 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to continue with your subscription.</p>
          <Link href="/auth/login?redirect=/vendor/subscribe" className="btn-primary inline-flex items-center gap-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary-500 mb-2">Checkout Error</h1>
          <p className="text-gray-500 mb-2">We couldn&apos;t set up your checkout session.</p>
          {errorMessage && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3 mb-6">{errorMessage}</p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setStatus('loading');
                setErrorMessage('');
                // Re-trigger the useEffect
                window.location.reload();
              }}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> Try Again
            </button>
            <Link href="/pricing" className="text-sm text-gray-500 hover:text-primary-500">
              Back to Pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading / Redirecting to Stripe
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex bg-primary-50 rounded-full p-4 mb-6">
          <div className="relative">
            <SpontiIcon className="w-10 h-10 text-primary-500" />
            <Loader2 className="w-6 h-6 text-primary-400 absolute -bottom-1 -right-1 animate-spin" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-secondary-500 mb-2">
          Setting Up Your {tierNames[tier] || 'Pro'} Plan
        </h1>
        <p className="text-gray-500 mb-4">
          Redirecting you to secure checkout...
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Preparing Stripe checkout</span>
        </div>
      </div>
    </div>
  );
}
