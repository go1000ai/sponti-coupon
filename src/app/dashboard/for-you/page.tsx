'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { formatCurrency, formatPercentage, getDistanceFromLatLng } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Compass,
  Flame,
  Heart,
} from 'lucide-react';
import type { Deal } from '@/lib/types/database';

interface DealWithDistance extends Deal {
  distance?: number | null;
}

function DealCard({ deal, showDistance }: { deal: DealWithDistance; showDistance?: boolean }) {
  const vendor = deal.vendor as Deal['vendor'];
  const imageUrl = getDealImage(
    deal.image_url || deal.image_urls?.[0],
    vendor?.category
  );

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="card group overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <Image
          src={imageUrl}
          alt={deal.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Deal type badge */}
        <div className="absolute top-3 left-3">
          <DealTypeBadge type={deal.deal_type} size="sm" />
        </div>
        {/* Discount badge */}
        <div className="absolute top-3 right-3 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
          {formatPercentage(deal.discount_percentage)} OFF
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-secondary-500 truncate group-hover:text-primary-500 transition-colors">
          {deal.title}
        </h3>
        <p className="text-sm text-gray-500 truncate mt-0.5">
          {vendor?.business_name}
        </p>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 line-through text-sm">
              {formatCurrency(deal.original_price)}
            </span>
            <span className="text-primary-500 font-bold text-lg">
              {formatCurrency(deal.deal_price)}
            </span>
          </div>
          {showDistance && deal.distance != null && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              {deal.distance < 1
                ? `${(deal.distance * 5280).toFixed(0)} ft`
                : `${deal.distance.toFixed(1)} mi`}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DealsForYouPage() {
  const { user } = useAuth();
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [recommendedDeals, setRecommendedDeals] = useState<DealWithDistance[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all deals and recommended deals in parallel
      const dealsUrl = lat && lng
        ? `/api/deals?limit=30&lat=${lat}&lng=${lng}&radius=50`
        : '/api/deals?limit=30';

      const [dealsRes, recRes] = await Promise.all([
        fetch(dealsUrl),
        fetch('/api/deals/recommended'),
      ]);

      const dealsData = await dealsRes.json();
      const recData = await recRes.json();

      setDeals(dealsData.deals || []);
      setRecommendedDeals(recData.recommended || []);
      setHasHistory(recData.has_history || false);
    } catch {
      setDeals([]);
      setRecommendedDeals([]);
    }
    setLoading(false);
  }, [lat, lng]);

  useEffect(() => {
    if (!user) return;
    // Wait until geo resolves or give up after 5s timeout
    if (geoLoading) return;
    fetchDeals();
  }, [user, geoLoading, fetchDeals]);

  // Near You: sorted by distance (only if geolocation available)
  const nearYouDeals = useMemo(() => {
    if (!lat || !lng) return [];
    return [...deals]
      .filter((d) => {
        const vendor = d.vendor as Deal['vendor'];
        return vendor?.lat && vendor?.lng;
      })
      .map((d) => {
        const vendor = d.vendor as Deal['vendor'];
        return {
          ...d,
          distance: vendor?.lat && vendor?.lng
            ? getDistanceFromLatLng(lat, lng, vendor.lat, vendor.lng)
            : null,
        };
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999))
      .slice(0, 6);
  }, [deals, lat, lng]);

  // Trending: deals with highest claims_count
  const trendingDeals = useMemo(() => {
    return [...deals]
      .sort((a, b) => (b.claims_count || 0) - (a.claims_count || 0))
      .slice(0, 6);
  }, [deals]);

  // Just Added: newest deals
  const justAddedDeals = useMemo(() => {
    return [...deals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [deals]);

  if (loading || geoLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const hasDeals = deals.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary-500">
          Deals For You
        </h1>
        <p className="text-gray-500 mt-1">
          Personalized deals based on your location and interests
        </p>
      </div>

      {!hasDeals ? (
        <div className="card p-12 text-center">
          <div className="bg-primary-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Compass className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-500">No deals available</h3>
          <p className="text-gray-400 mt-1 mb-6">
            Check back soon for new deals in your area!
          </p>
          <Link href="/deals" className="btn-primary inline-flex items-center gap-2">
            <Compass className="w-4 h-4" /> Browse All Deals
          </Link>
        </div>
      ) : (
        <>
          {/* Recommended for You — based on purchase history */}
          {recommendedDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-purple-500 rounded-xl p-2.5">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary-500">Recommended for You</h2>
                  <p className="text-sm text-gray-400">
                    {hasHistory
                      ? 'Based on your purchase history'
                      : 'Popular deals you might like'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedDeals.map((deal) => (
                  <DealCard key={`rec-${deal.id}`} deal={deal} showDistance={!!lat} />
                ))}
              </div>
            </section>
          )}

          {/* Near You */}
          {nearYouDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-blue-500 rounded-xl p-2.5">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary-500">Near You</h2>
                  <p className="text-sm text-gray-400">Deals closest to your location</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearYouDeals.map((deal) => (
                  <DealCard key={`near-${deal.id}`} deal={deal} showDistance />
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          {trendingDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-primary-500 rounded-xl p-2.5">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary-500">Trending</h2>
                  <p className="text-sm text-gray-400">Most popular deals right now</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingDeals.map((deal) => (
                  <DealCard key={`trend-${deal.id}`} deal={deal} showDistance={!!lat} />
                ))}
              </div>
            </section>
          )}

          {/* Just Added */}
          {justAddedDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-emerald-500 rounded-xl p-2.5">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary-500">Just Added</h2>
                  <p className="text-sm text-gray-400">Fresh deals you haven&apos;t seen yet</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {justAddedDeals.map((deal) => (
                  <DealCard key={`new-${deal.id}`} deal={deal} showDistance={!!lat} />
                ))}
              </div>
            </section>
          )}

          {/* Browse All CTA */}
          <div className="text-center pt-4 pb-2">
            <Link
              href="/deals"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3"
            >
              <Compass className="w-5 h-5" />
              Browse All Deals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
