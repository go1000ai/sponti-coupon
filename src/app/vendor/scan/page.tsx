'use client';

import { useState } from 'react';
import { QrCode, CheckCircle2, XCircle, Camera, Keyboard } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface RedemptionResult {
  success: boolean;
  error?: string;
  code?: string;
  customer?: { name: string; email: string };
  deal?: { title: string; deal_price: number; original_price: number; discount_percentage: number };
  redeemed_at?: string;
}

export default function ScanPage() {
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');

  const extractQrCode = (input: string): string => {
    // Support full URL or just the UUID
    const match = input.match(/redeem\/([a-f0-9-]{36})/i);
    if (match) return match[1];
    // If it looks like a UUID, use directly
    if (/^[a-f0-9-]{36}$/i.test(input.trim())) return input.trim();
    return input.trim();
  };

  const handleRedeem = async () => {
    if (!qrInput.trim()) return;
    setScanning(true);
    setResult(null);

    const qrCode = extractQrCode(qrInput);

    try {
      const response = await fetch(`/api/redeem/${qrCode}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          customer: data.customer,
          deal: data.deal,
          redeemed_at: data.redeemed_at,
        });
      } else {
        setResult({
          success: false,
          error: data.error,
          code: data.code,
        });
      }
    } catch {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      });
    }

    setScanning(false);
  };

  const resetScanner = () => {
    setQrInput('');
    setResult(null);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex bg-primary-50 rounded-full p-4 mb-4">
          <QrCode className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-3xl font-bold text-secondary-500">Scan QR Code</h1>
        <p className="text-gray-500 mt-2">Scan or enter a customer&apos;s QR code to redeem their deal</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6 justify-center">
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'manual' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Keyboard className="w-4 h-4" /> Manual Entry
        </button>
        <button
          onClick={() => setMode('camera')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'camera' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Camera className="w-4 h-4" /> Camera
        </button>
      </div>

      {!result && (
        <div className="card p-6">
          {mode === 'manual' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code or Redemption URL
                </label>
                <input
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  className="input-field"
                  placeholder="Enter QR code UUID or paste full URL"
                  onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                />
              </div>
              <button
                onClick={handleRedeem}
                disabled={scanning || !qrInput.trim()}
                className="btn-primary w-full"
              >
                {scanning ? 'Verifying...' : 'Redeem QR Code'}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Camera scanning requires a native QR scanner app.
                Point your camera at the QR code, then paste the URL here.
              </p>
              <div className="mt-4">
                <input
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  className="input-field"
                  placeholder="Paste scanned URL here"
                />
                <button
                  onClick={handleRedeem}
                  disabled={scanning || !qrInput.trim()}
                  className="btn-primary w-full mt-3"
                >
                  {scanning ? 'Verifying...' : 'Redeem'}
                </button>
              </div>
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
                  <p className="text-gray-700">{result.customer.name}</p>
                  <p className="text-gray-500 text-sm">{result.customer.email}</p>
                </div>
              )}

              {result.deal && (
                <div className="bg-gray-50 rounded-lg p-4 mt-3 text-left">
                  <h3 className="font-semibold text-secondary-500 mb-2">Deal</h3>
                  <p className="text-gray-700 font-medium">{result.deal.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 line-through text-sm">
                      {formatCurrency(result.deal.original_price)}
                    </span>
                    <span className="text-primary-500 font-bold">
                      {formatCurrency(result.deal.deal_price)}
                    </span>
                    <span className="text-sm text-green-600">
                      ({formatPercentage(result.deal.discount_percentage)} off)
                    </span>
                  </div>
                </div>
              )}

              <button onClick={resetScanner} className="btn-primary w-full mt-6">
                Scan Next QR Code
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex bg-red-50 rounded-full p-4 mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                {result.code === 'EXPIRED' ? 'QR Code Expired' :
                 result.code === 'ALREADY_REDEEMED' ? 'Already Redeemed' :
                 result.code === 'INVALID' ? 'Invalid QR Code' :
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
