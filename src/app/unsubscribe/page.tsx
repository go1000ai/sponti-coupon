'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const token = searchParams.get('token');
  const done = searchParams.get('done');

  const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error'>(
    done === '1' ? 'success' : 'confirm'
  );
  const [processing, setProcessing] = useState(false);

  // If arrived via GET redirect (done=1), already unsubscribed
  useEffect(() => {
    if (done === '1') {
      setStatus('success');
    }
  }, [done]);

  const handleUnsubscribe = async () => {
    if (!id || !token) {
      setStatus('error');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  if (!id || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500">This unsubscribe link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === 'confirm' && (
          <>
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribe</h1>
            <p className="text-gray-500 mb-6">
              Are you sure you want to stop receiving review request emails from SpontiCoupon?
            </p>
            <p className="text-sm text-gray-400 mb-6">
              You&apos;ll still be able to use SpontiCoupon and redeem deals — you just won&apos;t receive
              emails asking for reviews.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={processing}
              className="w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {processing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                'Yes, Unsubscribe Me'
              )}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Changed your mind? Just close this page.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Unsubscribed</h1>
            <p className="text-gray-500 mb-4">
              You won&apos;t receive any more review request emails from SpontiCoupon.
            </p>
            <p className="text-sm text-gray-400">
              If you change your mind, you can re-enable review emails in your
              <a href="/dashboard/settings" className="text-orange-500 hover:underline ml-1">account settings</a>.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-gray-500 mb-4">
              We couldn&apos;t process your unsubscribe request. The link may be invalid or expired.
            </p>
            <p className="text-sm text-gray-400">
              Need help? Contact us at{' '}
              <a href="mailto:support@sponticoupon.com" className="text-orange-500 hover:underline">
                support@sponticoupon.com
              </a>
            </p>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-lg font-extrabold">
              <span className="text-orange-500">Sponti</span>
              <span className="text-gray-900">Coupon</span>
            </span>
          </div>
          <p className="text-xs text-gray-300 mt-2">
            &copy; {new Date().getFullYear()} SpontiCoupon. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
