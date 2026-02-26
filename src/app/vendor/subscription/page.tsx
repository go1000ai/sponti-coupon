'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { Vendor, SubscriptionTier } from '@/lib/types/database';
import {
  CreditCard, Check, Crown, Zap, Rocket,
  ArrowRight, ArrowDown, Star, Shield, Sparkles,
  ExternalLink, Loader2,
} from 'lucide-react';

/* ─────── Plan Config (matches pricing page) ─────── */
const PLANS = [
  {
    key: 'starter' as const,
    icon: Rocket,
    gradient: 'from-accent-500 to-accent-600',
    tagline: 'Perfect for getting started',
    features: [
      '2 Sponti + 4 Steady deals/mo',
      'QR code + 6-digit redemption',
      'Basic analytics (KPI cards)',
      'Deal usage tracking',
      'Email support',
      'Zero transaction fees',
    ],
  },
  {
    key: 'pro' as const,
    icon: Zap,
    gradient: 'from-primary-500 to-primary-600',
    tagline: 'Most popular for growing businesses',
    features: [
      '6 Sponti + 12 Steady deals/mo',
      'Everything in Starter, plus:',
      'Basic charts (3 charts)',
      'Custom deal scheduling',
      'Priority support',
      'Zero transaction fees',
    ],
  },
  {
    key: 'business' as const,
    icon: Crown,
    gradient: 'from-secondary-500 to-secondary-600',
    tagline: 'For serious local businesses',
    badge: 'BEST VALUE',
    features: [
      '25 Sponti + 50 Steady deals/mo',
      'Everything in Pro, plus:',
      'Featured on homepage + more exposure',
      'AI Deal Assistant & Insights',
      'Advanced analytics (8+ charts)',
      'Competitor benchmarking',
      'Multi-location & team access',
      'Dedicated support',
    ],
  },
];

/* ─────── Feature Comparison Matrix (matches pricing page) ─────── */
const FEATURE_MATRIX = [
  { feature: 'Sponti deals/month', starter: '2', pro: '6', business: '25', enterprise: 'Unlimited' },
  { feature: 'Steady deals/month', starter: '4', pro: '12', business: '50', enterprise: 'Unlimited' },
  { feature: 'QR code redemption', starter: true, pro: true, business: true, enterprise: true },
  { feature: '6-digit backup codes', starter: true, pro: true, business: true, enterprise: true },
  { feature: 'Basic analytics (KPI cards)', starter: true, pro: true, business: true, enterprise: true },
  { feature: 'Basic charts (3 charts)', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Advanced analytics (8+ charts + table)', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'AI Deal Assistant', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'AI Insights & scoring', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'AI Deal Advisor', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'Competitor benchmarking', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'Custom scheduling', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Multi-location support', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'Team member access', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'Priority support', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Featured on homepage', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'Dedicated support', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'API access', starter: false, pro: false, business: false, enterprise: true },
  { feature: 'Custom branding', starter: false, pro: false, business: false, enterprise: true },
  { feature: 'Zero transaction fees', starter: true, pro: true, business: true, enterprise: true },
];

const tierColors: Record<string, string> = {
  starter: 'from-accent-500 to-accent-600',
  pro: 'from-primary-500 to-orange-500',
  business: 'from-secondary-500 to-secondary-600',
  enterprise: 'from-secondary-500 to-secondary-600',
};

const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

function SubscriptionContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Show success banner from URL params (after checkout redirect)
  useEffect(() => {
    const changed = searchParams.get('changed');
    const tier = searchParams.get('tier');
    if (changed === 'success' && tier) {
      setSuccessMessage(`Successfully switched to ${TIER_NAMES[tier] || tier}!`);
      window.history.replaceState({}, '', '/vendor/subscription');
    }
    const subscription = searchParams.get('subscription');
    if (subscription === 'success') {
      setSuccessMessage('Subscription activated successfully!');
      window.history.replaceState({}, '', '/vendor/subscription');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from('vendors')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setVendor(data);
        setLoading(false);
      });
  }, [user]);

  const handleChangePlan = async (tier: string) => {
    if (!user) return;
    setChanging(tier);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          interval: isAnnual ? 'year' : 'month',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to change plan. Please try again.');
        return;
      }

      // If we get a checkout URL (no existing subscription), redirect
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Plan changed via API
      if (data.success) {
        setSuccessMessage(data.message);

        // Refresh vendor data if it was an upgrade (immediate)
        if (data.action === 'upgrade') {
          const supabase = createClient();
          const { data: updatedVendor } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', user.id)
            .single();
          if (updatedVendor) setVendor(updatedVendor);
        }
      }
    } catch {
      alert('An error occurred. Please try again.');
    }
    setChanging(null);
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal.');
      }
    } catch {
      alert('An error occurred. Please try again.');
    }
    setPortalLoading(false);
  };

  const getPrice = (key: string) => {
    const tier = SUBSCRIPTION_TIERS[key as keyof typeof SUBSCRIPTION_TIERS];
    return isAnnual ? tier.annualPrice : tier.price;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const currentTier = vendor?.subscription_tier || 'starter';
  const tierOrder: SubscriptionTier[] = ['starter', 'pro', 'business', 'enterprise'];
  const currentTierIndex = tierOrder.indexOf(currentTier as SubscriptionTier);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-3xl font-bold text-secondary-500">Subscription</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your plan and unlock more features</p>
          </div>
        </div>
        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Manage Billing
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Current Plan Banner */}
      <div className={`card p-6 mb-8 bg-gradient-to-r ${tierColors[currentTier] || tierColors.starter} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-3">
              {currentTier === 'enterprise' ? <Star className="w-6 h-6" /> :
               currentTier === 'business' ? <Crown className="w-6 h-6" /> :
               currentTier === 'pro' ? <Zap className="w-6 h-6" /> :
               <Rocket className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm text-white/80">Current Plan</p>
              <h2 className="text-2xl font-bold capitalize">{currentTier}</h2>
              <p className="text-sm text-white/80 mt-1">
                {formatCurrency(SUBSCRIPTION_TIERS[currentTier as SubscriptionTier].price)}/month
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              vendor?.subscription_status === 'active'
                ? 'bg-green-400/30 text-white'
                : vendor?.subscription_status === 'trialing'
                ? 'bg-blue-400/30 text-white'
                : 'bg-yellow-400/30 text-white'
            }`}>
              <Shield className="w-3 h-3" />
              {vendor?.subscription_status === 'active' ? 'Active' :
               vendor?.subscription_status === 'trialing' ? 'Trial' :
               vendor?.subscription_status === 'past_due' ? 'Past Due' :
               vendor?.subscription_status || 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly / Annual Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1.5">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              !isAnnual
                ? 'bg-white text-secondary-500 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              isAnnual
                ? 'bg-white text-secondary-500 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Annual
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isAnnual ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
            }`}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards — 3 columns, equal height, buttons aligned at bottom */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-8">
        {PLANS.map((plan) => {
          const tier = SUBSCRIPTION_TIERS[plan.key];
          const price = getPrice(plan.key);
          const isCurrent = plan.key === currentTier;
          const isFeatured = plan.key === 'business';
          const planIndex = tierOrder.indexOf(plan.key);
          const isUpgrade = planIndex > currentTierIndex;
          const isDowngrade = planIndex < currentTierIndex;
          const IconComp = plan.icon;

          return (
            <div key={plan.key} className="relative pt-4">
              {/* MOST POPULAR badge */}
              {plan.badge && !isCurrent && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-primary-500 to-orange-500 text-white text-[11px] font-bold px-5 py-1.5 rounded-full shadow-lg shadow-primary-200/50 flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5" />
                    {plan.badge}
                  </div>
                </div>
              )}

              {/* Current Plan badge */}
              {isCurrent && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-green-500 text-white text-[11px] font-bold px-5 py-1.5 rounded-full shadow-lg shadow-green-200/50 flex items-center gap-1.5 whitespace-nowrap">
                    <Check className="w-3.5 h-3.5" />
                    CURRENT PLAN
                  </div>
                </div>
              )}

              <div className={`rounded-2xl p-8 transition-all h-full flex flex-col ${
                isCurrent
                  ? 'bg-white border-2 border-green-400 shadow-lg shadow-green-100'
                  : isFeatured
                  ? 'bg-white border-2 border-primary-300 shadow-xl shadow-primary-100'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
              }`}>
                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`bg-gradient-to-br ${plan.gradient} rounded-xl p-2.5 shadow-md`}>
                    <IconComp className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-secondary-500">{tier.name}</h3>
                </div>
                <p className="text-sm text-gray-400 mb-6">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                      {formatCurrency(price)}
                    </span>
                    <span className="text-gray-400 text-base font-medium">/mo</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-green-600 font-medium mt-1.5">
                      {formatCurrency(price * 12)}/year &middot; Save {formatCurrency(tier.price * 12 - price * 12)}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className={`h-px mb-6 ${
                  isFeatured ? 'bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200' :
                  isCurrent ? 'bg-gradient-to-r from-green-200 via-green-400 to-green-200' :
                  'bg-gray-100'
                }`} />

                {/* Features — flex-grow pushes button to bottom */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <div className={`rounded-full p-0.5 mt-0.5 shrink-0 ${
                        isFeatured ? 'bg-gradient-to-br from-primary-500 to-orange-500' :
                        isCurrent ? 'bg-green-500' :
                        'bg-green-100'
                      }`}>
                        <Check className={`w-3 h-3 ${
                          isFeatured || isCurrent ? 'text-white' : 'text-green-600'
                        }`} />
                      </div>
                      <span className={isFeatured ? 'text-secondary-500 font-medium' : ''}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button — always at bottom */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <button disabled className="w-full py-3.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleChangePlan(plan.key)}
                      disabled={changing !== null}
                      className={`group w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
                        isFeatured
                          ? 'bg-gradient-to-r from-primary-500 to-orange-500 shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-300/50 hover:scale-[1.02]'
                          : `bg-gradient-to-r ${plan.gradient} hover:opacity-90`
                      }`}
                    >
                      {changing === plan.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Upgrade
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  ) : isDowngrade ? (
                    <button
                      onClick={() => handleChangePlan(plan.key)}
                      disabled={changing !== null}
                      className="group w-full py-3.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2 transition-all duration-300"
                    >
                      {changing === plan.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Downgrade
                          <ArrowDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Callout Banner (matches pricing page) */}
      <div className={`bg-gradient-to-r from-secondary-500 to-secondary-700 rounded-2xl p-8 sm:p-10 mb-10 ${
        currentTier === 'enterprise' ? 'ring-2 ring-green-400 ring-offset-2' : ''
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 rounded-xl p-3">
              <Star className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white">Enterprise</h3>
                {currentTier === 'enterprise' && (
                  <span className="bg-green-400/30 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    CURRENT PLAN
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-sm mt-0.5">
                For regional chains, franchises &amp; multi-location businesses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-3xl font-bold text-white">
                {formatCurrency(getPrice('enterprise'))}
                <span className="text-base font-medium text-gray-400">/mo</span>
              </span>
              {isAnnual && (
                <p className="text-xs text-green-300 font-medium mt-0.5">
                  Save {formatCurrency((SUBSCRIPTION_TIERS.enterprise.price - SUBSCRIPTION_TIERS.enterprise.annualPrice) * 12)}/year
                </p>
              )}
            </div>
            {currentTier === 'enterprise' ? (
              <button disabled className="px-6 py-3 rounded-lg font-semibold bg-white/20 text-white/60 cursor-not-allowed whitespace-nowrap">
                Current Plan
              </button>
            ) : tierOrder.indexOf('enterprise') > currentTierIndex ? (
              <button
                onClick={() => handleChangePlan('enterprise')}
                disabled={changing !== null}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
              >
                {changing === 'enterprise' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Upgrade'
                )}
              </button>
            ) : (
              <button
                onClick={() => handleChangePlan('enterprise')}
                disabled={changing !== null}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
              >
                {changing === 'enterprise' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Downgrade'
                )}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Unlimited Deals', desc: 'Sponti + Steady, no limits' },
            { label: 'API Access', desc: 'Integrate with POS, CRM & more' },
            { label: 'Custom Branding', desc: 'White-label deal pages & domain' },
            { label: 'Dedicated Manager', desc: 'Priority support & onboarding' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4">
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Comparison Table (matches pricing page) */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-secondary-500">Compare Plans</h2>
          <p className="text-sm text-gray-500 mt-1">See what&apos;s included in each plan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 font-semibold text-gray-600 w-[28%]">Feature</th>
                <th className={`text-center py-4 px-6 font-semibold w-[18%] ${currentTier === 'starter' ? 'text-green-600 bg-green-50/40' : 'text-accent-600'}`}>
                  Starter
                  {currentTier === 'starter' && <span className="block text-[10px] text-green-500 font-normal">Current</span>}
                </th>
                <th className={`text-center py-4 px-6 font-semibold w-[18%] ${currentTier === 'pro' ? 'text-green-600 bg-green-50/40' : 'text-primary-600'}`}>
                  Pro
                  {currentTier === 'pro' && <span className="block text-[10px] text-green-500 font-normal">Current</span>}
                </th>
                <th className={`text-center py-4 px-6 font-semibold w-[18%] ${
                  currentTier === 'business' ? 'text-green-600 bg-green-50/40' : 'text-secondary-500 bg-secondary-50/40'
                }`}>
                  Business
                  {currentTier === 'business'
                    ? <span className="block text-[10px] text-green-500 font-normal">Current</span>
                    : <span className="block text-[10px] text-secondary-400 font-normal">Best Value</span>
                  }
                </th>
                <th className={`text-center py-4 px-6 font-semibold w-[18%] ${currentTier === 'enterprise' ? 'text-green-600 bg-green-50/40' : 'text-secondary-500'}`}>
                  Enterprise
                  {currentTier === 'enterprise' && <span className="block text-[10px] text-green-500 font-normal">Current</span>}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FEATURE_MATRIX.map((row) => (
                <tr key={row.feature} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-medium text-secondary-500">{row.feature}</td>
                  {(['starter', 'pro', 'business', 'enterprise'] as const).map((plan) => {
                    const val = row[plan];
                    const isCurr = plan === currentTier;
                    const isBusiness = plan === 'business';
                    return (
                      <td key={plan} className={`py-3.5 px-6 text-center ${
                        isCurr ? 'bg-green-50/20' : isBusiness ? 'bg-secondary-50/20' : ''
                      }`}>
                        {typeof val === 'boolean' ? (
                          val ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )
                        ) : (
                          <span className={`font-semibold ${
                            isCurr ? 'text-green-600' : isBusiness ? 'text-secondary-600' : 'text-secondary-500'
                          }`}>{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
