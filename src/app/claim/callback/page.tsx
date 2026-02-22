'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { QrCode, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import type { Claim } from '@/lib/types/database';

export default function ClaimCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary-500 animate-spin" /></div>}>
      <ClaimCallbackContent />
    </Suspense>
  );
}

function ClaimCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionToken = searchParams.get('session_token');
  const [status, setStatus] = useState<'checking' | 'confirmed' | 'pending' | 'error'>('checking');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!sessionToken) {
      setStatus('error');
      return;
    }

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
        } else if (pollCount < 30) {
          // Poll for up to 30 seconds
          setStatus('pending');
          setPollCount(prev => prev + 1);
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('error');
      }
    };

    checkClaim();
    const interval = setInterval(checkClaim, 2000);
    return () => clearInterval(interval);
  }, [sessionToken, pollCount]);

  if (status === 'checking') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-secondary-500">Verifying your payment...</h2>
          <p className="text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">We couldn&apos;t verify your payment. Please check your email for confirmation.</p>
          <button onClick={() => router.push('/my-deals')} className="btn-primary">
            Go to My Deals
          </button>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-secondary-500 mb-2">Waiting for Payment Confirmation</h2>
          <p className="text-gray-500 mb-4">
            Your payment is being processed. Your QR code will appear here once confirmed.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-2">Checking payment status...</p>
          </div>
          <button onClick={() => router.push('/my-deals')} className="btn-outline w-full">
            Check My Deals Later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="inline-flex bg-green-50 rounded-full p-4 mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Deal Claimed!</h2>
        <p className="text-gray-500 mb-6">Your deposit has been confirmed. Here&apos;s your QR code:</p>

        {/* QR Code */}
        <div className="bg-white border-4 border-secondary-500 rounded-xl p-6 inline-block mb-6">
          <QrCode className="w-40 h-40 text-secondary-500" />
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 font-mono break-all">{claim?.qr_code}</p>
        </div>

        {claim?.deal?.title && (
          <p className="font-semibold text-secondary-500 mb-2">{claim.deal.title}</p>
        )}

        {claim?.deal?.expires_at && (
          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-primary-600 font-medium mb-2">Redeem before:</p>
            <CountdownTimer expiresAt={claim.deal.expires_at} size="md" />
          </div>
        )}

        <button onClick={() => router.push('/my-deals')} className="btn-primary w-full">
          View My Deals
        </button>
      </div>
    </div>
  );
}
