'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { Plus, Tag, Pause, Play, Trash2, Pencil, TrendingUp, Lock, CalendarDays, List, Globe, MapPin } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal } from '@/lib/types/database';

export default function VendorDealsPage() {
  const { user } = useAuth();
  const { dealsPerMonth } = useVendorTier();
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
          <h1 className="text-3xl font-bold text-secondary-500">My Deals</h1>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-secondary-500 shadow-sm"
              title="List View"
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <Link
              href="/vendor/deals/calendar"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-secondary-500 transition-colors"
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
            <p className="text-sm font-medium text-secondary-500">
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
        <div className="grid gap-4">
          {deals.map(deal => (
            <div key={deal.id} className="card p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`rounded-lg p-3 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    {deal.deal_type === 'sponti_coupon' ? (
                      <SpontiIcon className="w-6 h-6 text-primary-500" />
                    ) : (
                      <Tag className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-secondary-500 truncate">{deal.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        deal.deal_type === 'sponti_coupon' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        deal.status === 'active' ? 'bg-green-50 text-green-600' :
                        deal.status === 'draft' ? 'bg-amber-50 text-amber-600' :
                        deal.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                        deal.status === 'paused' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {deal.status === 'draft' ? 'Draft' : deal.status}
                      </span>
                      {deal.website_url ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Online
                        </span>
                      ) : deal.location_ids && deal.location_ids.length > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {deal.location_ids.length} location{deal.location_ids.length !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Countdown */}
                  {deal.status === 'active' && deal.deal_type === 'sponti_coupon' && (
                    <div className="hidden md:block">
                      <CountdownTimer expiresAt={deal.expires_at} size="sm" />
                    </div>
                  )}

                  {/* Price */}
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 line-through text-sm">{formatCurrency(deal.original_price)}</span>
                      <span className="text-primary-500 font-bold text-lg">{formatCurrency(deal.deal_price)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{formatPercentage(deal.discount_percentage)} off</p>
                  </div>

                  {/* Claims */}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-500">{deal.claims_count}</p>
                    <p className="text-xs text-gray-400">claims</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {deal.claims_count > 0 ? (
                      <span
                        className="p-2 text-gray-300 cursor-not-allowed"
                        title="Deal is locked — has claims"
                      >
                        <Lock className="w-4 h-4" />
                      </span>
                    ) : (
                      <Link
                        href={`/vendor/deals/edit?id=${deal.id}`}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    )}
                    {deal.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(deal.id, 'paused')}
                        className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {deal.status === 'paused' && (
                      <button
                        onClick={() => handleStatusChange(deal.id, 'active')}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Resume"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {(deal.status === 'draft' || deal.status === 'paused') && (
                      <button
                        onClick={() => handleStatusChange(deal.id, 'expired')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Expire"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
