'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, Unlink, ArrowRight, Info, ChevronDown } from 'lucide-react';
import Image from 'next/image';

interface ConnectStatus {
  connected: boolean;
  account_id: string | null;
  onboarding_complete: boolean;
  charges_enabled: boolean;
}

export default function StripeConnectBanner() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/connect/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Silently fail — banner just won't show status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account? Active integrated payment methods will be deactivated.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/stripe/connect/disconnect', { method: 'POST' });
      if (res.ok) {
        setStatus({ connected: false, account_id: null, onboarding_complete: false, charges_enabled: false });
        // Reload page to refresh payment methods list
        window.location.reload();
      }
    } catch {
      // Error handling
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6 mb-6 border-[#635BFF]/20 bg-gradient-to-r from-[#635BFF]/5 to-transparent">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#635BFF] animate-spin" />
          <Image src="/logos/stripe.svg" alt="Stripe" width={60} height={24} className="opacity-50" />
          <span className="text-sm text-gray-500">Checking connection status...</span>
        </div>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="card p-6 mb-6 border-[#635BFF]/20 bg-gradient-to-r from-[#635BFF]/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#635BFF] flex items-center justify-center shrink-0 p-1.5">
              <Image src="/logos/stripe.svg" alt="Stripe" width={40} height={20} className="brightness-0 invert" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Image src="/logos/stripe.svg" alt="Stripe" width={60} height={24} />
                <span className="text-gray-500 font-normal text-sm">Connect</span>
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> CONNECTED
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Account: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{status.account_id ? `${status.account_id.slice(0, 8)}••••••` : '—'}</code>
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className={`flex items-center gap-1 ${status.charges_enabled ? 'text-green-600' : 'text-amber-600'}`}>
                  {status.charges_enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  Charges {status.charges_enabled ? 'Enabled' : 'Pending'}
                </span>
                <span className={`flex items-center gap-1 ${status.onboarding_complete ? 'text-green-600' : 'text-amber-600'}`}>
                  {status.onboarding_complete ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  Onboarding {status.onboarding_complete ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              {!status.charges_enabled && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-600">
                    Your Stripe account needs to complete onboarding before you can accept payments.
                  </p>
                  <a
                    href="/api/stripe/connect/authorize"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-[#635BFF] hover:underline"
                  >
                    <Image src="/logos/stripe.svg" alt="Stripe" width={40} height={16} /> Complete Onboarding
                  </a>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Disconnect Stripe"
          >
            {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  // Not connected
  return (
    <div className="card p-6 mb-6 border-[#635BFF]/20 bg-gradient-to-r from-[#635BFF]/5 to-transparent">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#635BFF] flex items-center justify-center shrink-0 p-1.5">
          <Image src="/logos/stripe.svg" alt="Stripe" width={40} height={20} className="brightness-0 invert" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Image src="/logos/stripe.svg" alt="Stripe" width={60} height={24} />
            <span className="text-gray-500 font-normal text-sm">Connect</span>
            <span className="inline-flex items-center gap-1 bg-[#635BFF]/10 text-[#635BFF] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Customers pay you
            </span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Connect Stripe so <span className="font-semibold text-gray-700">customers can pay your business directly</span> when they claim deposit-required deals. Money lands in your bank account &mdash; SpontiCoupon never touches it.
          </p>

          {/* Money flow visual */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full">
              Customer
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="inline-flex items-center gap-1.5 bg-[#635BFF]/10 text-[#635BFF] font-bold px-2.5 py-1 rounded-full">
              Stripe (your account)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full">
              Your bank
            </span>
          </div>

          <a
            href="/api/stripe/connect/authorize"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#635BFF] hover:bg-[#5851DB] text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-[#635BFF]/20"
          >
            <Image src="/logos/stripe.svg" alt="Stripe" width={48} height={20} className="brightness-0 invert" />
            Connect to accept payments
          </a>

          {/* Expandable: Why two Stripe flows? */}
          <button
            type="button"
            onClick={() => setExplainerOpen(o => !o)}
            className="inline-flex items-center gap-1.5 mt-3 ml-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            <Info className="w-3.5 h-3.5" />
            Wait, isn&apos;t there already a Stripe charging me for my subscription?
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${explainerOpen ? 'rotate-180' : ''}`} />
          </button>

          {explainerOpen && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
              <div className="rounded-xl border border-[#635BFF]/30 bg-[#635BFF]/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#635BFF] flex items-center justify-center shrink-0 p-1">
                    <Image src="/logos/stripe.svg" alt="Stripe" width={28} height={14} className="brightness-0 invert" />
                  </div>
                  <span className="text-[10px] font-bold text-[#635BFF] uppercase tracking-wide">This Stripe Connect</span>
                </div>
                <p className="text-sm font-bold text-gray-900">Customer &rarr; You</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Customers pay your business through Stripe&apos;s secure checkout. Money goes to <em>your</em> bank, not ours.
                </p>
                <p className="text-[11px] text-gray-500 mt-2">
                  <span className="font-semibold">You keep 100%.</span> Stripe&apos;s standard processing fee applies (2.9% + 30¢, paid by you to Stripe).
                </p>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                    SC
                  </div>
                  <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wide">SpontiCoupon subscription</span>
                </div>
                <p className="text-sm font-bold text-gray-900">You &rarr; SpontiCoupon</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Your monthly SpontiCoupon plan fee. Managed in <a href="/vendor/subscription" className="text-primary-600 font-semibold hover:underline">Subscription settings</a>.
                </p>
                <p className="text-[11px] text-gray-500 mt-2">
                  Founding vendors get the first <span className="font-semibold">90 days free</span> &mdash; no card on file.
                </p>
              </div>

              <div className="md:col-span-2 text-[11px] text-gray-500 italic">
                Two completely separate flows on two separate Stripe accounts. They never touch each other.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
