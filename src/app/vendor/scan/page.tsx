'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  QrCode, CheckCircle2, XCircle, Camera, DollarSign, Hash,
  CreditCard, AlertCircle, Loader2, Star, Sparkles, ArrowLeft, ExternalLink, Copy, Check,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  square: 'Square',
  paypal: 'PayPal',
};

interface PreviewData {
  code: string;
  status: 'valid' | 'redeemed' | 'expired';
  claim: {
    id: string;
    redeemed: boolean;
    redeemed_at: string | null;
    expires_at: string;
    deposit_confirmed: boolean;
    payment_method_type: string | null;
    payment_tier: string | null;
    customer_id: string;
    deal: {
      id?: string;
      title: string;
      deal_price: number;
      original_price: number;
      discount_percentage: number;
      deposit_amount: number | null;
      deal_type: string;
      vendor: { business_name: string };
    };
    remaining_balance: number;
  };
  customer?: { name: string; email: string | null };
}

interface RedemptionResult {
  success: boolean;
  error?: string;
  code?: string;
  redemption_id?: string;
  customer?: { name: string; email: string };
  deal?: {
    title: string;
    deal_type: string;
    deal_price: number;
    original_price: number;
    discount_percentage: number;
    deposit_amount: number | null;
  };
  payment_method_type?: string | null;
  payment_tier?: string | null;
  remaining_balance?: number;
  redeemed_at?: string;
  loyalty?: { program_type: string; program_name: string; earned: string; current: string } | null;
  loyalty_awards?: { program_type: string; program_name: string; earned: string; current: string }[];
  sponti_points?: { earned: number; balance: number; message: string } | null;
}

type Step = 'input' | 'preview' | 'success' | 'collected';

export default function ScanPage() {
  const { t } = useLanguage();
  const [codeInput, setCodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [error, setError] = useState<RedemptionResult | null>(null);
  const [mode, setMode] = useState<'code' | 'qr'>('code');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stripePaid, setStripePaid] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null); // null = loading
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerContainerId = 'qr-reader';

  // Start/stop camera scanner when mode changes
  useEffect(() => {
    if (mode === 'qr' && step === 'input') {
      setCameraError(null);
      // Small delay to let the DOM element render
      const timer = setTimeout(() => {
        const el = document.getElementById(scannerContainerId);
        if (!el) return;

        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // QR decoded — stop scanner and auto-verify
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            const code = extractCodeFromText(decodedText);
            setCodeInput(code);
            // Auto-verify after setting code
            handleVerifyCode(code);
          },
          () => { /* ignore scan failures (no QR in frame yet) */ }
        ).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
            setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
          } else if (msg.includes('NotFoundError')) {
            setCameraError('No camera found on this device.');
          } else {
            setCameraError('Could not start camera. Try pasting the QR URL below instead.');
          }
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current = null;
        }
      };
    } else {
      // Stop scanner when leaving QR mode
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const extractCodeFromText = (input: string): string => {
    const match = input.match(/redeem\/([a-f0-9-]{36})/i);
    if (match) return match[1];
    if (/^[a-f0-9-]{36}$/i.test(input.trim())) return input.trim();
    if (/^\d{6}$/.test(input.trim())) return input.trim();
    return input.trim();
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  // Called by QR scanner callback to auto-verify scanned code
  const handleVerifyCode = (code: string) => {
    handleVerify(code);
  };

  // Step 1 → Step 2: Verify code (GET - no redemption yet)
  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride || (mode === 'code' ? digits.join('') : extractCodeFromText(codeInput));
    if (!code || (mode === 'code' && code.length !== 6)) return;

    setScanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/redeem/${code}`);
      const data = await response.json();

      if (!response.ok) {
        setError({ success: false, error: data.error, code: data.code });
        setStep('input');
        setScanning(false);
        return;
      }

      if (data.status === 'redeemed') {
        setError({ success: false, error: 'This code has already been redeemed', code: 'ALREADY_REDEEMED' });
        setStep('input');
        setScanning(false);
        return;
      }

      if (data.status === 'expired') {
        setError({ success: false, error: 'This code has expired', code: 'EXPIRED' });
        setStep('input');
        setScanning(false);
        return;
      }

      setPreview({ ...data, code });
      setStep('preview');
    } catch {
      setError({ success: false, error: 'Network error. Please try again.' });
    }

    setScanning(false);
  };

  // Step 2 → Step 3: Confirm redemption (POST)
  const handleConfirmRedeem = async () => {
    if (!preview) return;
    setConfirming(true);

    try {
      const response = await fetch(`/api/redeem/${preview.code}`, { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          redemption_id: data.redemption_id,
          customer: data.customer,
          deal: data.deal,
          payment_method_type: data.payment_method_type,
          payment_tier: data.payment_tier,
          remaining_balance: data.remaining_balance,
          redeemed_at: data.redeemed_at,
          loyalty: data.loyalty,
          loyalty_awards: data.loyalty_awards,
          sponti_points: data.sponti_points,
        });
        setStep('success');
      } else {
        setError({ success: false, error: data.error, code: data.code });
        setStep('input');
      }
    } catch {
      setError({ success: false, error: 'Network error. Please try again.' });
      setStep('input');
    }

    setConfirming(false);
  };

  // Step 3 → Step 4: Mark collection complete
  const handleMarkCollected = async () => {
    setCollecting(true);

    // Fire-and-forget tracking (non-critical)
    if (result?.redemption_id) {
      try {
        await fetch('/api/vendor/mark-collected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redemption_id: result.redemption_id,
            amount_collected: result.remaining_balance || result.deal?.deal_price || 0,
          }),
        });
      } catch {
        // Non-critical — proceed regardless
      }
    }

    setCollecting(false);
    setStep('collected');
  };

  // Cancel redemption — undo everything and restore the claim
  const handleCancelRedemption = async () => {
    if (!result?.redemption_id) return;
    setCancelling(true);

    try {
      const response = await fetch('/api/vendor/cancel-redemption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemption_id: result.redemption_id }),
      });
      const data = await response.json();

      if (response.ok) {
        setCancelMessage('Redemption cancelled. The customer\'s code has been restored.');
        setShowCancelConfirm(false);
        // Reset to input after a brief pause so the vendor sees the message
        setTimeout(() => {
          resetScanner();
          setCancelMessage(null);
        }, 2500);
      } else {
        setShowCancelConfirm(false);
        setLinkError(data.error || 'Failed to cancel redemption');
      }
    } catch {
      setShowCancelConfirm(false);
      setLinkError('Network error. Please try again.');
    }

    setCancelling(false);
  };

  const handleGeneratePaymentLink = async () => {
    if (!result) return;
    setGeneratingLink(true);
    setLinkError(null);

    const amount = result.remaining_balance || 0;

    try {
      const response = await fetch('/api/vendor/collect-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemption_id: result.redemption_id,
          amount,
          deal_title: result.deal?.title,
          customer_name: result.customer?.name,
        }),
      });
      const data = await response.json();
      if (response.ok && data.checkout_url) {
        setPaymentLink(data.checkout_url);
        setSessionId(data.session_id || null);
      } else {
        setLinkError(data.error || 'Failed to generate payment link');
      }
    } catch {
      setLinkError('Network error. Please try again.');
    }
    setGeneratingLink(false);
  };

  const handleCopyLink = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetScanner = () => {
    setCodeInput('');
    setDigits(['', '', '', '', '', '']);
    setPreview(null);
    setResult(null);
    setError(null);
    setPaymentLink(null);
    setSessionId(null);
    setLinkError(null);
    setStripePaid(false);
    setShowCancelConfirm(false);
    setCancelling(false);
    setStep('input');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  // Check once on mount whether this vendor has Stripe Connect active
  useEffect(() => {
    fetch('/api/stripe/connect/status')
      .then(r => r.json())
      .then(d => setStripeEnabled(d.charges_enabled === true))
      .catch(() => setStripeEnabled(false));
  }, []);

  // Poll Stripe every 3 seconds after link is sent to auto-confirm when customer pays
  const handleStripePaid = useCallback(async () => {
    setStripePaid(true);
    await handleMarkCollected();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionId || stripePaid || step !== 'success') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/vendor/collect-balance/status?session_id=${sessionId}`);
        const data = await res.json();
        if (data.paid) {
          clearInterval(interval);
          handleStripePaid();
        }
      } catch {
        // ignore transient errors, keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, stripePaid, step, handleStripePaid]);

  const paymentLabel = (type: string | null | undefined) =>
    type ? PAYMENT_METHOD_LABELS[type] || type : null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex bg-primary-50 rounded-full p-4 mb-4">
          <QrCode className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t('vendor.scan.redeemDeal')}</h1>
        <p className="text-gray-500 mt-2">{t('vendor.scan.enterCode')}</p>
      </div>

      {/* ═══ STEP 1: INPUT ═══ */}
      {step === 'input' && (
        <>
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 justify-center">
            <button
              onClick={() => { setMode('code'); resetScanner(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'code' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Hash className="w-4 h-4" /> {t('vendor.scan.sixDigitCode')}
            </button>
            <button
              onClick={() => { setMode('qr'); resetScanner(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'qr' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Camera className="w-4 h-4" /> {t('vendor.scan.qrCodeUrl')}
            </button>
          </div>

          {/* Error from previous attempt */}
          {error && (
            <div className="card p-6 mb-4 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-600">
                    {error.code === 'EXPIRED' ? t('vendor.scan.codeExpired') :
                     error.code === 'ALREADY_REDEEMED' ? t('vendor.scan.alreadyRedeemedTitle') :
                     error.code === 'INVALID' ? t('vendor.scan.invalidCodeTitle') :
                     error.code === 'WRONG_VENDOR' ? t('vendor.scan.wrongVendor') :
                     error.code === 'NO_DEPOSIT' ? t('vendor.scan.noDeposit') :
                     t('vendor.scan.verificationFailed')}
                  </h3>
                  <p className="text-sm text-red-500 mt-1">{error.error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="card p-6">
            {mode === 'code' ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  {t('vendor.scan.enterCustomerCode')}
                </label>
                <div className="flex justify-center gap-2" onPaste={handleDigitPaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleVerify()}
                  disabled={scanning || digits.join('').length !== 6}
                  className="btn-primary w-full"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('vendor.scan.verifying')}
                    </span>
                  ) : t('vendor.scan.verifyCode')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Camera viewfinder */}
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <div id={scannerContainerId} className="w-full" style={{ minHeight: 280 }} />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
                    <p className="font-medium mb-1">{t('vendor.scan.cameraUnavailable')}</p>
                    <p className="text-xs">{cameraError}</p>
                    <p className="text-xs mt-2 font-medium">{t('vendor.scan.useSixDigitTab')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ STEP 2: PREVIEW / CONFIRMATION ═══ */}
      {step === 'preview' && preview && (
        <div className="card p-6">
          <div className="text-center mb-5">
            <div className="inline-flex bg-amber-50 rounded-full p-3 mb-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t('vendor.scan.confirmRedemptionTitle')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('vendor.scan.reviewBeforeRedeeming')}</p>
          </div>

          {/* Customer Info */}
          {preview.customer && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">
                  {preview.customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{preview.customer.name}</p>
                {preview.customer.email && (
                  <p className="text-xs text-gray-500 truncate">{preview.customer.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Deal Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {preview.claim.deal.deal_type === 'sponti_coupon' && (
                <span className="bg-primary-50 text-primary-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <SpontiIcon className="w-3 h-3" /> Sponti
                </span>
              )}
              <p className="text-gray-700 font-semibold">{preview.claim.deal.title}</p>
            </div>
            {preview.claim.deal.id && (
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                Deal Ref: #{(preview.claim.deal.id as string).slice(0, 8).toUpperCase()}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-400 line-through text-sm">{formatCurrency(preview.claim.deal.original_price)}</span>
              <span className="text-primary-500 font-bold text-lg">{formatCurrency(preview.claim.deal.deal_price)}</span>
              <span className="text-sm text-green-600">({formatPercentage(preview.claim.deal.discount_percentage)} off)</span>
            </div>
          </div>

          {/* Payment Method */}
          {preview.claim.payment_method_type && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {t('vendor.scan.depositPaidVia', { method: paymentLabel(preview.claim.payment_method_type) || '' })}
                </span>
                {preview.claim.payment_tier && (
                  <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                    {preview.claim.payment_tier}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-gradient-to-br from-primary-50 to-orange-50 border-2 border-primary-200 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-gray-900">{t('vendor.scan.paymentSummary')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('vendor.scan.dealPrice')}</span>
                <span className="font-medium">{formatCurrency(preview.claim.deal.deal_price)}</span>
              </div>
              {preview.claim.deal.deposit_amount != null && preview.claim.deal.deposit_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('vendor.scan.depositPaid')}</span>
                  <span className="font-medium text-green-600">&minus; {formatCurrency(preview.claim.deal.deposit_amount)}</span>
                </div>
              )}
              <div className="border-t border-primary-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900 text-base">
                    {preview.claim.remaining_balance > 0 ? t('vendor.scan.toCollect') : t('vendor.scan.total')}
                  </span>
                  <span className="font-bold text-primary-500 text-xl">
                    {formatCurrency(preview.claim.remaining_balance > 0 ? preview.claim.remaining_balance : preview.claim.deal.deal_price)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirmRedeem}
              disabled={confirming}
              className="btn-primary w-full py-3 text-base font-bold"
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> {t('vendor.scan.redeeming')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> {t('vendor.scan.confirmRedeem')}
                </span>
              )}
            </button>
            <button
              onClick={resetScanner}
              disabled={confirming}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t('vendor.scan.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: SUCCESS ═══ */}
      {step === 'success' && result?.success && (
        <div className="card p-8">
          <div className="text-center">
            <div className="inline-flex bg-green-50 rounded-full p-4 mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">{t('vendor.scan.redemptionSuccessful')}</h2>

            {result.customer && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">{t('vendor.scan.customer')}</h3>
                <p className="text-gray-700">{result.customer.name || 'Customer'}</p>
                <p className="text-gray-500 text-sm">{result.customer.email}</p>
              </div>
            )}

            {result.deal && (
              <div className="bg-gray-50 rounded-lg p-4 mt-3 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">{t('vendor.scan.deal')}</h3>
                <div className="flex items-center gap-2 mb-1">
                  {result.deal.deal_type === 'sponti_coupon' && (
                    <span className="bg-primary-50 text-primary-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <SpontiIcon className="w-3 h-3" /> Sponti
                    </span>
                  )}
                  <p className="text-gray-700 font-medium">{result.deal.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-400 line-through text-sm">{formatCurrency(result.deal.original_price)}</span>
                  <span className="text-primary-500 font-bold">{formatCurrency(result.deal.deal_price)}</span>
                  <span className="text-sm text-green-600">({formatPercentage(result.deal.discount_percentage)} off)</span>
                </div>
                {result.payment_method_type && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> {t('vendor.scan.depositVia', { method: paymentLabel(result.payment_method_type) || '' })}
                  </p>
                )}
              </div>
            )}

            {/* Loyalty Awards */}
            {result.loyalty_awards && result.loyalty_awards.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-blue-700 text-sm">{t('vendor.scan.loyaltyRewards')}</h3>
                </div>
                {result.loyalty_awards.map((award, i) => (
                  <div key={i} className="flex justify-between text-sm mt-1">
                    <span className="text-blue-600">{award.program_name}</span>
                    <span className="font-medium text-blue-700">{award.earned} ({award.current})</span>
                  </div>
                ))}
              </div>
            )}

            {/* SpontiPoints */}
            {result.sponti_points && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">
                    {t('vendor.scan.customerEarnedPoints', { earned: String(result.sponti_points.earned), balance: String(result.sponti_points.balance) })}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Summary + Collection */}
            <div className="bg-gradient-to-br from-primary-50 to-orange-50 border-2 border-primary-200 rounded-xl p-5 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-gray-900">{t('vendor.scan.paymentSummary')}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('vendor.scan.dealPrice')}</span>
                  <span className="font-medium">{formatCurrency(result.deal?.deal_price || 0)}</span>
                </div>
                {result.deal?.deposit_amount != null && result.deal.deposit_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('vendor.scan.depositPaid')}</span>
                    <span className="font-medium text-green-600">&minus; {formatCurrency(result.deal.deposit_amount)}</span>
                  </div>
                )}
                <div className="border-t border-primary-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 text-base">
                      {(result.remaining_balance || 0) > 0 ? t('vendor.scan.collectFromCustomer') : t('vendor.scan.paidInFullLabel')}
                    </span>
                    <span className={`font-bold text-xl ${(result.remaining_balance || 0) > 0 ? 'text-primary-500' : 'text-green-600'}`}>
                      {formatCurrency(result.remaining_balance || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Collection Options */}
            <div className="mt-5 space-y-3">
              {(result.remaining_balance || 0) === 0 && (
                <button
                  onClick={handleMarkCollected}
                  disabled={collecting}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {t('vendor.scan.paidInFullComplete')}
                  </span>
                </button>
              )}
              {(result.remaining_balance || 0) > 0 && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                {t('vendor.scan.howCustomerPaying')}
              </p>
              )}

              {/* Option A & B — only shown when a balance is actually owed */}
              {(result.remaining_balance || 0) > 0 && stripeEnabled === false ? (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400">
                    {t('vendor.scan.stripeNotConnected')}{' '}
                    <a href="/vendor/settings" className="text-blue-500 hover:underline">
                      {t('vendor.scan.setupStripeConnect')}
                    </a>{' '}
                    {t('vendor.scan.toOfferCardLinks')}
                  </p>
                </div>
              ) : (result.remaining_balance || 0) > 0 && stripePaid ? (
                <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-green-700 text-sm">{t('vendor.scan.stripePaymentReceived')}</p>
                  <p className="text-xs text-green-600 mt-1">{t('vendor.scan.customerPaidComplete')}</p>
                </div>
              ) : (result.remaining_balance || 0) > 0 && !paymentLink ? (
                <button
                  onClick={handleGeneratePaymentLink}
                  disabled={generatingLink}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {generatingLink ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('vendor.scan.generatingLink')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CreditCard className="w-4 h-4" /> {t('vendor.scan.customerPaysViaStripe')}
                    </span>
                  )}
                </button>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-xs font-semibold text-blue-700">{t('vendor.scan.waitingForPayment')}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={paymentLink ?? ''}
                      className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-gray-600 truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 transition-colors"
                      title="Copy link"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <a
                    href={paymentLink ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> {t('vendor.scan.openOnCustomerPhone')}
                  </a>
                  <p className="text-[11px] text-blue-500 text-center">
                    {t('vendor.scan.autoUpdateMessage')}
                  </p>
                </div>
              )}

              {linkError && (
                <p className="text-xs text-red-500 text-center">{linkError}</p>
              )}

              {/* Option B: Collect In Person (only when balance owed and Stripe not yet paid) */}
              {(result.remaining_balance || 0) > 0 && !stripePaid && (
                <button
                  onClick={handleMarkCollected}
                  disabled={collecting || cancelling}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {collecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('vendor.scan.recording')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {t('vendor.scan.collectedInPersonDone')}
                    </span>
                  )}
                </button>
              )}

              {/* Cancel Redemption — only when balance owed, no Stripe payment, no in-person collection */}
              {(result.remaining_balance || 0) > 0 && !stripePaid && (
                <>
                  {cancelMessage ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <p className="text-sm font-medium text-amber-700">{cancelMessage}</p>
                    </div>
                  ) : !showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={collecting || cancelling}
                      className="w-full py-2.5 border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 text-sm font-medium rounded-xl transition-colors"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> {t('vendor.scan.cancelRedemption')}
                      </span>
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm text-red-700 font-medium text-center">
                        {t('vendor.scan.cancelConfirmMessage')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancelRedemption}
                          disabled={cancelling}
                          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          {cancelling ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> {t('vendor.scan.cancelling')}
                            </span>
                          ) : t('vendor.scan.yesCancel')}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={cancelling}
                          className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition-colors"
                        >
                          {t('vendor.scan.noKeepIt')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={resetScanner}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
            >
              {t('vendor.scan.redeemNextCode')}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: COLLECTED ═══ */}
      {step === 'collected' && (
        <div className="card p-8">
          <div className="text-center">
            <div className="inline-flex bg-green-50 rounded-full p-4 mb-4">
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">{t('vendor.scan.transactionComplete')}</h2>
            <p className="text-gray-500 mt-1">{t('vendor.scan.paymentCollectedRecorded')}</p>

            {result?.deal && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('vendor.scan.deal')}</span>
                    <span className="font-medium">{result.deal.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('vendor.scan.customer')}</span>
                    <span className="font-medium">{result.customer?.name || t('vendor.scan.customer')}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900">{t('vendor.scan.totalCollected')}</span>
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrency(result.deal.deal_price)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={resetScanner} className="btn-primary w-full mt-6">
              {t('vendor.scan.redeemNextCode')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
