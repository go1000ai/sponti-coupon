'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_PROCESSORS } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';
import type { Claim } from '@/lib/types/database';
import {
  QrCode, CheckCircle2, Loader2, Copy, Check,
  Smartphone, ArrowRight,
} from 'lucide-react';

export default function ManualPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary-500 animate-spin" /></div>}>
      <ManualPaymentContent />
    </Suspense>
  );
}

function ManualPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionToken = searchParams.get('session_token');
  const processorType = searchParams.get('processor') as PaymentProcessorType | null;
  const paymentInfo = searchParams.get('payment_info');
  const amount = searchParams.get('amount');
  const dealTitle = searchParams.get('deal_title');
  const paymentReference = searchParams.get('payment_reference');

  const [status, setStatus] = useState<'instructions' | 'confirmed' | 'error'>('instructions');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const processor = processorType ? PAYMENT_PROCESSORS[processorType] : null;

  // Poll for deposit confirmation
  useEffect(() => {
    if (!sessionToken || status === 'confirmed' || status === 'error') return;

    const checkClaim = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('claims')
        .select('*, deal:deals(title, expires_at)')
        .eq('session_token', sessionToken)
        .single();

      if (data) {
        setClaim(data);
        if (data.deposit_confirmed && data.qr_code) {
          setStatus('confirmed');
        } else {
          setPollCount(prev => prev + 1);
        }
      } else if (pollCount > 5) {
        setStatus('error');
      }
    };

    checkClaim();
    const interval = setInterval(checkClaim, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [sessionToken, status, pollCount]);

  const handleCopy = async () => {
    if (paymentInfo) {
      await navigator.clipboard.writeText(paymentInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyRef = async () => {
    if (paymentReference) {
      await navigator.clipboard.writeText(paymentReference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">We couldn&apos;t find your claim. Please check your email for confirmation.</p>
          <button onClick={() => router.push('/dashboard/my-deals')} className="btn-primary">
            Go to My Deals
          </button>
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
          <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Confirmed!</h2>
          <p className="text-gray-500 mb-6">The vendor has confirmed your payment. Here&apos;s your QR code:</p>

          <div className="bg-white border-4 border-secondary-500 rounded-xl p-6 inline-block mb-6">
            <QrCode className="w-40 h-40 text-gray-900" />
          </div>

          {claim?.redemption_code && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 mb-1">Redemption Code</p>
              <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">{claim.redemption_code}</p>
            </div>
          )}

          {claim?.deal?.title && (
            <p className="font-semibold text-gray-900 mb-2">{claim.deal.title}</p>
          )}

          {claim?.deal?.expires_at && (
            <div className="bg-primary-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary-600 font-medium mb-2">Redeem before:</p>
              <CountdownTimer expiresAt={claim.deal.expires_at} size="md" variant="sponti" />
            </div>
          )}

          <button onClick={() => router.push('/dashboard/my-deals')} className="btn-primary w-full">
            View My Deals
          </button>
        </div>
      </div>
    );
  }

  // Instructions state
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="card p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex bg-primary-50 rounded-full p-3 mb-3">
            <Smartphone className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Complete Your Payment</h2>
          {dealTitle && (
            <p className="text-sm text-gray-500 mt-1">{dealTitle}</p>
          )}
        </div>

        {/* Payment instructions */}
        <div className="space-y-4">
          {/* Step 1: Amount */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">1</div>
              <p className="font-semibold text-gray-900">Send Payment</p>
            </div>
            {amount && (
              <div className="text-center py-3">
                <p className="text-3xl font-bold text-primary-500">{formatCurrency(parseFloat(amount))}</p>
                <p className="text-sm text-gray-400 mt-1">Amount to send</p>
              </div>
            )}
          </div>

          {/* Step 2: Pay via processor */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">2</div>
              <p className="font-semibold text-gray-900">
                Pay via {processor?.name || 'the vendor'}
              </p>
            </div>
            {paymentInfo && (
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                {processor && (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: processor.color }}
                  >
                    {processor.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{paymentInfo}</p>
                  <p className="text-xs text-gray-400">{processor?.name}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors shrink-0"
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Include reference code in payment note */}
          {paymentReference && (
            <div className="bg-primary-50 rounded-xl p-5 border border-primary-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                <p className="font-semibold text-gray-900">Include Reference Code</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Add this code in the payment note/memo so the vendor can match your payment:
              </p>
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg p-4 border-2 border-primary-300">
                <p className="text-2xl font-mono font-bold text-primary-600 tracking-widest">{paymentReference}</p>
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

          {/* Step 4: Wait for confirmation */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">{paymentReference ? '4' : '3'}</div>
              <p className="font-semibold text-gray-900">Wait for Confirmation</p>
            </div>
            <p className="text-sm text-gray-500">
              After you send the payment, the vendor will verify it. Your QR code will appear here automatically.
            </p>
          </div>
        </div>

        {/* Waiting indicator */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
            <p className="text-sm font-semibold text-amber-700">Waiting for vendor to confirm payment...</p>
          </div>
          <p className="text-xs text-amber-600">This page will update automatically</p>
        </div>

        {/* Claim expiration */}
        {claim?.expires_at && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Deal expires in:</p>
            <CountdownTimer expiresAt={claim.expires_at} size="sm" variant="sponti" />
          </div>
        )}

        {/* Fallback button */}
        <button
          onClick={() => router.push('/dashboard/my-deals')}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
        >
          Check My Deals Later <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
