'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, Unlink } from 'lucide-react';
import Image from 'next/image';

interface ConnectStatus {
  connected: boolean;
  merchant_id: string | null;
  onboarding_complete: boolean;
  charges_enabled: boolean;
}

export default function PayPalConnectBanner() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/paypal/connect/status');
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
    if (!confirm('Are you sure you want to disconnect your PayPal account? Active integrated payment methods will be deactivated.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/paypal/connect/disconnect', { method: 'POST' });
      if (res.ok) {
        setStatus({ connected: false, merchant_id: null, onboarding_complete: false, charges_enabled: false });
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
      <div className="card p-6 mb-6 border-[#003087]/20 bg-gradient-to-r from-[#003087]/5 to-transparent">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#003087] animate-spin" />
          <Image src="/logos/paypal.svg" alt="PayPal" width={60} height={24} className="opacity-50" />
          <span className="text-sm text-gray-500">Checking connection status...</span>
        </div>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="card p-6 mb-6 border-[#003087]/20 bg-gradient-to-r from-[#003087]/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#003087] flex items-center justify-center shrink-0 p-1.5">
              <Image src="/logos/paypal.svg" alt="PayPal" width={40} height={20} className="brightness-0 invert" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Image src="/logos/paypal.svg" alt="PayPal" width={60} height={24} />
                <span className="text-gray-500 font-normal text-sm">Connect</span>
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> CONNECTED
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Merchant: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{status.merchant_id}</code>
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className={`flex items-center gap-1 ${status.charges_enabled ? 'text-green-600' : 'text-amber-600'}`}>
                  {status.charges_enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  Payments {status.charges_enabled ? 'Enabled' : 'Pending'}
                </span>
                <span className={`flex items-center gap-1 ${status.onboarding_complete ? 'text-green-600' : 'text-amber-600'}`}>
                  {status.onboarding_complete ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  Onboarding {status.onboarding_complete ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Disconnect PayPal"
          >
            {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  // Not connected
  return (
    <div className="card p-6 mb-6 border-[#003087]/20 bg-gradient-to-r from-[#003087]/5 to-transparent">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#003087] flex items-center justify-center shrink-0 p-1.5">
          <Image src="/logos/paypal.svg" alt="PayPal" width={40} height={20} className="brightness-0 invert" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Image src="/logos/paypal.svg" alt="PayPal" width={60} height={24} />
            <span className="text-gray-500 font-normal text-sm">Connect</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Connect your PayPal Business account for <span className="font-medium text-[#003087]">automated payments</span>.
            Customers pay through a secure PayPal checkout. Payments go directly to your account.
          </p>
          <a
            href="/api/paypal/connect/authorize"
            className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-[#003087] hover:bg-[#002060] text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-[#003087]/20"
          >
            <Image src="/logos/paypal.svg" alt="PayPal" width={48} height={20} className="brightness-0 invert" />
            Connect
          </a>
        </div>
      </div>
    </div>
  );
}
