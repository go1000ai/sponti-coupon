'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, Phone, MapPin, Store, Building2, CheckCircle, ArrowRight, Gift, Sparkles } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { useLanguage } from '@/lib/i18n';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const { t } = useLanguage();
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
  const [vendorTermsAccepted, setVendorTermsAccepted] = useState(false);
  const [arlConsentAccepted, setArlConsentAccepted] = useState(false);
  const router = useRouter();

  // Plan prices for ARL disclosure (must match SUBSCRIPTION_TIERS in database.ts)
  const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
    starter: { monthly: 49, annual: 39 },
    pro: { monthly: 99, annual: 79 },
    business: { monthly: 199, annual: 159 },
    enterprise: { monthly: 499, annual: 399 },
  };
  const planPrice = PLAN_PRICES[selectedPlan] || PLAN_PRICES.starter;
  const recurringAmount = selectedInterval === 'year' ? planPrice.annual : planPrice.monthly;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('auth.signup.errors.passwordsMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.signup.errors.passwordTooShort'));
      return;
    }
    if (accountType === 'vendor' && !form.businessName.trim()) {
      setError(t('auth.signup.errors.businessNameRequired'));
      return;
    }
    if (accountType === 'vendor' && (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim())) {
      setError(t('auth.signup.errors.addressRequired'));
      return;
    }
    if (accountType === 'vendor' && !vendorTermsAccepted) {
      setError(t('auth.signup.errors.termsRequired'));
      return;
    }
    if (accountType === 'vendor' && !arlConsentAccepted) {
      setError(t('auth.signup.errors.arlRequired'));
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

    // Use NEXT_PUBLIC_APP_URL so email verification links point to production (not localhost)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectTo = `${baseUrl}/auth/callback?${callbackParams.toString()}`;

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          account_type: accountType,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('auth.signup.checkEmail')}</h1>
          <p className="text-gray-500 mb-2">
            {t('auth.signup.confirmationSent')}
          </p>
          <p className="text-lg font-semibold text-gray-900 mb-6">{form.email}</p>
          <div className="card p-6">
            {accountType === 'customer' ? (
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('auth.signup.customerConfirmMsg')}
              </p>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('auth.signup.vendorConfirmMsg')}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-6">
            {t('auth.signup.didntReceive')}{' '}
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
          <h1 className="text-3xl font-bold text-gray-900">
            {accountType === 'vendor' && hasPlanFromPricing ? t('auth.signup.createBusinessAccount') : t('auth.signup.createAccount')}
          </h1>
          <p className="text-gray-500 mt-2">
            {accountType === 'vendor'
              ? t('auth.signup.vendorSubtitle')
              : t('auth.signup.customerSubtitle')}
          </p>
        </div>

        {/* Account Type Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setAccountType('customer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              accountType === 'customer'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" />
            {t('auth.signup.customer')}
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
            {t('auth.signup.business')}
          </button>
        </div>

        {/* Vendor selected but no plan from pricing → show "Go to Pricing" prompt */}
        {accountType === 'vendor' && !hasPlanFromPricing && (
          <div className="card p-8 text-center">
            <div className="inline-flex bg-primary-50 rounded-full p-4 mb-5">
              <Store className="w-10 h-10 text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('auth.signup.choosePlanFirst')}</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {t('auth.signup.choosePlanDesc')}
            </p>
            <Link
              href="/pricing"
              className="group btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold"
            >
              <Sparkles className="w-5 h-5" />
              {t('auth.signup.goToPricing')}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <p className="text-xs text-gray-400 mt-4">
              {t('auth.signup.foundersPromo')}
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
                  <p className="text-sm font-bold text-gray-900">
                    {t('auth.signup.planBadge', { plan: planDisplayName })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedPromo === 'founders'
                      ? t('auth.signup.foundersRate')
                      : selectedInterval === 'year'
                      ? t('auth.signup.annualBilling')
                      : t('auth.signup.monthlyBilling')}
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="text-xs text-primary-500 hover:underline font-semibold whitespace-nowrap"
              >
                {t('auth.signup.changePlan')}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.businessName')} *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input name="businessName" value={form.businessName} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.businessName')} required />
              </div>
            </div>
          )}

          {/* Customer-only: First/Last Name */}
          {accountType === 'customer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.firstName')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.firstName')} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.lastName')}</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} className="input-field" placeholder={t('auth.signup.lastName')} required />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.emailPlaceholder')} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.phone')} {accountType === 'customer' ? '(optional)' : ''}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.phonePlaceholder')} />
            </div>
          </div>

          {/* Vendor-only: Address + Category */}
          {accountType === 'vendor' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.businessAddress')} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="address" value={form.address} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.addressPlaceholder')} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.businessCategory')}</label>
                <select name="category" value={form.category} onChange={handleChange} className="input-field">
                  <option value="">{t('auth.signup.selectCategory')}</option>
                  <option value="restaurant">{t('auth.signup.categories.restaurant')}</option>
                  <option value="salon">{t('auth.signup.categories.salonBeauty')}</option>
                  <option value="fitness">{t('auth.signup.categories.fitnessGym')}</option>
                  <option value="wellness">{t('auth.signup.categories.wellnessSpa')}</option>
                  <option value="cafe">{t('auth.signup.categories.cafeCoffee')}</option>
                  <option value="retail">{t('auth.signup.categories.retailShopping')}</option>
                  <option value="entertainment">{t('auth.signup.categories.entertainment')}</option>
                  <option value="automotive">{t('auth.signup.categories.automotive')}</option>
                  <option value="photography">{t('auth.signup.categories.photography')}</option>
                  <option value="other">{t('auth.signup.categories.other')}</option>
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.city')} {accountType === 'vendor' && <span className="text-red-500">*</span>}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input name="city" value={form.city} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.cityPlaceholder')} required={accountType === 'vendor'} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.state')} {accountType === 'vendor' && <span className="text-red-500">*</span>}</label>
              <input name="state" value={form.state} onChange={handleChange} className="input-field" placeholder={t('auth.signup.statePlaceholder')} required={accountType === 'vendor'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.zip')} {accountType === 'vendor' && <span className="text-red-500">*</span>}</label>
              <input name="zip" value={form.zip} onChange={handleChange} className="input-field" placeholder={t('auth.signup.zipPlaceholder')} required={accountType === 'vendor'} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.passwordHint')} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder={t('auth.signup.confirmPasswordPlaceholder')} required />
            </div>
          </div>

          {/* Vendor Terms click-wrap agreement — Checkbox 1 */}
          {accountType === 'vendor' && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={vendorTermsAccepted}
                onChange={(e) => setVendorTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 shrink-0"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                {t('auth.signup.vendorTermsAgree.prefix')}{' '}
                <Link href="/vendor-terms" target="_blank" className="text-primary-500 hover:underline font-medium">
                  {t('auth.signup.vendorTermsAgree.vendorTerms')}
                </Link>{' '}
                {t('auth.signup.and')}{' '}
                <Link href="/terms" target="_blank" className="text-primary-500 hover:underline font-medium">
                  {t('auth.signup.termsOfService')}
                </Link>. {t('auth.signup.vendorTermsAgree.suffix')}
              </span>
            </label>
          )}

          {/* ARL / FTC Negative Option — Checkbox 2 (separate express consent, required by law) */}
          {accountType === 'vendor' && (
            <label className="flex items-start gap-3 cursor-pointer group border border-amber-200 bg-amber-50 rounded-xl p-3">
              <input
                type="checkbox"
                checked={arlConsentAccepted}
                onChange={(e) => setArlConsentAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-amber-400 text-primary-500 focus:ring-primary-500 shrink-0"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                <strong className="text-amber-800">{t('auth.signup.arlConsent.title')}</strong>{' '}
                {t('auth.signup.arlConsent.body', {
                  plan: planDisplayName,
                  frequency: selectedInterval === 'year' ? t('auth.signup.arlConsent.annually') : t('auth.signup.arlConsent.monthly'),
                  amount: `$${recurringAmount}`,
                  trialText: selectedPromo === 'founders' ? t('auth.signup.arlConsent.afterFreeMonths') : t('auth.signup.arlConsent.afterFreeTrial'),
                })}
                {' '}{t('auth.signup.arlConsent.cancelInfo')}{' '}
                <a href="mailto:billing@sponticoupon.com" className="text-primary-500 underline">billing@sponticoupon.com</a>.
                {' '}{t('auth.signup.arlConsent.agree')}
              </span>
            </label>
          )}

          <button type="submit" disabled={loading || (accountType === 'vendor' && (!vendorTermsAccepted || !arlConsentAccepted))} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? t('auth.signup.creatingAccount')
              : accountType === 'vendor'
              ? (selectedPromo === 'founders' ? t('auth.signup.startFreeMonths') : t('auth.signup.startFreeTrial'))
              : t('auth.signup.createAccount')}
          </button>

          {accountType === 'vendor' && (
            <p className="text-xs text-gray-400 text-center">
              {selectedPromo === 'founders'
                ? t('auth.signup.foundersNote')
                : t('auth.signup.trialNote')}
            </p>
          )}

          {/* CalOPPA — privacy link required at all data collection points */}
          <p className="text-xs text-gray-400 text-center">
            {t('auth.signup.agreeTerms')}{' '}
            <Link href="/terms" target="_blank" className="hover:underline">{t('auth.signup.termsOfService')}</Link>{' '}
            {t('auth.signup.and')}{' '}
            <Link href="/privacy" target="_blank" className="hover:underline">{t('auth.signup.privacyPolicy')}</Link>.
          </p>
        </form>
        </>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          {t('auth.signup.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-primary-500 font-semibold hover:underline">{t('auth.signup.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
