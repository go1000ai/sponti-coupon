'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, CheckCircle2, XCircle, Loader2, Unlink } from 'lucide-react';

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
          <span className="text-sm text-gray-500">Checking Stripe Connect status...</span>
        </div>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="card p-6 mb-6 border-[#635BFF]/20 bg-gradient-to-r from-[#635BFF]/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#635BFF] flex items-center justify-center text-white shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-500 flex items-center gap-2">
                Stripe Connect
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> CONNECTED
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Account: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{status.account_id}</code>
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
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  Your Stripe account needs to complete onboarding before you can accept payments. Check your Stripe Dashboard.
                </p>
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
        <div className="w-10 h-10 rounded-xl bg-[#635BFF] flex items-center justify-center text-white shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-secondary-500">Stripe Connect</h3>
          <p className="text-sm text-gray-500 mt-1">
            Connect your Stripe account for <span className="font-medium text-[#635BFF]">automated payments</span>.
            Customers pay the exact deposit amount through a secure Stripe checkout. Payments go directly to your account.
          </p>
          <a
            href="/api/stripe/connect/authorize"
            className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-[#635BFF] hover:bg-[#5851DB] text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-[#635BFF]/20"
          >
            <Zap className="w-4 h-4" />
            Connect with Stripe
          </a>
        </div>
      </div>
    </div>
  );
}
