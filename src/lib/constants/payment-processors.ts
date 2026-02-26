export type PaymentProcessorType = 'stripe' | 'square' | 'paypal' | 'venmo' | 'zelle' | 'cashapp';

export interface PaymentProcessorInfo {
  name: string;
  placeholder: string;
  color: string;
  bgColor: string;
  helpText: string;
  linkPrefix?: string;
  /** Whether this processor supports checkout links for online deposit collection */
  supportsDeposit: boolean;
}

export const PAYMENT_PROCESSORS: Record<PaymentProcessorType, PaymentProcessorInfo> = {
  stripe: {
    name: 'Stripe',
    placeholder: 'https://buy.stripe.com/your-link',
    color: '#635BFF',
    bgColor: 'bg-[#635BFF]',
    helpText: 'Paste your Stripe Payment Link URL. Create one at dashboard.stripe.com/payment-links.',
    linkPrefix: 'https://buy.stripe.com/',
    supportsDeposit: true,
  },
  square: {
    name: 'Square',
    placeholder: 'https://square.link/u/your-link',
    color: '#006AFF',
    bgColor: 'bg-[#006AFF]',
    helpText: 'Paste your Square checkout link. Create one at squareup.com/dashboard/checkout-links.',
    linkPrefix: 'https://square.link/',
    supportsDeposit: true,
  },
  paypal: {
    name: 'PayPal',
    placeholder: 'https://paypal.me/yourbusiness',
    color: '#003087',
    bgColor: 'bg-[#003087]',
    helpText: 'Paste your PayPal.me link or PayPal checkout URL.',
    linkPrefix: 'https://paypal.me/',
    supportsDeposit: true,
  },
  venmo: {
    name: 'Venmo',
    placeholder: '@yourbusiness',
    color: '#3D95CE',
    bgColor: 'bg-[#3D95CE]',
    helpText: 'Shown on your deal page so customers know you accept Venmo in-store.',
    supportsDeposit: false,
  },
  zelle: {
    name: 'Zelle',
    placeholder: 'business@email.com or (555) 123-4567',
    color: '#6D1ED4',
    bgColor: 'bg-[#6D1ED4]',
    helpText: 'Shown on your deal page so customers know you accept Zelle in-store.',
    supportsDeposit: false,
  },
  cashapp: {
    name: 'Cash App',
    placeholder: '$yourbusiness',
    color: '#00D632',
    bgColor: 'bg-[#00D632]',
    helpText: 'Shown on your deal page so customers know you accept Cash App in-store.',
    supportsDeposit: false,
  },
} as const;

export const PROCESSOR_LIST = Object.entries(PAYMENT_PROCESSORS) as [PaymentProcessorType, PaymentProcessorInfo][];

/** Processors that support online checkout links for deposit collection */
export const DEPOSIT_PROCESSORS = PROCESSOR_LIST.filter(([, p]) => p.supportsDeposit);

/** Processors that are display-only (accepted in-store) */
export const INSTORE_PROCESSORS = PROCESSOR_LIST.filter(([, p]) => !p.supportsDeposit);
