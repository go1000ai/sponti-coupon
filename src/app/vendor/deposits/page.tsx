'use client';

import { useEffect, useState, useCallback } from 'react';
import { BadgeCheck, Loader2, ShieldCheck, Info, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_PROCESSORS, type PaymentProcessorType } from '@/lib/constants/payment-processors';

interface PendingDeposit {
  claim_id: string;
  deal_title: string;
  deposit_amount: number;
  payment_reference: string | null;
  processor: string | null;
  reported_at: string;
  redeemed: boolean;
  customer_name: string;
  customer_email: string | null;
}

export default function VendorDepositsPage() {
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchDeposits = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/pending-deposits');
      const data = await res.json();
      if (data.deposits) setDeposits(data.deposits);
    } catch { /* keep whatever we had */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  const verify = async (claimId: string) => {
    setVerifying(claimId);
    try {
      const res = await fetch('/api/vendor/verify-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId }),
      });
      if (res.ok) setDeposits((d) => d.filter((x) => x.claim_id !== claimId));
    } catch { /* leave it in the list to retry */ }
    setVerifying(null);
  };

  const processorName = (key: string | null) =>
    (key && PAYMENT_PROCESSORS[key as PaymentProcessorType]?.name) || 'your merchant account';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-green-500" />
          Deposits to verify
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Deposits customers reported paying through your external payment link. Confirm each one
          landed in your own merchant account, then mark it verified.
        </p>
      </div>

      {/* How it works / risk reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 leading-relaxed">
          <p className="font-semibold">Deposits go directly to your merchant account.</p>
          <p className="mt-1 text-amber-700">
            The customer already has their redemption code. We recommend matching each deposit below
            against your own merchant account using the reference code and amount before marking it
            verified. If a deposit hasn&rsquo;t arrived yet, you can leave it unverified and simply collect
            the full amount when the customer redeems.
          </p>
        </div>
      </div>

      {deposits.length === 0 ? (
        <div className="card p-12 text-center">
          <BadgeCheck className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">Nothing to verify</h3>
          <p className="text-sm text-gray-400">Reported deposits awaiting your confirmation will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deposits.map((d) => (
            <div key={d.claim_id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{d.deal_title}</h3>
                    {d.redeemed && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">REDEEMED</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{d.customer_name}{d.customer_email ? ` · ${d.customer_email}` : ''}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                    <span className="font-bold text-primary-500">{formatCurrency(d.deposit_amount)}</span>
                    <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                      <ExternalLink className="w-3 h-3" /> {processorName(d.processor)}
                    </span>
                    {d.payment_reference && (
                      <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{d.payment_reference}</span>
                    )}
                    <span className="text-gray-400 text-xs">{new Date(d.reported_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => verify(d.claim_id)}
                  disabled={verifying === d.claim_id}
                  className="shrink-0 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {verifying === d.claim_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                  Mark verified
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
