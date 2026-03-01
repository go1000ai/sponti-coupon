'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { useRouter } from 'next/navigation';
import { Plus, Tag, Pause, Play, Trash2, TrendingUp, Lock, CalendarDays, List, Globe, MapPin } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal } from '@/lib/types/database';

export default function VendorDealsPage() {
  const { user } = useAuth();
  const { dealsPerMonth } = useVendorTier();
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'expired' | 'paused'>('all');
  const [loading, setLoading] = useState(true);
  const [dealsThisMonth, setDealsThisMonth] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchDeals() {
      try {
        let query = supabase
          .from('deals')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        // Also count deals created this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [dealsRes, countRes] = await Promise.all([
          query,
          supabase
            .from('deals')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', user!.id)
            .gte('created_at', startOfMonth.toISOString()),
        ]);

        setDeals(dealsRes.data || []);
        setDealsThisMonth(countRes.count || 0);
      } catch (err) {
        console.error('[VendorDeals] Error fetching deals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, [user, filter]);

  const handleStatusChange = async (dealId: string, newStatus: string) => {
    const response = await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      setDeals(prev =>
        prev.map(d => d.id === dealId ? { ...d, status: newStatus as Deal['status'] } : d)
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Deals</h1>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-900 shadow-sm"
              title="List View"
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <Link
              href="/vendor/deals/calendar"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
              title="Calendar View"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </Link>
          </div>
        </div>
        <Link href="/vendor/deals/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Deal
        </Link>
      </div>

      {/* Deal Usage Indicator */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {dealsPerMonth === -1
                ? 'Unlimited deals this month'
                : `${dealsThisMonth} of ${dealsPerMonth} deals used this month`}
            </p>
            {dealsPerMonth !== -1 && dealsThisMonth >= dealsPerMonth && (
              <p className="text-xs text-red-500 mt-0.5">
                You&apos;ve reached your limit.{' '}
                <Link href="/vendor/subscription" className="underline font-medium">Upgrade</Link> for more deals.
              </p>
            )}
          </div>
        </div>
        {dealsPerMonth !== -1 && (
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                dealsThisMonth >= dealsPerMonth ? 'bg-red-500' : 'bg-primary-500'
              }`}
              style={{ width: `${Math.min(100, (dealsThisMonth / dealsPerMonth) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'draft', 'expired', 'paused'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : deals.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No deals found</h3>
          <p className="text-gray-400 mt-1">
            {filter === 'all' ? 'Create your first deal' : `No ${filter} deals`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map(deal => {
            const isSponti = deal.deal_type === 'sponti_coupon';
            return (
              <div key={deal.id}
                onClick={() => router.push(`/vendor/deals/edit?id=${deal.id}`)}
                className={`card overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col ${
                  isSponti ? 'border-primary-100' : ''
                }`}
              >
                {/* Card Header — colored stripe */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  isSponti ? 'bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-gradient-to-r from-gray-100 to-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {isSponti ? (
                      <SpontiIcon className="w-4 h-4 text-white" />
                    ) : (
                      <Tag className="w-4 h-4 text-gray-500" />
                    )}
                    <span className={`text-xs font-semibold ${isSponti ? 'text-white' : 'text-gray-600'}`}>
                      {isSponti ? 'Sponti Coupon' : 'Steady Deal'}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    deal.status === 'active' ? (isSponti ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700') :
                    deal.status === 'draft' ? (isSponti ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700') :
                    deal.status === 'expired' ? (isSponti ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500') :
                    deal.status === 'paused' ? (isSponti ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700') :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {deal.status === 'draft' ? 'Draft' : deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug">{deal.title}</h3>

                  {/* Location/Online badge */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {deal.website_url ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> Online
                      </span>
                    ) : deal.location_ids && deal.location_ids.length > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {deal.location_ids.length} location{deal.location_ids.length !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {deal.claims_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Has claims
                      </span>
                    )}
                  </div>

                  {/* Countdown for active Sponti */}
                  {deal.status === 'active' && isSponti && (
                    <div className="mt-3">
                      <CountdownTimer expiresAt={deal.expires_at} size="sm" variant="sponti" />
                    </div>
                  )}

                  {/* Pricing — pushed to bottom */}
                  <div className="mt-auto pt-4">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-gray-400 line-through text-sm">{formatCurrency(deal.original_price)}</span>
                        <span className="text-primary-500 font-bold text-xl">{formatCurrency(deal.deal_price)}</span>
                      </div>
                      <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        {formatPercentage(deal.discount_percentage)} off
                      </span>
                    </div>
                  </div>

                  {/* Footer row: claims + actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      <span className="font-bold text-gray-900">{deal.claims_count}</span> claims
                    </span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {deal.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(deal.id, 'paused')}
                          className="p-1.5 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {deal.status === 'paused' && (
                        <button
                          onClick={() => handleStatusChange(deal.id, 'active')}
                          className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="Resume"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {(deal.status === 'draft' || deal.status === 'paused') && (
                        <button
                          onClick={() => handleStatusChange(deal.id, 'expired')}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
