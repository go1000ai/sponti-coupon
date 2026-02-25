'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Building2, CheckCircle, Loader2, AlertCircle, Gift } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';

export default function CompleteSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
        </div>
      }
    >
      <CompleteSignupForm />
    </Suspense>
  );
}

function CompleteSignupForm() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();

  const [sessionData, setSessionData] = useState<{
    email: string;
    tier: string;
    interval: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
  } | null>(null);

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    businessName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingSession, setFetchingSession] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const planDisplayNames: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
  };

  // Fetch checkout session data on mount
  useEffect(() => {
    if (!sessionId) {
      setFetchError('No checkout session found. Please start from the pricing page.');
      setFetchingSession(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch('/api/stripe/retrieve-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          const data = await res.json();
          setFetchError(data.error || 'Failed to verify your payment. Please try again.');
          setFetchingSession(false);
          return;
        }

        const data = await res.json();
        setSessionData(data);
      } catch {
        setFetchError('Something went wrong. Please try again.');
      } finally {
        setFetchingSession(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!form.businessName.trim()) {
      setError('Business name is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/create-vendor-from-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          password: form.password,
          businessName: form.businessName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create your account. Please try again.');
        setLoading(false);
        return;
      }

      // Account created and logged in — redirect to vendor dashboard
      router.push('/vendor/dashboard?subscription=success');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Loading state while fetching session
  if (fetchingSession) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex bg-red-100 rounded-full p-4 mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-500 mb-3">Something Went Wrong</h1>
          <p className="text-gray-500 mb-6">{fetchError}</p>
          <Link
            href="/pricing"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3"
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionData) return null;

  const planName = planDisplayNames[sessionData.tier] || sessionData.tier;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary-500 rounded-lg p-2">
              <SpontiIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-secondary-500">Complete Your Account</h1>
          <p className="text-gray-500 mt-2">
            Payment confirmed! Set up your password to get started.
          </p>
        </div>

        {/* Payment success banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 rounded-lg p-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-secondary-500">
                {planName} Plan — Payment Confirmed
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {sessionData.email}
              </p>
            </div>
          </div>
        </div>

        {/* Founders badge */}
        {sessionData.tier && ['pro', 'business'].includes(sessionData.tier) && (
          <div className="bg-gradient-to-r from-primary-50 to-orange-50 border border-primary-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-500 rounded-lg p-2">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary-500">
                  Founders Rate Applied
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  2 Months Free + 20% Off Forever
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="Your Business Name"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="At least 6 characters"
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </span>
            ) : (
              'Create My Account'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Your subscription is already active. This just sets up your login credentials.
          </p>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-primary-500 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
