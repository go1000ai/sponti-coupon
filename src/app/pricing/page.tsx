import Link from 'next/link';
import { Check } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

const tierHighlights: Record<string, string[]> = {
  starter: [
    '4 deals per month',
    'QR code system',
    'Basic analytics',
    'Email support',
    'Zero transaction fees',
  ],
  pro: [
    '12 deals per month',
    'QR code system',
    'Advanced analytics',
    'Priority support',
    'Zero transaction fees',
    'Custom deal scheduling',
  ],
  business: [
    'Unlimited deals',
    'Multi-location support',
    'QR code system',
    'Full analytics suite',
    'Dedicated support',
    'Zero transaction fees',
    'Team member access',
  ],
  enterprise: [
    'Unlimited deals',
    'Multi-location support',
    'API access',
    'Custom branding',
    'Full analytics suite',
    'Dedicated account manager',
    'Zero transaction fees',
    'SLA guarantee',
  ],
};

export default function PricingPage() {
  const tiers = Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-secondary-500">Simple, Transparent Pricing</h1>
        <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
          Flat monthly fee. Zero transaction fees. Zero commission. Customer deposits go directly to you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map(([key, tier]) => {
          const isPopular = key === 'pro';

          return (
            <div key={key} className={`card p-8 relative ${isPopular ? 'ring-2 ring-primary-500 shadow-xl' : ''}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <h3 className="text-xl font-bold text-secondary-500">{tier.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-5xl font-bold text-primary-500">${tier.price}</span>
                <span className="text-gray-500">/month</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tierHighlights[key]?.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/vendor-signup"
                className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                  isPopular
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-gray-100 text-secondary-500 hover:bg-gray-200'
                }`}
              >
                Get Started
              </Link>
            </div>
          );
        })}
      </div>

      {/* Zero Fees Banner */}
      <div className="mt-16 bg-secondary-500 rounded-2xl p-8 sm:p-12 text-white text-center">
        <div className="inline-flex bg-primary-500/20 rounded-full p-3 mb-4">
          <SpontiIcon className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Zero Transaction Fees. Always.</h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-lg">
          Unlike other deal platforms, we never take a cut of your sales. Customer deposits go directly to your Stripe account. We only charge the flat monthly subscription fee.
        </p>
      </div>
    </div>
  );
}
