import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Re-export for convenience
export { Stripe };

export const SUBSCRIPTION_PRICES: Record<string, { price: number; name: string }> = {
  starter: { price: 4900, name: 'Starter' },
  pro: { price: 9900, name: 'Pro' },
  business: { price: 19900, name: 'Business' },
  enterprise: { price: 49900, name: 'Enterprise' },
};
