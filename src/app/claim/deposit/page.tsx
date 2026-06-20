'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency } from '@/lib/utils';
import type { Claim } from '@/lib/types/database';
import {
  CheckCircle2, Loader2, Copy, Check, ExternalLink, ArrowRight, Info,
} from 'lucide-react';

export default function DepositPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary-500 animate-spin" /></div>}>
      <DepositContent />
    </Suspense>
  );
}

function DepositContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionToken = searchParams.get('session_token');
  const amount = searchParams.get('amount');
  const dealTitle = searchParams.get('deal_title');
  const link = searchParams.get('link');
  const reference = searchParams.get('reference');

  const [status, setStatus] = useState<'instructions' | 'reporting' | 'confirmed' | 'error'>('instructions');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [result, setResult] = useState<{ redemption_code?: string; payment_reference?: string } | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [paidClicked, setPaidClicked] = useState(false);

  // Fetch claim for the expiration timer, and restore the confirmed state on refresh.
  useEffect(() => {
    if (!sessionToken) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('claims')
        .select('*, deal:deals(title, expires_at)')
        .eq('session_token', sessionToken)
        .single();
      if (data) {
        setClaim(data);
        if (data.deposit_confirmed && data.redemption_code) {
          setResult({ redemption_code: data.redemption_code, payment_reference: data.payment_reference });
          setStatus('confirmed');
        }
      }
    })();
  }, [sessionToken]);

  const handleReportPaid = async () => {
    if (!sessionToken) return;
    setStatus('reporting');
    try {
      const res = await fetch('/api/claims/report-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStatus('confirmed');
    } catch {
      setStatus('error');
    }
  };

  const handleCopyRef = async () => {
    if (reference) {
      await navigator.clipboard.writeText(reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">We couldn&rsquo;t record your deposit. Please try again.</p>
          <button onClick={() => setStatus('instructions')} className="btn-outline mr-2">Try Again</button>
          <button onClick={() => router.push('/dashboard/my-deals')} className="btn-primary">Go to My Deals</button>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="inline-flex bg-green-50 rounded-full p-4 mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">You&rsquo;re all set!</h2>
          <p className="text-gray-500 mb-6">Show this code to the business to redeem. You&rsquo;ll pay the remaining balance there.</p>

          {result?.redemption_code && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 mb-1">Redemption Code</p>
              <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">{result.redemption_code}</p>
            </div>
          )}

          {(result?.payment_reference || reference) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left flex gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Your deposit reference is <span className="font-mono font-bold">{result?.payment_reference || reference}</span>.
                The business will confirm your deposit on their own account using this code when you redeem.
              </p>
            </div>
          )}

          {(claim?.deal?.title || dealTitle) && (
            <p className="font-semibold text-gray-900 mb-4">{claim?.deal?.title || dealTitle}</p>
          )}

          <button onClick={() => router.push('/dashboard/my-deals')} className="btn-primary w-full">
            View My Deals
          </button>
        </div>
      </div>
    );
  }

  // Instructions
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex bg-primary-50 rounded-full p-3 mb-3">
            <ExternalLink className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Pay your deposit</h2>
          {dealTitle && <p className="text-sm text-gray-500 mt-1">{dealTitle}</p>}
        </div>

        <div className="space-y-4">
          {/* Step 1: amount */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">1</div>
              <p className="font-semibold text-gray-900">Pay the deposit online</p>
            </div>
            {amount && (
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-primary-500">{formatCurrency(parseFloat(amount))}</p>
                <p className="text-sm text-gray-400 mt-1">Deposit</p>
              </div>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPaidClicked(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors"
              >
                Pay Deposit <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Step 2: reference code */}
          {reference && (
            <div className="bg-primary-50 rounded-xl p-5 border border-primary-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                <p className="font-semibold text-gray-900">Add your reference code</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                If your payment lets you add a note, include this code so the business can match your deposit:
              </p>
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg p-4 border-2 border-primary-300">
                <p className="text-2xl font-mono font-bold text-primary-600 tracking-widest">{reference}</p>
                <button
                  onClick={handleCopyRef}
                  className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors shrink-0"
                  title="Copy reference code"
                >
                  {copiedRef ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: confirm */}
        <button
          onClick={handleReportPaid}
          disabled={status === 'reporting'}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-xl transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50"
        >
          {status === 'reporting' ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Getting your code…</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> I&rsquo;ve Paid the Deposit</>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          {paidClicked
            ? 'Tap once your deposit payment is complete to get your redemption code.'
            : 'You&rsquo;ll get your redemption code right away. The business confirms the deposit on their end.'}
        </p>

        {claim?.expires_at && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Deal expires in</p>
            <CountdownTimer expiresAt={claim.expires_at} size="sm" variant="sponti" />
          </div>
        )}

        <button
          onClick={() => router.push('/dashboard/my-deals')}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
        >
          I&rsquo;ll do this later <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
