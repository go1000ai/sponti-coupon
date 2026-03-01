'use client';

import Link from 'next/link';
import { Lock, ArrowRight, Sparkles, Rocket, Crown, Star } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

/* ─── Tier visual config ─── */
const TIER_STYLE: Record<SubscriptionTier, { gradient: string; icon: typeof Rocket }> = {
  starter: { gradient: 'from-accent-500 to-accent-600', icon: Rocket },
  pro: { gradient: 'from-primary-500 to-orange-500', icon: Sparkles },
  business: { gradient: 'from-secondary-500 to-secondary-600', icon: Crown },
  enterprise: { gradient: 'from-amber-500 to-amber-600', icon: Star },
};

/* ════════════════════════════════════════════════
   UpgradePrompt — shown when a feature is locked
   ════════════════════════════════════════════════ */

interface UpgradePromptProps {
  requiredTier: SubscriptionTier;
  featureName: string;
  description?: string;
  mode?: 'overlay' | 'inline' | 'full-page';
}

export function UpgradePrompt({
  requiredTier,
  featureName,
  description,
  mode = 'overlay',
}: UpgradePromptProps) {
  const tierConfig = SUBSCRIPTION_TIERS[requiredTier];
  const style = TIER_STYLE[requiredTier];
  const TierIcon = style.icon;

  if (mode === 'full-page') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className={`inline-flex bg-gradient-to-br ${style.gradient} rounded-2xl p-5 mb-6 shadow-lg`}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{featureName}</h2>
          <p className="text-gray-500 mb-6">
            {description || `This feature is available on the ${tierConfig.name} plan and above. Upgrade to unlock it.`}
          </p>
          <Link
            href="/vendor/subscription"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-orange-500 text-white font-bold shadow-lg shadow-primary-200/40 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
          >
            <TierIcon className="w-5 h-5" />
            Upgrade to {tierConfig.name}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Starting at ${tierConfig.price}/mo &middot; 14-day free trial
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
        <div className={`bg-gradient-to-br ${style.gradient} rounded-xl p-3 shrink-0 shadow-md`}>
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900">{featureName}</h4>
          <p className="text-sm text-gray-500 mt-0.5">
            {description || `Available on the ${tierConfig.name} plan and above.`}
          </p>
        </div>
        <Link
          href="/vendor/subscription"
          className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors"
        >
          Upgrade <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Overlay mode — positioned absolute over a blurred parent
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl">
      <div className="text-center p-6 max-w-xs">
        <div className="bg-gray-100 rounded-full p-3 w-fit mx-auto mb-3">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="font-bold text-gray-900 text-base">{featureName}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {description || `Available on ${tierConfig.name} and above.`}
        </p>
        <Link
          href="/vendor/subscription"
          className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium text-xs hover:bg-primary-600 transition-colors"
        >
          Upgrade to {tierConfig.name} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   GatedSection — wraps content with blur + overlay
   ════════════════════════════════════════════════ */

interface GatedSectionProps {
  locked: boolean;
  loading?: boolean;
  requiredTier: SubscriptionTier;
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

export function GatedSection({
  locked,
  loading,
  requiredTier,
  featureName,
  description,
  children,
}: GatedSectionProps) {
  // While tier is loading, show children normally to avoid a paywall flash
  const showLock = locked && !loading;

  return (
    <div className="relative">
      <div className={showLock ? 'pointer-events-none select-none filter blur-[3px] opacity-60' : ''}>
        {children}
      </div>
      {showLock && (
        <UpgradePrompt
          requiredTier={requiredTier}
          featureName={featureName}
          description={description}
        />
      )}
    </div>
  );
}
