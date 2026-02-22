'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Zap, Mail, Lock, Building2, Phone, MapPin, CreditCard, Check } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils';

export default function VendorSignupPage() {
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('starter');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    category: '',
    stripePaymentLink: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('user_profiles').insert({ id: data.user.id, role: 'vendor' });

      await supabase.from('vendors').insert({
        id: data.user.id,
        business_name: form.businessName,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        category: form.category || null,
        stripe_payment_link: form.stripePaymentLink || null,
        subscription_tier: selectedTier,
        subscription_status: 'trialing',
      });

      // Redirect to Stripe checkout for subscription
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, vendorId: data.user.id }),
      });

      const checkout = await response.json();
      if (checkout.url) {
        window.location.href = checkout.url;
      } else {
        router.push('/vendor/dashboard');
      }
    }

    setLoading(false);
  };

  const tiers = Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][];

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary-500 rounded-lg p-2">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-secondary-500">List Your Business</h1>
          <p className="text-gray-500 mt-2">Start posting flash deals and growing your customer base</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm font-medium ${step >= s ? 'text-secondary-500' : 'text-gray-400'}`}>
                {s === 1 ? 'Choose Plan' : s === 2 ? 'Business Info' : 'Payment Setup'}
              </span>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Plan */}
        {step === 1 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiers.map(([key, tier]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTier(key)}
                  className={`card p-6 text-left transition-all ${selectedTier === key ? 'ring-2 ring-primary-500 shadow-lg' : 'hover:shadow-md'}`}
                >
                  <h3 className="font-bold text-lg text-secondary-500">{tier.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-primary-500">${tier.price}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {tier.deals_per_month === -1 ? 'Unlimited' : tier.deals_per_month} deals/month
                    </li>
                    {tier.multi_location && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" /> Multi-location
                      </li>
                    )}
                    {tier.api_access && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" /> API access
                      </li>
                    )}
                    {tier.custom_branding && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" /> Custom branding
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" /> Zero transaction fees
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" /> QR code system
                    </li>
                  </ul>
                  {selectedTier === key && (
                    <div className="mt-4 text-center text-primary-500 font-semibold text-sm">Selected</div>
                  )}
                </button>
              ))}
            </div>
            <div className="text-center mt-8">
              <button onClick={() => setStep(2)} className="btn-primary px-12">
                Continue with {SUBSCRIPTION_TIERS[selectedTier].name} — {formatCurrency(SUBSCRIPTION_TIERS[selectedTier].price)}/mo
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Business Info */}
        {step === 2 && (
          <div className="max-w-lg mx-auto">
            <div className="card p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="businessName" value={form.businessName} onChange={handleChange} className="input-field pl-10" placeholder="Your Business Name" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field pl-10" placeholder="business@example.com" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="(555) 123-4567" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="address" value={form.address} onChange={handleChange} className="input-field pl-10" placeholder="123 Main Street" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input name="city" value={form.city} onChange={handleChange} className="input-field" placeholder="Miami" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input name="state" value={form.state} onChange={handleChange} className="input-field" placeholder="FL" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input name="zip" value={form.zip} onChange={handleChange} className="input-field" placeholder="33101" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="input-field">
                  <option value="">Select a category</option>
                  <option value="restaurants">Restaurants</option>
                  <option value="beauty-spa">Beauty & Spa</option>
                  <option value="health-fitness">Health & Fitness</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="shopping">Shopping</option>
                  <option value="travel">Travel</option>
                  <option value="automotive">Automotive</option>
                  <option value="home-services">Home Services</option>
                  <option value="education">Education</option>
                  <option value="technology">Technology</option>
                  <option value="food-drink">Food & Drink</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="wellness">Wellness</option>
                  <option value="pets">Pets</option>
                  <option value="photography">Photography</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field pl-10" placeholder="At least 6 characters" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder="Confirm password" required />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(1)} className="btn-outline flex-1">Back</button>
                <button
                  onClick={() => {
                    if (!form.businessName || !form.email || !form.password || !form.confirmPassword) {
                      setError('Please fill in all required fields');
                      return;
                    }
                    if (form.password !== form.confirmPassword) {
                      setError('Passwords do not match');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="btn-primary flex-1"
                >
                  Continue
                </button>
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Payment Setup */}
        {step === 3 && (
          <div className="max-w-lg mx-auto">
            <form onSubmit={handleSignup} className="card p-8 space-y-4">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h3 className="font-semibold text-primary-600 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Payment Link Setup
                </h3>
                <p className="text-sm text-primary-700 mt-1">
                  Connect your Stripe or Square payment link so customers can pay deposits directly to you. Sponti Coupon never touches customer money.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Stripe Payment Link URL
                </label>
                <input
                  name="stripePaymentLink"
                  value={form.stripePaymentLink}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://buy.stripe.com/your-link"
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can set this up later in your dashboard settings
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                <p className="font-semibold mb-2">Your {SUBSCRIPTION_TIERS[selectedTier].name} Plan:</p>
                <ul className="space-y-1">
                  <li>{formatCurrency(SUBSCRIPTION_TIERS[selectedTier].price)}/month</li>
                  <li>{SUBSCRIPTION_TIERS[selectedTier].deals_per_month === -1 ? 'Unlimited' : SUBSCRIPTION_TIERS[selectedTier].deals_per_month} deals per month</li>
                  <li>Zero transaction fees</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep(2)} className="btn-outline flex-1">Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Creating Account...' : 'Complete Signup'}
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-500 font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
