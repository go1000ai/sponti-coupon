'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, QrCode, Zap } from 'lucide-react';

interface RedemptionStatus {
  status: 'valid' | 'redeemed' | 'expired';
  claim: {
    id: string;
    redeemed: boolean;
    redeemed_at: string | null;
    expires_at: string;
    deal: {
      title: string;
      deal_price: number;
      original_price: number;
      discount_percentage: number;
      expires_at: string;
      vendor: { business_name: string };
    };
  };
}

export default function RedeemPage() {
  const params = useParams();
  const [data, setData] = useState<RedemptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`/api/redeem/${params.qrCode}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          const err = await response.json();
          setError(err.error || 'Invalid QR code');
        }
      } catch {
        setError('Failed to verify QR code');
      }
      setLoading(false);
    }
    checkStatus();
  }, [params.qrCode]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">Verifying QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid QR Code</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        {data.status === 'valid' && (
          <>
            <div className="inline-flex bg-green-50 rounded-full p-4 mb-4">
              <QrCode className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Valid QR Code</h1>
            <p className="text-gray-500 mb-6">Ready for vendor to scan and redeem</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary-500" />
                <span className="font-semibold text-secondary-500">{data.claim.deal.title}</span>
              </div>
              <p className="text-sm text-gray-500">{data.claim.deal.vendor?.business_name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 line-through text-sm">{formatCurrency(data.claim.deal.original_price)}</span>
                <span className="text-primary-500 font-bold">{formatCurrency(data.claim.deal.deal_price)}</span>
                <span className="text-green-600 text-sm">{formatPercentage(data.claim.deal.discount_percentage)} off</span>
              </div>
            </div>

            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-sm text-primary-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Expires in:</span>
              </div>
              <CountdownTimer expiresAt={data.claim.expires_at} size="md" />
            </div>
          </>
        )}

        {data.status === 'redeemed' && (
          <>
            <div className="inline-flex bg-blue-50 rounded-full p-4 mb-4">
              <CheckCircle2 className="w-12 h-12 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-blue-600 mb-2">Already Redeemed</h1>
            <p className="text-gray-500">This QR code was redeemed on {new Date(data.claim.redeemed_at!).toLocaleString()}</p>
          </>
        )}

        {data.status === 'expired' && (
          <>
            <div className="inline-flex bg-red-50 rounded-full p-4 mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Expired</h1>
            <p className="text-gray-500">This QR code expired on {new Date(data.claim.expires_at).toLocaleString()}</p>
          </>
        )}
      </div>
    </div>
  );
}
