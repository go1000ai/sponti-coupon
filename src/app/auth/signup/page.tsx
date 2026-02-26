'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, Phone, MapPin, Store, Building2, CheckCircle, ArrowRight, Gift, Sparkles } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'customer';
  const selectedPlan = searchParams.get('plan') || 'starter';
  const selectedInterval = searchParams.get('interval') || 'month';
  const selectedPromo = searchParams.get('promo') || '';

  // Vendor has a plan selected from pricing page (not just the default 'starter')
  const hasPlanFromPricing = searchParams.get('plan') !== null;

  const planDisplayNames: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
  };
  const planDisplayName = planDisplayNames[selectedPlan] || 'Starter';

  const [accountType, setAccountType] = useState<'customer' | 'vendor'>(initialType);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    state: '',
    zip: '',
    // Vendor-only fields
    businessName: '',
    address: '',
    category: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
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
    if (accountType === 'vendor' && !form.businessName.trim()) {
      setError('Business name is required');
      return;
    }
    if (accountType === 'vendor' && (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim())) {
      setError('Business address is required (street address, city, state, and ZIP code)');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Build the redirect URL for after email confirmation
    const callbackParams = new URLSearchParams();
    callbackParams.set('type', accountType);
    if (accountType === 'vendor') {
      callbackParams.set('plan', selectedPlan);
      callbackParams.set('interval', selectedInterval);
      if (selectedPromo) callbackParams.set('promo', selectedPromo);
      callbackParams.set('businessName', form.businessName);
      callbackParams.set('phone', form.phone);
      callbackParams.set('address', form.address);
      callbackParams.set('city', form.city);
      callbackParams.set('state', form.state);
      callbackParams.set('zip', form.zip);
      callbackParams.set('category', form.category);
    } else {
      callbackParams.set('firstName', form.firstName);
      callbackParams.set('lastName', form.lastName);
      callbackParams.set('phone', form.phone);
      callbackParams.set('city', form.city);
      callbackParams.set('state', form.state);
      callbackParams.set('zip', form.zip);
    }

    const redirectTo = `${window.location.origin}/auth/callback?${callbackParams.toString()}`;

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          account_type: accountType,
          ...(accountType === 'vendor' ? {
            plan: selectedPlan,
            interval: selectedInterval,
            promo: selectedPromo || undefined,
            business_name: form.businessName,
            phone: form.phone,
            address: form.address,
            city: form.city,
            state: form.state,
            zip: form.zip,
            category: form.category,
          } : {
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            city: form.city,
            state: form.state,
            zip: form.zip,
          }),
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if user session is immediately available (autoconfirm enabled)
    if (data.session) {
      // Session is active — no email confirmation needed
      await createProfileAndRedirect(data.user!.id);
    } else if (data.user && !data.session) {
      // Email confirmation required — show message
      setShowConfirmation(true);
    }

    setLoading(false);
  };

  const createProfileAndRedirect = async (
    userId: string,
  ) => {
    // Create profile via server API (uses service role to bypass RLS)
    const profilePayload = accountType === 'vendor'
      ? {
          accountType,
          businessName: form.businessName,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          category: form.category,
        }
      : {
          accountType,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          city: form.city,
          state: form.state,
          zip: form.zip,
        };

    const profileRes = await fetch('/api/auth/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload),
    });

    if (!profileRes.ok) {
      const errData = await profileRes.json();
      setError(errData.error || 'Failed to create profile');
      return;
    }

    if (accountType === 'vendor') {
      // Redirect to Stripe checkout for the selected plan
      try {
        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier: selectedPlan,
            vendorId: userId,
            interval: selectedInterval,
            ...(selectedPromo ? { promo: selectedPromo } : {}),
          }),
        });
        const checkoutData = await response.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
      } catch {
        // If Stripe fails, fall back to dashboard
      }
      router.push('/vendor/dashboard');
    } else {
      router.push('/deals');
    }
  };

  // Show email confirmation screen — scroll to top so message is visible
  if (showConfirmation) {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex bg-green-100 rounded-full p-4 mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-500 mb-3">Check Your Email</h1>
          <p className="text-gray-500 mb-2">
            We sent a confirmation link to:
          </p>
          <p className="text-lg font-semibold text-secondary-500 mb-6">{form.email}</p>
          <div className="card p-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              Click the link in your email to confirm your account.
              {accountType === 'vendor' && (
                <> You&apos;ll be taken directly to set up your subscription after confirming.</>
              )}
            </p>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={() => setShowConfirmation(false)}
              className="text-primary-500 font-semibold hover:underline"
            >
              try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary-500 rounded-lg p-2">
              <SpontiIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-secondary-500">
            {accountType === 'vendor' && hasPlanFromPricing ? 'Create Your Business Account' : 'Create Account'}
          </h1>
          <p className="text-gray-500 mt-2">
            {accountType === 'vendor'
              ? 'Start growing your business with Sponti Deals'
              : 'Start saving with Sponti Deals near you'}
          </p>
        </div>

        {/* Account Type Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setAccountType('customer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              accountType === 'customer'
                ? 'bg-white text-secondary-500 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" />
            Customer
          </button>
          <button
            type="button"
            onClick={() => setAccountType('vendor')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              accountType === 'vendor'
                ? 'bg-white text-primary-500 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Store className="w-4 h-4" />
            Business
          </button>
        </div>

        {/* Vendor selected but no plan from pricing → show "Go to Pricing" prompt */}
        {accountType === 'vendor' && !hasPlanFromPricing && (
          <div className="card p-8 text-center">
            <div className="inline-flex bg-primary-50 rounded-full p-4 mb-5">
              <Store className="w-10 h-10 text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-secondary-500 mb-2">Choose Your Plan First</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Pick the plan that fits your business on our pricing page.
              {' '}You&apos;ll come right back here to complete your sign-up.
            </p>
            <Link
              href="/pricing"
              className="group btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold"
            >
              <Sparkles className="w-5 h-5" />
              Go to Pricing Page
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <p className="text-xs text-gray-400 mt-4">
              2 months free on Pro &amp; Business plans for founding vendors
            </p>
          </div>
        )}

        {/* Show form: customer always, vendor only when plan is selected */}
        {(accountType === 'customer' || (accountType === 'vendor' && hasPlanFromPricing)) && (
        <>
        {/* Plan indicator banner for vendors */}
        {accountType === 'vendor' && hasPlanFromPricing && (
          <div className="bg-gradient-to-r from-primary-50 to-orange-50 border border-primary-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary-500 rounded-lg p-2">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-secondary-500">
                    {planDisplayName} Plan
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedPromo === 'founders'
                      ? '2 Months Free + 20% Off Forever (Founders Rate)'
                      : selectedInterval === 'year'
                      ? 'Annual billing — save 20%'
                      : 'Monthly billing'}
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="text-xs text-primary-500 hover:underline font-semibold whitespace-nowrap"
              >
                Change plan
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSignup} className="card p-5 sm:p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Vendor-only: Business Name */}
          {accountType === 'vendor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input name="businessName" value={form.businessName} onChange={handleChange} className="input-field pl-10" placeholder="Your Business Name" required />
              </div>
            </div>
          )}

          {/* Customer-only: First/Last Name */}
          {accountType === 'customer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="input-field pl-10" placeholder="John" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} className="input-field" placeholder="Doe" required />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field pl-10" placeholder="you@example.com" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone {accountType === 'customer' ? '(optional)' : ''}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="(555) 123-4567" />
            </div>
          </div>

          {/* Vendor-only: Address + Category */}
          {accountType === 'vendor' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="address" value={form.address} onChange={handleChange} className="input-field pl-10" placeholder="123 Main St" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="input-field">
                  <option value="">Select a category</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="salon">Salon & Beauty</option>
                  <option value="fitness">Fitness & Gym</option>
                  <option value="wellness">Wellness & Spa</option>
                  <option value="cafe">Cafe & Coffee</option>
                  <option value="retail">Retail & Shopping</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="automotive">Automotive</option>
                  <option value="photography">Photography</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City {accountType === 'vendor' && <span className="text-red-500">*</span>}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input name="city" value={form.city} onChange={handleChange} className="input-field pl-10" placeholder="Orlando" required={accountType === 'vendor'} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State {accountType === 'vendor' && <span className="text-red-500">*</span>}</label>
              <input name="state" value={form.state} onChange={handleChange} className="input-field" placeholder="FL" required={accountType === 'vendor'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP {accountType === 'vendor' && <span className="text-red-500">*</span>}</label>
              <input name="zip" value={form.zip} onChange={handleChange} className="input-field" placeholder="33101" required={accountType === 'vendor'} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field pl-10" placeholder="At least 6 characters" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder="Confirm your password" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? 'Creating Account...'
              : accountType === 'vendor'
              ? (selectedPromo === 'founders' ? 'Start 2 Months Free' : 'Start My Free Trial')
              : 'Create Account'}
          </button>

          {accountType === 'vendor' && (
            <p className="text-xs text-gray-400 text-center">
              {selectedPromo === 'founders'
                ? 'Credit card required. 2 months free, then Founders Rate. Cancel anytime.'
                : '14-day free trial. Cancel anytime.'}
            </p>
          )}
        </form>
        </>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-500 font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
