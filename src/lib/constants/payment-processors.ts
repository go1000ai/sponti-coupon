export type PaymentProcessorType = 'stripe' | 'square' | 'paypal' | 'venmo' | 'zelle' | 'cashapp';

export interface PaymentProcessorInfo {
  name: string;
  placeholder: string;
  color: string;
  bgColor: string;
  helpText: string;
  linkPrefix?: string;
}

export const PAYMENT_PROCESSORS: Record<PaymentProcessorType, PaymentProcessorInfo> = {
  stripe: {
    name: 'Stripe',
    placeholder: 'https://buy.stripe.com/your-link',
    color: '#635BFF',
    bgColor: 'bg-[#635BFF]',
    helpText: 'Paste your Stripe Payment Link URL. Create one at dashboard.stripe.com/payment-links.',
    linkPrefix: 'https://buy.stripe.com/',
  },
  square: {
    name: 'Square',
    placeholder: 'https://square.link/u/your-link',
    color: '#006AFF',
    bgColor: 'bg-[#006AFF]',
    helpText: 'Paste your Square checkout link. Create one at squareup.com/dashboard/checkout-links.',
    linkPrefix: 'https://square.link/',
  },
  paypal: {
    name: 'PayPal',
    placeholder: 'https://paypal.me/yourbusiness',
    color: '#003087',
    bgColor: 'bg-[#003087]',
    helpText: 'Paste your PayPal.me link or PayPal checkout URL.',
    linkPrefix: 'https://paypal.me/',
  },
  venmo: {
    name: 'Venmo',
    placeholder: '@yourbusiness',
    color: '#3D95CE',
    bgColor: 'bg-[#3D95CE]',
    helpText: 'Enter your Venmo username (with @) or Venmo business profile link.',
  },
  zelle: {
    name: 'Zelle',
    placeholder: 'business@email.com or (555) 123-4567',
    color: '#6D1ED4',
    bgColor: 'bg-[#6D1ED4]',
    helpText: 'Enter the email or phone number registered with your Zelle account.',
  },
  cashapp: {
    name: 'Cash App',
    placeholder: '$yourbusiness',
    color: '#00D632',
    bgColor: 'bg-[#00D632]',
    helpText: 'Enter your Cash App $cashtag.',
  },
} as const;

export const PROCESSOR_LIST = Object.entries(PAYMENT_PROCESSORS) as [PaymentProcessorType, PaymentProcessorInfo][];
