'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tag, Pause, Play, Trash2, TrendingUp, Lock, Globe, MapPin } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal } from '@/lib/types/database';
import { useLanguage } from '@/lib/i18n';
import DealsNavHeader from '@/components/vendor/DealsNavHeader';
import DraftsGrid from '@/components/vendor/DraftsGrid';
import { isWipDraft, isScheduled } from '@/lib/deal-lifecycle';

export default function VendorDealsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { dealsPerMonth } = useVendorTier();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep links: ?tab=drafts (or legacy ?filter=draft) open the Drafts tab.
  const initialTab: 'deals' | 'drafts' =
    searchParams.get('tab') === 'drafts' || searchParams.get('filter') === 'draft'
      ? 'drafts'
      : 'deals';
  const [activeTab, setActiveTab] = useState<'deals' | 'drafts'>(initialTab);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [drafts, setDrafts] = useState<Deal[]>([]);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'paused'>('all');
  const [loading, setLoading] = useState(true);
  const [dealsThisMonth, setDealsThisMonth] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchDeals() {
      try {
        const { data } = await supabase
          .from('deals')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('created_at', { ascending: false });

        const all = data || [];

        // Work-in-progress drafts get their own tab. Everything else —
        // active, paused, expired, and scheduled (draft + future start) —
        // stays in the My Deals grid; scheduled deals are labeled "Scheduled".
        setDrafts(all.filter(isWipDraft));

        const published = all.filter(d => !isWipDraft(d));
        setDeals(filter === 'all' ? published : published.filter(d => d.status === filter));

        // Count all deals created this month (drafts included) for the usage meter.
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        setDealsThisMonth(all.filter(d => new Date(d.created_at) >= startOfMonth).length);
      } catch (err) {
        console.error('[VendorDeals] Error fetching deals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, [user, filter]);

  const handleDeleteDraft = async (id: string) => {
    setDeletingDraft(id);
    const supabase = createClient();
    await supabase.from('deals').delete().eq('id', id);
    setDrafts(prev => prev.filter(d => d.id !== id));
    setDeletingDraft(null);
  };

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
      <DealsNavHeader
        view="list"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        draftCount={drafts.length}
      />

      {activeTab === 'drafts' ? (
        <DraftsGrid drafts={drafts} onDelete={handleDeleteDraft} deletingId={deletingDraft} />
      ) : (
      <>
      {/* Deal Usage Indicator */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {dealsPerMonth === -1
                ? t('vendor.deals.unlimitedDeals')
                : t('vendor.deals.dealsUsed', { used: dealsThisMonth, total: dealsPerMonth })}
            </p>
            {dealsPerMonth !== -1 && dealsThisMonth >= dealsPerMonth && (
              <p className="text-xs text-red-500 mt-0.5">
                {t('vendor.deals.reachedLimit')}{' '}
                <Link href="/vendor/subscription" className="underline font-medium">{t('vendor.deals.upgrade')}</Link> {t('vendor.deals.forMoreDeals')}
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
        {(['all', 'active', 'expired', 'paused'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t(`vendor.deals.filter.${f}`)}
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
          <h3 className="text-lg font-semibold text-gray-500">{t('vendor.deals.noDealsFound')}</h3>
          <p className="text-gray-400 mt-1">
            {filter === 'all' ? t('vendor.deals.createFirst') : t('vendor.deals.noFilteredDeals', { status: t(`vendor.deals.filter.${filter}`) })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map(deal => {
            const isSponti = deal.deal_type === 'sponti_coupon';
            // A 'draft'-status deal with a future start date is really a
            // scheduled deal — label it "Scheduled", not "Draft".
            const scheduled = isScheduled(deal);
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
                      {isSponti ? t('vendor.deals.spontiCoupon') : t('vendor.deals.steadyDeal')}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    scheduled ? (isSponti ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700') :
                    deal.status === 'active' ? (isSponti ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700') :
                    deal.status === 'expired' ? (isSponti ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500') :
                    deal.status === 'paused' ? (isSponti ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700') :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {scheduled ? t('vendor.calendar.scheduled') : (t(`vendor.deals.status.${deal.status}`) || deal.status)}
                  </span>
                </div>

                {/* Deal Image */}
                {deal.image_url && (
                  <div className="h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug">{deal.title}</h3>

                  {/* Location/Online badge */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {deal.website_url ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> {t('vendor.deals.online')}
                      </span>
                    ) : deal.location_ids && deal.location_ids.length > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {t('vendor.deals.locations', { count: deal.location_ids.length })}
                      </span>
                    ) : null}
                    {deal.claims_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> {t('vendor.deals.hasClaims')}
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
                        {formatPercentage(deal.discount_percentage)} {t('vendor.deals.off')}
                      </span>
                    </div>
                  </div>

                  {/* Footer row: claims + actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      <span className="font-bold text-gray-900">{deal.claims_count}</span> {t('vendor.deals.stats.claims')}
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
      </>
      )}
    </div>
  );
}
