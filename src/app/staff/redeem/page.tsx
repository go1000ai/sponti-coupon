'use client';

import { useState } from 'react';
import { ScanLine, Loader2, CheckCircle2, XCircle, Star, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

interface LoyaltyAward { program_name: string; earned: string; current: string; }
interface RedeemResult {
  success: boolean;
  error?: string;
  customer?: { name: string; email: string };
  deal?: { title: string; deal_price: number; original_price: number };
  loyalty_awards?: LoyaltyAward[];
  remaining_balance?: number;
}

export default function StaffRedeemPage() {
  const { employerBusinessName } = useAuth();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  const doRedeem = async () => {
    if (code.length !== 6) return;
    setRedeeming(true);
    setResult(null);
    try {
      const res = await fetch(`/api/redeem/${code}`, { method: 'POST' });
      const data = await res.json();
      setResult(res.ok ? { success: true, ...data } : { success: false, error: data.error || 'Redemption failed' });
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    }
    setRedeeming(false);
  };

  return (
    <div className="flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-primary-600 font-bold">
            <ScanLine className="w-5 h-5" /> Redeem
          </div>
          {employerBusinessName && <p className="text-sm text-gray-500 mt-0.5">{employerBusinessName}</p>}
        </div>

        {result ? (
          <div className="card p-6 text-center">
            {result.success ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-9 h-9 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Redeemed!</h2>
                {result.deal && <p className="text-sm text-gray-600 mt-1">{result.deal.title}</p>}
                {result.customer?.name && <p className="text-xs text-gray-400 mt-0.5">{result.customer.name}</p>}
                {result.deal && <p className="text-lg font-bold text-primary-500 mt-2">{formatCurrency(result.deal.deal_price)}</p>}
                {result.remaining_balance != null && result.remaining_balance > 0 && (
                  <p className="text-sm text-amber-600 font-semibold mt-1">Collect balance: {formatCurrency(result.remaining_balance)}</p>
                )}
                {result.loyalty_awards && result.loyalty_awards.length > 0 && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left">
                    {result.loyalty_awards.map((a, i) => (
                      <p key={i} className="text-xs text-emerald-700 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> <span className="font-semibold">+{a.earned}</span> · {a.current} ({a.program_name})
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-9 h-9 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Couldn&apos;t redeem</h2>
                <p className="text-sm text-gray-500 mt-1">{result.error}</p>
              </>
            )}
            <button onClick={() => { setCode(''); setResult(null); }} className="btn-primary w-full mt-5">Redeem another</button>
          </div>
        ) : (
          <div className="card p-6">
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Enter redemption code</h1>
            <p className="text-sm text-gray-500 text-center mb-5">Type the customer&apos;s 6-digit code.</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="------"
              className="w-full text-center text-3xl font-extrabold tracking-[0.4em] py-4 rounded-xl border-2 border-gray-200 focus:border-primary-400 outline-none mb-4"
            />
            <button
              onClick={doRedeem}
              disabled={code.length !== 6 || redeeming}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Redeem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
