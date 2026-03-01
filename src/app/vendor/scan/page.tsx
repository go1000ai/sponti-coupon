'use client';

import { useState, useRef } from 'react';
import {
  QrCode, CheckCircle2, XCircle, Camera, DollarSign, Hash,
  CreditCard, AlertCircle, Loader2, Star, Sparkles, ArrowLeft,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { formatCurrency, formatPercentage } from '@/lib/utils';

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
  // Customer info from GET (not available yet, will be shown after POST)
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

  const extractCode = (input: string): string => {
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

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      setTimeout(() => handleVerify(fullCode), 200);
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
      setTimeout(() => handleVerify(pasted), 200);
    }
  };

  // Step 1 → Step 2: Verify code (GET - no redemption yet)
  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride || (mode === 'code' ? digits.join('') : extractCode(codeInput));
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
    if (!result?.redemption_id) return;
    setCollecting(true);

    const amountToCollect = result.remaining_balance || result.deal?.deal_price || 0;

    try {
      const response = await fetch('/api/vendor/mark-collected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemption_id: result.redemption_id,
          amount_collected: amountToCollect,
        }),
      });

      if (response.ok) {
        setStep('collected');
      }
    } catch {
      // Silently fail — collection tracking is non-critical
    }

    setCollecting(false);
  };

  const resetScanner = () => {
    setCodeInput('');
    setDigits(['', '', '', '', '', '']);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep('input');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const paymentLabel = (type: string | null | undefined) =>
    type ? PAYMENT_METHOD_LABELS[type] || type : null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex bg-primary-50 rounded-full p-4 mb-4">
          <QrCode className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Redeem Deal</h1>
        <p className="text-gray-500 mt-2">Enter the customer&apos;s 6-digit code or scan their QR code</p>
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
              <Hash className="w-4 h-4" /> 6-Digit Code
            </button>
            <button
              onClick={() => { setMode('qr'); resetScanner(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'qr' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Camera className="w-4 h-4" /> QR Code / URL
            </button>
          </div>

          {/* Error from previous attempt */}
          {error && (
            <div className="card p-6 mb-4 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-600">
                    {error.code === 'EXPIRED' ? 'Code Expired' :
                     error.code === 'ALREADY_REDEEMED' ? 'Already Redeemed' :
                     error.code === 'INVALID' ? 'Invalid Code' :
                     error.code === 'WRONG_VENDOR' ? 'Wrong Vendor' :
                     error.code === 'NO_DEPOSIT' ? 'Deposit Not Confirmed' :
                     'Verification Failed'}
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
                  Enter the customer&apos;s 6-digit redemption code
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </span>
                  ) : 'Verify Code'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code or Redemption URL
                </label>
                <input
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  className="input-field"
                  placeholder="Enter QR code UUID or paste full URL"
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
                <button
                  onClick={() => handleVerify()}
                  disabled={scanning || !codeInput.trim()}
                  className="btn-primary w-full"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </span>
                  ) : 'Verify QR Code'}
                </button>
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
            <h2 className="text-xl font-bold text-gray-900">Confirm Redemption</h2>
            <p className="text-sm text-gray-500 mt-1">Review the details before redeeming</p>
          </div>

          {/* Deal Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-1">
              {preview.claim.deal.deal_type === 'sponti_coupon' && (
                <span className="bg-primary-50 text-primary-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <SpontiIcon className="w-3 h-3" /> Sponti
                </span>
              )}
              <p className="text-gray-700 font-semibold">{preview.claim.deal.title}</p>
            </div>
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
                  Deposit paid via {paymentLabel(preview.claim.payment_method_type)}
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
              <h3 className="font-bold text-gray-900">Payment Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Deal Price</span>
                <span className="font-medium">{formatCurrency(preview.claim.deal.deal_price)}</span>
              </div>
              {preview.claim.deal.deposit_amount != null && preview.claim.deal.deposit_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit Paid</span>
                  <span className="font-medium text-green-600">&minus; {formatCurrency(preview.claim.deal.deposit_amount)}</span>
                </div>
              )}
              <div className="border-t border-primary-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900 text-base">
                    {preview.claim.remaining_balance > 0 ? 'To Collect' : 'Total'}
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
                  <Loader2 className="w-5 h-5 animate-spin" /> Redeeming...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Confirm Redemption
                </span>
              )}
            </button>
            <button
              onClick={resetScanner}
              disabled={confirming}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel
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
            <h2 className="text-2xl font-bold text-green-600 mb-2">Redemption Successful!</h2>

            {result.customer && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                <p className="text-gray-700">{result.customer.name || 'Customer'}</p>
                <p className="text-gray-500 text-sm">{result.customer.email}</p>
              </div>
            )}

            {result.deal && (
              <div className="bg-gray-50 rounded-lg p-4 mt-3 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Deal</h3>
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
                    <CreditCard className="w-3 h-3" /> Deposit via {paymentLabel(result.payment_method_type)}
                  </p>
                )}
              </div>
            )}

            {/* Loyalty Awards */}
            {result.loyalty_awards && result.loyalty_awards.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-blue-700 text-sm">Loyalty Rewards</h3>
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
                    Customer earned {result.sponti_points.earned} SpontiPoints (Balance: {result.sponti_points.balance} pts)
                  </span>
                </div>
              </div>
            )}

            {/* Payment Summary + Collection */}
            <div className="bg-gradient-to-br from-primary-50 to-orange-50 border-2 border-primary-200 rounded-xl p-5 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-gray-900">Payment Summary</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Deal Price</span>
                  <span className="font-medium">{formatCurrency(result.deal?.deal_price || 0)}</span>
                </div>
                {result.deal?.deposit_amount != null && result.deal.deposit_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit Paid</span>
                    <span className="font-medium text-green-600">&minus; {formatCurrency(result.deal.deposit_amount)}</span>
                  </div>
                )}
                <div className="border-t border-primary-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 text-base">
                      {(result.remaining_balance || 0) > 0 ? 'Collect from Customer' : 'Amount to Collect'}
                    </span>
                    <span className="font-bold text-primary-500 text-xl">
                      {formatCurrency(
                        (result.remaining_balance || 0) > 0
                          ? result.remaining_balance!
                          : result.deal?.deal_price || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Complete Button */}
            <button
              onClick={handleMarkCollected}
              disabled={collecting}
              className="w-full mt-5 py-3 bg-green-500 hover:bg-green-600 text-white text-base font-bold rounded-xl transition-colors shadow-md shadow-green-200"
            >
              {collecting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Recording...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Collection Complete
                </span>
              )}
            </button>

            <button
              onClick={resetScanner}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-500 transition-colors"
            >
              Redeem Next Code
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
            <h2 className="text-2xl font-bold text-green-600 mb-2">Transaction Complete!</h2>
            <p className="text-gray-500 mt-1">Payment collected and recorded successfully.</p>

            {result?.deal && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deal</span>
                    <span className="font-medium">{result.deal.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer</span>
                    <span className="font-medium">{result.customer?.name || 'Customer'}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900">Total Collected</span>
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrency(result.deal.deal_price)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={resetScanner} className="btn-primary w-full mt-6">
              Redeem Next Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
