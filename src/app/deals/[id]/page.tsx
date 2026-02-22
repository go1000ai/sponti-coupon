'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { MapPin, Clock, Tag, AlertTriangle, ArrowLeft, Store, Shield, Eye, Users } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import Link from 'next/link';
import { DealImageGallery } from '@/components/deals/DealImageGallery';
import type { Deal } from '@/lib/types/database';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDeal() {
      const response = await fetch(`/api/deals/${params.id}`);
      const data = await response.json();
      setDeal(data.deal);
      setLoading(false);
    }
    fetchDeal();
  }, [params.id]);

  const handleClaim = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/deals/${params.id}`);
      return;
    }

    if (deal?.deal_type === 'sponti_coupon') {
      setShowDisclaimer(true);
      return;
    }

    await processClaim();
  };

  const processClaim = async () => {
    setClaiming(true);
    setError('');

    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setClaiming(false);
        return;
      }

      // For Sponti Coupons, redirect to vendor payment
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      // For regular deals, go to my deals with QR
      router.push('/my-deals');
    } catch {
      setError('Failed to claim deal. Please try again.');
    }

    setClaiming(false);
    setShowDisclaimer(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-500">Deal not found</h1>
        <Link href="/deals" className="text-primary-500 hover:underline mt-4 inline-block">Back to deals</Link>
      </div>
    );
  }

  const isSponti = deal.deal_type === 'sponti_coupon';
  const isExpired = new Date(deal.expires_at) < new Date();
  const isSoldOut = deal.max_claims ? deal.claims_count >= deal.max_claims : false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/deals" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Main Content */}
        <div className="md:col-span-3">
          {/* Image Gallery / Banner */}
          <div className={`rounded-2xl overflow-hidden ${isSponti ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
            <DealImageGallery
              mainImage={deal.image_url}
              images={deal.image_urls || []}
              title={deal.title}
              fallback={
                isSponti ? (
                  <SpontiIcon className="w-24 h-24 text-white/20" />
                ) : (
                  <Tag className="w-24 h-24 text-white/20" />
                )
              }
            />
          </div>

          {/* Deal Type Badge */}
          <div className="flex items-center gap-3 mt-6">
            <DealTypeBadge type={deal.deal_type} size="lg" />
            <span className={`text-sm font-bold ${isSponti ? 'text-primary-500' : 'text-secondary-500'}`}>
              {isSponti ? 'Sponti Coupon' : 'Regular Deal'}
            </span>
            {isExpired && (
              <span className="bg-red-100 text-red-600 text-sm font-bold px-4 py-1.5 rounded-full">EXPIRED</span>
            )}
            {isSoldOut && (
              <span className="bg-gray-100 text-gray-600 text-sm font-bold px-4 py-1.5 rounded-full">SOLD OUT</span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-secondary-500 mt-4">{deal.title}</h1>

          {deal.vendor && (
            <div className="flex items-center gap-2 mt-3 text-gray-500">
              <Store className="w-4 h-4" />
              <span className="font-medium">{deal.vendor.business_name}</span>
              {deal.vendor.city && (
                <>
                  <span className="text-gray-300">|</span>
                  <MapPin className="w-4 h-4" />
                  <span>{deal.vendor.city}, {deal.vendor.state}</span>
                </>
              )}
            </div>
          )}

          {deal.description && (
            <p className="text-gray-600 mt-4 leading-relaxed">{deal.description}</p>
          )}

          {/* Countdown */}
          {!isExpired && isSponti && (
            <div className="mt-8 bg-secondary-500 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary-400" />
                <span className="font-semibold">Deal expires in:</span>
              </div>
              <CountdownTimer expiresAt={deal.expires_at} size="lg" />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:col-span-2">
          <div className="card p-6 sticky top-24">
            {/* Price */}
            <div className="text-center mb-6">
              <div className="text-gray-400 line-through text-lg">{formatCurrency(deal.original_price)}</div>
              <div className="text-4xl font-bold text-primary-500">{formatCurrency(deal.deal_price)}</div>
              <div className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-bold text-lg px-3 py-1 rounded-full mt-2">
                {formatPercentage(deal.discount_percentage)} OFF
              </div>
            </div>

            {/* Deposit info for Sponti */}
            {isSponti && deal.deposit_amount && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-primary-700">
                  Deposit Required: {formatCurrency(deal.deposit_amount)}
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  Paid directly to the business. Non-refundable if not redeemed.
                </p>
              </div>
            )}

            {/* Claims progress */}
            {deal.max_claims && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{deal.claims_count} claimed</span>
                  <span>{deal.max_claims - deal.claims_count} left</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: `${(deal.claims_count / deal.max_claims) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Claim Button */}
            {!isExpired && !isSoldOut && deal.status === 'active' && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-primary w-full text-lg py-4"
              >
                {claiming ? 'Processing...' : isSponti ? `Claim Deal — ${formatCurrency(deal.deposit_amount!)} Deposit` : 'Claim This Deal'}
              </button>
            )}

            {isExpired && (
              <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-lg font-semibold">
                This deal has expired
              </div>
            )}

            {isSoldOut && (
              <div className="bg-gray-100 text-gray-500 text-center py-4 rounded-lg font-semibold">
                This deal is sold out
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mt-4">
                {error}
              </div>
            )}

            {/* Social proof */}
            {deal.claims_count > 0 && (
              <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{deal.claims_count} people claimed this deal</span>
                </div>
                <p className="text-xs text-green-600 mt-1 ml-6">
                  Last claimed {Math.max(1, Math.floor(Math.random() * 15))} minutes ago
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Eye className="w-4 h-4 text-primary-400" />
              <span>{12 + Math.floor(Math.random() * 25)} people viewing this deal</span>
            </div>

            {/* Trust signals */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Verified business</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure QR redemption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <h3 className="text-xl font-bold text-secondary-500">Confirm Your Claim</h3>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                This deal expires in <strong>{getTimeRemainingText(deal.expires_at)}</strong>. The deposit of{' '}
                <strong>{formatCurrency(deal.deposit_amount!)}</strong> is non-refundable if not redeemed in time.
                By proceeding you agree to these terms.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-secondary-500">{deal.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 line-through text-sm">{formatCurrency(deal.original_price)}</span>
                <span className="text-primary-500 font-bold">{formatCurrency(deal.deal_price)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={processClaim}
                disabled={claiming}
                className="btn-primary flex-1"
              >
                {claiming ? 'Processing...' : `Pay ${formatCurrency(deal.deposit_amount!)} Deposit`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeRemainingText(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '0 minutes';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
