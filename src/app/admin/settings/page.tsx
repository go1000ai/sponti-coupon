'use client';

import {
  Settings,
  Globe,
  CreditCard,
  Star,
  Tag,
  Shield,
  CheckCircle,
  Zap,
  Crown,
  Building2,
  Gem,
  QrCode,
  Image,
  Timer,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_INFO = {
  name: 'SpontiCoupon',
  version: '1.0.0',
  environment: 'Production',
};

const SUBSCRIPTION_TIERS = [
  {
    name: 'Starter',
    price: '$49/mo',
    icon: Zap,
    color: 'bg-gray-100 text-gray-600',
    borderColor: 'border-gray-200',
    features: ['5 active deals', 'Basic analytics'],
  },
  {
    name: 'Pro',
    price: '$99/mo',
    icon: Crown,
    color: 'bg-primary-50 text-primary-600',
    borderColor: 'border-primary-200',
    features: ['15 active deals', 'Advanced analytics', 'AI insights'],
  },
  {
    name: 'Business',
    price: '$199/mo',
    icon: Building2,
    color: 'bg-accent-50 text-accent-600',
    borderColor: 'border-accent-200',
    features: ['50 active deals', 'Team management', 'API access'],
  },
  {
    name: 'Enterprise',
    price: '$499/mo',
    icon: Gem,
    color: 'bg-purple-50 text-purple-600',
    borderColor: 'border-purple-200',
    features: ['Unlimited deals', 'Custom branding', 'Priority support'],
  },
];

const SPONTI_POINTS = [
  { label: 'Earning Rate', value: '1 point per claim' },
  { label: 'Redemption Rate', value: '10 points = $1 off next deal' },
  { label: 'First Claim Bonus', value: '5 points' },
  { label: 'Expiry Policy', value: '12 months of inactivity' },
];

const DEAL_CONFIG = [
  { label: 'Deal Types', value: 'Regular, SpontiCoupon (deposit-based)' },
  { label: 'Max Claim Period', value: '7 days' },
  { label: 'QR Code Format', value: 'UUID-based' },
];

const SYSTEM_LIMITS = [
  { label: 'Max Deal Image Size', value: '5 MB' },
  { label: 'Supported Image Formats', value: 'JPEG, PNG, WebP' },
  { label: 'API Rate Limit', value: '100 requests/min' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-secondary-500">Platform Settings</h1>
          <p className="text-sm text-gray-500">Current platform configuration and system constants</p>
        </div>
      </div>

      {/* ── Section 1: Platform Info ──────────────────────────────────────── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-secondary-500">Platform Info</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">App Name</span>
            <span className="text-sm font-semibold text-secondary-500">{PLATFORM_INFO.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Version</span>
            <span className="text-sm font-semibold text-secondary-500">{PLATFORM_INFO.version}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Environment</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {PLATFORM_INFO.environment}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Subscription Tiers ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-secondary-500">Subscription Tiers</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div key={tier.name} className={`card p-5 border-t-4 ${tier.borderColor}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${tier.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${tier.color}`}>
                    {tier.name}
                  </span>
                </div>
                <p className="text-2xl font-bold text-secondary-500 mb-3">{tier.price}</p>
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: SpontiPoints Configuration ─────────────────────────── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-secondary-500">SpontiPoints Configuration</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SPONTI_POINTS.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-secondary-500">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Deal Configuration ─────────────────────────────────── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-secondary-500">Deal Configuration</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DEAL_CONFIG.map((item) => {
            const iconMap: Record<string, React.ReactNode> = {
              'Deal Types': <Tag className="w-4 h-4 text-gray-400" />,
              'Max Claim Period': <Timer className="w-4 h-4 text-gray-400" />,
              'QR Code Format': <QrCode className="w-4 h-4 text-gray-400" />,
            };
            return (
              <div
                key={item.label}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="mt-0.5">{iconMap[item.label]}</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-secondary-500">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 5: System Limits ──────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-secondary-500">System Limits</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SYSTEM_LIMITS.map((item) => {
            const iconMap: Record<string, React.ReactNode> = {
              'Max Deal Image Size': <Image className="w-4 h-4 text-gray-400" />,
              'Supported Image Formats': <Image className="w-4 h-4 text-gray-400" />,
              'API Rate Limit': <Zap className="w-4 h-4 text-gray-400" />,
            };
            return (
              <div
                key={item.label}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="mt-0.5">{iconMap[item.label]}</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-secondary-500">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
