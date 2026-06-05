'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlayCircle, X } from 'lucide-react';

const DISMISS_KEY = 'spc_howitworks_promo_dismissed';

/**
 * First-run promo on the customer dashboard home: invites the customer to watch
 * the "How It Works" explainer. Dismissed state persists in localStorage; the
 * video is always reachable from the sidebar afterwards.
 */
export function HowItWorksPromoCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== '1') setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (!show) return null;

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 via-primary-500 to-orange-400 p-4 sm:p-5 shadow-lg shadow-primary-200/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 z-10 rounded-full p-1 text-white/70 hover:bg-white/15 hover:text-white transition"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:h-12 sm:w-12">
            <PlayCircle className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight text-white sm:text-lg">New to SpontiCoupon?</p>
            <p className="mt-0.5 text-xs text-white/85 sm:text-sm">
              Watch the quick guide — browse, claim, redeem, and earn rewards.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/how-it-works"
          className="inline-flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary-600 transition-all hover:gap-2.5 sm:w-auto sm:py-2"
        >
          <PlayCircle className="h-4 w-4" />
          Watch the guide
        </Link>
      </div>
    </div>
  );
}
