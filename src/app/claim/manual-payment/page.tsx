'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_PROCESSORS } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';
import type { Claim } from '@/lib/types/database';
import Image from 'next/image';
import {
  QrCode, CheckCircle2, Loader2, Copy, Check,
  Smartphone, ArrowRight, Send,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

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
  const { t } = useLanguage();
  const sessionToken = searchParams.get('session_token');
  const processorType = searchParams.get('processor') as PaymentProcessorType | null;
  const paymentInfo = searchParams.get('payment_info');
  const amount = searchParams.get('amount');
  const dealTitle = searchParams.get('deal_title');
  const paymentReference = searchParams.get('payment_reference');
  const qrCodeImageUrl = searchParams.get('qr_code_image_url');

  const [status, setStatus] = useState<'instructions' | 'confirming' | 'confirmed' | 'error'>('instructions');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ qr_code?: string; redemption_code?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const processor = processorType ? PAYMENT_PROCESSORS[processorType] : null;

  // Fetch claim data on load (for expiration timer)
  useEffect(() => {
    if (!sessionToken) return;
    const fetchClaim = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('claims')
        .select('*, deal:deals(title, expires_at)')
        .eq('session_token', sessionToken)
        .single();
      if (data) {
        setClaim(data);
        // If already confirmed (e.g. page refresh), show confirmed state
        if (data.deposit_confirmed && data.redemption_code) {
          setConfirmResult({ qr_code: data.qr_code, redemption_code: data.redemption_code });
          setStatus('confirmed');
        }
      }
    };
    fetchClaim();
  }, [sessionToken]);

  const handleConfirmSent = async () => {
    if (!sessionToken) return;
    setStatus('confirming');
    try {
      const res = await fetch('/api/claims/confirm-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmResult(data);
      setStatus('confirmed');
    } catch {
      setStatus('error');
    }
  };

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
          <h2 className="text-xl font-bold text-red-600 mb-2">{t('manualPaymentPage.somethingWentWrong')}</h2>
          <p className="text-gray-500 mb-4">{t('manualPaymentPage.couldntProcess')}</p>
          <button onClick={() => setStatus('instructions')} className="btn-outline mr-2">
            {t('manualPaymentPage.tryAgain')}
          </button>
          <button onClick={() => router.push('/dashboard/my-deals')} className="btn-primary">
            {t('manualPaymentPage.goToMyDeals')}
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
          <h2 className="text-2xl font-bold text-green-600 mb-2">{t('manualPaymentPage.allSet')}</h2>
          <p className="text-gray-500 mb-6">
            {t('manualPaymentPage.showCodeToVendor')}
          </p>

          {confirmResult?.qr_code && (
            <div className="bg-white border-4 border-secondary-500 rounded-xl p-6 inline-block mb-6">
              <QrCode className="w-40 h-40 text-gray-900" />
            </div>
          )}

          {confirmResult?.redemption_code && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 mb-1">{t('manualPaymentPage.redemptionCode')}</p>
              <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">{confirmResult.redemption_code}</p>
            </div>
          )}

          {(claim?.deal?.title || dealTitle) && (
            <p className="font-semibold text-gray-900 mb-2">{claim?.deal?.title || dealTitle}</p>
          )}

          {claim?.deal?.expires_at && (
            <div className="bg-primary-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary-600 font-medium mb-2">{t('manualPaymentPage.redeemBefore')}</p>
              <CountdownTimer expiresAt={claim.deal.expires_at} size="md" variant="sponti" />
            </div>
          )}

          <button onClick={() => router.push('/dashboard/my-deals')} className="btn-primary w-full">
            {t('manualPaymentPage.viewMyDeals')}
          </button>
        </div>
      </div>
    );
  }

  // Instructions state + "I've Sent Payment" button
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="card p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex bg-primary-50 rounded-full p-3 mb-3">
            <Smartphone className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('manualPaymentPage.completePayment')}</h2>
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
              <p className="font-semibold text-gray-900">{t('manualPaymentPage.sendPayment')}</p>
            </div>
            {amount && (
              <div className="text-center py-3">
                <p className="text-3xl font-bold text-primary-500">{formatCurrency(parseFloat(amount))}</p>
                <p className="text-sm text-gray-400 mt-1">{t('manualPaymentPage.amountToSend')}</p>
              </div>
            )}
          </div>

          {/* Step 2: Pay via processor — show QR code if available */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">2</div>
              <p className="font-semibold text-gray-900">
                {t('manualPaymentPage.payVia', { name: processor?.name || 'the vendor' })}
              </p>
            </div>

            {/* Vendor QR Code Image */}
            {qrCodeImageUrl && (
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-xl border-2 border-gray-200 p-3">
                  <Image
                    src={qrCodeImageUrl}
                    alt={`${processor?.name || 'Payment'} QR Code`}
                    width={200}
                    height={200}
                    className="object-contain"
                  />
                  <p className="text-xs text-gray-400 text-center mt-2">{t('manualPaymentPage.scanToPay', { name: processor?.name || '' })}</p>
                </div>
              </div>
            )}

            {paymentInfo && (
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                {processor && (
                  <Image
                    src={processor.logo}
                    alt={processor.name}
                    width={32}
                    height={32}
                    className="object-contain shrink-0"
                  />
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
                <p className="font-semibold text-gray-900">{t('manualPaymentPage.includeRefCode')}</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {t('manualPaymentPage.refCodeInstructions')}
              </p>
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg p-4 border-2 border-primary-300">
                <p className="text-2xl font-mono font-bold text-primary-600 tracking-widest">{paymentReference}</p>
                <button
                  onClick={handleCopyRef}
                  className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors shrink-0"
                  title={t('manualPaymentPage.copyRefCode')}
                >
                  {copiedRef ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* "I've Sent Payment" button */}
        <button
          onClick={handleConfirmSent}
          disabled={status === 'confirming'}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-xl transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50"
        >
          {status === 'confirming' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('manualPaymentPage.confirming')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {t('manualPaymentPage.iveSentPayment')}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-2">
          {t('manualPaymentPage.makeSureCompleted')}
        </p>

        {/* Claim expiration */}
        {claim?.expires_at && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">{t('manualPaymentPage.dealExpiresIn')}</p>
            <CountdownTimer expiresAt={claim.expires_at} size="sm" variant="sponti" />
          </div>
        )}

        {/* Fallback button */}
        <button
          onClick={() => router.push('/dashboard/my-deals')}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
        >
          {t('manualPaymentPage.checkLater')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
