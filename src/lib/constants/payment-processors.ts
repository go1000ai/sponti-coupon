import type { PaymentTier } from '@/lib/types/database';

export type PaymentProcessorType = 'stripe' | 'square' | 'paypal' | 'venmo' | 'zelle' | 'cashapp';

export interface PaymentProcessorInfo {
  name: string;
  placeholder: string;
  color: string;
  bgColor: string;
  helpText: string;
  logo: string;
  linkPrefix?: string;
  /** Whether this processor supports deposit collection (online or manual) */
  supportsDeposit: boolean;
  /** Whether this processor supports OAuth-based integrated connections */
  integratable: boolean;
  /** Which payment tiers this processor can operate in */
  supportedTiers: PaymentTier[];
  /** Instruction template for manual payments (uses {amount} and {payment_info} placeholders) */
  manualInstructionTemplate?: string;
}

export const PAYMENT_PROCESSORS: Record<PaymentProcessorType, PaymentProcessorInfo> = {
  stripe: {
    name: 'Stripe',
    placeholder: 'https://buy.stripe.com/your-link',
    color: '#635BFF',
    bgColor: 'bg-[#635BFF]',
    logo: '/logos/stripe.svg',
    helpText: 'Connect your Stripe account for automated payments, or paste a Stripe Payment Link.',
    linkPrefix: 'https://buy.stripe.com/',
    supportsDeposit: true,
    integratable: true,
    supportedTiers: ['integrated', 'link'],
  },
  square: {
    name: 'Square',
    placeholder: 'https://square.link/u/your-link',
    color: '#006AFF',
    bgColor: 'bg-[#006AFF]',
    logo: '/logos/square.svg',
    helpText: 'Paste your Square checkout link. Create one at squareup.com/dashboard/checkout-links.',
    linkPrefix: 'https://square.link/',
    supportsDeposit: true,
    integratable: false,
    supportedTiers: ['link'],
  },
  paypal: {
    name: 'PayPal',
    placeholder: 'https://paypal.me/yourbusiness',
    color: '#003087',
    bgColor: 'bg-[#003087]',
    logo: '/logos/paypal.svg',
    helpText: 'Paste your PayPal.me link or PayPal checkout URL.',
    linkPrefix: 'https://paypal.me/',
    supportsDeposit: true,
    integratable: false,
    supportedTiers: ['link'],
  },
  venmo: {
    name: 'Venmo',
    placeholder: '@yourbusiness',
    color: '#3D95CE',
    bgColor: 'bg-[#3D95CE]',
    logo: '/logos/venmo.svg',
    helpText: 'Enter your Venmo username. Customers will be instructed to send payment via Venmo. You confirm receipt to release the deal.',
    supportsDeposit: true,
    integratable: false,
    supportedTiers: ['manual'],
    manualInstructionTemplate: 'Send {amount} to {payment_info} on Venmo',
  },
  zelle: {
    name: 'Zelle',
    placeholder: 'business@email.com or (555) 123-4567',
    color: '#6D1ED4',
    bgColor: 'bg-[#6D1ED4]',
    logo: '/logos/zelle.svg',
    helpText: 'Enter your Zelle email or phone number. Customers will send payment via Zelle. You confirm receipt to release the deal.',
    supportsDeposit: true,
    integratable: false,
    supportedTiers: ['manual'],
    manualInstructionTemplate: 'Send {amount} to {payment_info} via Zelle',
  },
  cashapp: {
    name: 'Cash App',
    placeholder: '$yourbusiness',
    color: '#00D632',
    bgColor: 'bg-[#00D632]',
    logo: '/logos/cashapp.svg',
    helpText: 'Enter your Cash App tag. Customers will send payment via Cash App. You confirm receipt to release the deal.',
    supportsDeposit: true,
    integratable: false,
    supportedTiers: ['manual'],
    manualInstructionTemplate: 'Send {amount} to {payment_info} on Cash App',
  },
} as const;

export const PROCESSOR_LIST = Object.entries(PAYMENT_PROCESSORS) as [PaymentProcessorType, PaymentProcessorInfo][];

/** Processors that support online checkout links for deposit collection */
export const DEPOSIT_PROCESSORS = PROCESSOR_LIST.filter(([, p]) => p.supportsDeposit);

/** Processors that are manual (vendor confirms payment) */
export const MANUAL_PROCESSORS = PROCESSOR_LIST.filter(([, p]) => p.supportedTiers.includes('manual'));

/** Processors that support integrated (OAuth) connections */
export const INTEGRATED_PROCESSORS = PROCESSOR_LIST.filter(([, p]) => p.integratable);

/** Processors that use static payment links */
export const LINK_PROCESSORS = PROCESSOR_LIST.filter(([, p]) => p.supportedTiers.includes('link'));
