'use client';

import { useState, useRef } from 'react';
import { QrCode, CheckCircle2, XCircle, Camera, DollarSign, Hash } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface RedemptionResult {
  success: boolean;
  error?: string;
  code?: string;
  customer?: { name: string; email: string };
  deal?: {
    title: string;
    deal_type: string;
    deal_price: number;
    original_price: number;
    discount_percentage: number;
    deposit_amount: number | null;
  };
  remaining_balance?: number;
  redeemed_at?: string;
}

export default function ScanPage() {
  const [codeInput, setCodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RedemptionResult | null>(null);
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
      setTimeout(() => handleRedeem(fullCode), 200);
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
      setTimeout(() => handleRedeem(pasted), 200);
    }
  };

  const handleRedeem = async (codeOverride?: string) => {
    const code = codeOverride || (mode === 'code' ? digits.join('') : extractCode(codeInput));
    if (!code || (mode === 'code' && code.length !== 6)) return;

    setScanning(true);
    setResult(null);

    try {
      const response = await fetch(`/api/redeem/${code}`, { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          customer: data.customer,
          deal: data.deal,
          remaining_balance: data.remaining_balance,
          redeemed_at: data.redeemed_at,
        });
      } else {
        setResult({ success: false, error: data.error, code: data.code });
      }
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    }

    setScanning(false);
  };

  const resetScanner = () => {
    setCodeInput('');
    setDigits(['', '', '', '', '', '']);
    setResult(null);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex bg-primary-50 rounded-full p-4 mb-4">
          <QrCode className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-3xl font-bold text-secondary-500">Redeem Deal</h1>
        <p className="text-gray-500 mt-2">Enter the customer&apos;s 6-digit code or scan their QR code</p>
      </div>

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

      {!result && (
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
                onClick={() => handleRedeem()}
                disabled={scanning || digits.join('').length !== 6}
                className="btn-primary w-full"
              >
                {scanning ? 'Verifying...' : 'Redeem Code'}
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
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={() => handleRedeem()}
                disabled={scanning || !codeInput.trim()}
                className="btn-primary w-full"
              >
                {scanning ? 'Verifying...' : 'Redeem QR Code'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card p-8">
          {result.success ? (
            <div className="text-center">
              <div className="inline-flex bg-green-50 rounded-full p-4 mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Redemption Successful!</h2>

              {result.customer && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
                  <h3 className="font-semibold text-secondary-500 mb-2">Customer</h3>
                  <p className="text-gray-700">{result.customer.name || 'Customer'}</p>
                  <p className="text-gray-500 text-sm">{result.customer.email}</p>
                </div>
              )}

              {result.deal && (
                <div className="bg-gray-50 rounded-lg p-4 mt-3 text-left">
                  <h3 className="font-semibold text-secondary-500 mb-2">Deal</h3>
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
                </div>
              )}

              {/* Remaining Balance when deposit was collected */}
              {result.deal?.deposit_amount != null && result.deal.deposit_amount > 0 && (
                <div className="bg-gradient-to-br from-primary-50 to-orange-50 border-2 border-primary-200 rounded-xl p-5 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-primary-500" />
                    <h3 className="font-bold text-secondary-500">Payment Summary</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deal Price</span>
                      <span className="font-medium">{formatCurrency(result.deal.deal_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deposit Already Paid</span>
                      <span className="font-medium text-green-600">&minus; {formatCurrency(result.deal.deposit_amount)}</span>
                    </div>
                    <div className="border-t border-primary-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-secondary-500 text-base">Remaining Balance</span>
                        <span className="font-bold text-primary-500 text-xl">{formatCurrency(result.remaining_balance || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Collect {formatCurrency(result.remaining_balance || 0)} from the customer to complete this transaction.
                  </p>
                </div>
              )}

              {/* No deposit collected */}
              {(!result.deal?.deposit_amount || result.deal.deposit_amount === 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                  <p className="text-sm text-blue-700 font-medium">
                    No deposit was collected. Customer pays the full deal price of{' '}
                    <span className="font-bold">{formatCurrency(result.deal?.deal_price || 0)}</span> directly.
                  </p>
                </div>
              )}

              <button onClick={resetScanner} className="btn-primary w-full mt-6">
                Redeem Next Code
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex bg-red-50 rounded-full p-4 mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                {result.code === 'EXPIRED' ? 'Code Expired' :
                 result.code === 'ALREADY_REDEEMED' ? 'Already Redeemed' :
                 result.code === 'INVALID' ? 'Invalid Code' :
                 result.code === 'WRONG_VENDOR' ? 'Wrong Vendor' :
                 result.code === 'NO_DEPOSIT' ? 'Deposit Not Confirmed' :
                 'Redemption Failed'}
              </h2>
              <p className="text-gray-600">{result.error}</p>
              <button onClick={resetScanner} className="btn-primary w-full mt-6">
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
