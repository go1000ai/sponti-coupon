'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { formatCurrency, formatPercentage, getDistanceFromLatLng } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Compass,
  Heart,
  SlidersHorizontal,
  Mail,
  Check,
  Loader2,
} from 'lucide-react';
import type { Deal } from '@/lib/types/database';

interface DealWithDistance extends Deal {
  distance?: number | null;
}

interface Category { name: string; icon: string; slug: string }

const RADIUS_OPTIONS = [25, 50, 100, 200, 300];

function DealCard({ deal, showDistance }: { deal: DealWithDistance; showDistance?: boolean }) {
  const vendor = deal.vendor as Deal['vendor'];
  const imageUrl = getDealImage(deal.image_url || deal.image_urls?.[0], vendor?.category);

  return (
    <Link href={`/deals/${deal.slug || deal.id}`} className="card group overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative h-40 overflow-hidden">
        <Image src={imageUrl} alt={deal.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute top-3 left-3"><DealTypeBadge type={deal.deal_type} size="sm" /></div>
        <div className="absolute top-3 right-3 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
          {formatPercentage(deal.discount_percentage)} OFF
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-500 transition-colors">{deal.title}</h3>
        <p className="text-sm text-gray-500 truncate mt-0.5">{vendor?.business_name}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 line-through text-sm">{formatCurrency(deal.original_price)}</span>
            <span className="text-primary-500 font-bold text-lg">{formatCurrency(deal.deal_price)}</span>
          </div>
          {showDistance && deal.distance != null && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              {deal.distance < 1 ? `${(deal.distance * 5280).toFixed(0)} ft` : `${deal.distance.toFixed(1)} mi`}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DealsForYouPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const [deals, setDeals] = useState<DealWithDistance[]>([]);
  const [recommendedDeals, setRecommendedDeals] = useState<DealWithDistance[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  // Preferences
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(50);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [showEverything, setShowEverything] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const dealsUrl = lat && lng ? `/api/deals?limit=60&lat=${lat}&lng=${lng}&radius=300` : '/api/deals?limit=60';
      const [dealsRes, recRes] = await Promise.all([fetch(dealsUrl), fetch('/api/deals/recommended')]);
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
    if (!user || geoLoading) return;
    fetchDeals();
  }, [user, geoLoading, fetchDeals]);

  // Load saved preferences
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/customer/preferences');
        const data = await res.json();
        setCategories(data.categories || []);
        setSelectedCats(data.preferred_categories || []);
        setEmailOptIn(data.email_preferred_deals ?? true);
        setZip(data.location_zip || '');
        setRadius(data.deal_radius_miles ?? 50);
      } catch { /* ignore */ }
    })();
  }, [user]);

  const toggleCat = (slug: string) => {
    setSelectedCats((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    setSavedMsg(false);
    try {
      const res = await fetch('/api/customer/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_categories: selectedCats,
          email_preferred_deals: emailOptIn,
          location_zip: zip.trim(),
          deal_radius_miles: radius,
        }),
      });
      if (res.ok) { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2500); }
    } catch { /* ignore */ }
    setSavingPrefs(false);
  };

  // Match a deal's vendor.category to a canonical category (fuzzy, bidirectional token match)
  const categorize = useCallback((deal: DealWithDistance): string | null => {
    const vendor = deal.vendor as Deal['vendor'];
    const vcat = (vendor?.category || '').toLowerCase();
    if (!vcat) return null;
    const vWords = vcat.split(/[^a-z]+/).filter((w) => w.length > 2);
    for (const c of categories) {
      const cWords = [...c.name.toLowerCase().split(/[^a-z]+/), ...c.slug.split('-')].filter((w) => w.length > 2);
      if (cWords.some((cw) => vWords.some((vw) => cw.includes(vw) || vw.includes(cw)))) return c.slug;
    }
    return null;
  }, [categories]);

  const dealsByCategory = useMemo(() => {
    const map: Record<string, DealWithDistance[]> = {};
    for (const d of deals) {
      const slug = categorize(d) || '_other';
      (map[slug] ||= []).push(d);
    }
    return map;
  }, [deals, categorize]);

  // Which category sections to show: selected only (default) unless "Show everything" / no selection
  const usingFilter = selectedCats.length > 0 && !showEverything;
  const sectionSlugs = useMemo(() => {
    const base = usingFilter ? selectedCats : categories.map((c) => c.slug);
    const withDeals = base.filter((s) => (dealsByCategory[s]?.length || 0) > 0);
    if (!usingFilter && (dealsByCategory['_other']?.length || 0) > 0) withDeals.push('_other');
    return withDeals;
  }, [usingFilter, selectedCats, categories, dealsByCategory]);

  const nearYouDeals = useMemo(() => {
    if (!lat || !lng) return [];
    return [...deals]
      .filter((d) => { const v = d.vendor as Deal['vendor']; return v?.lat && v?.lng; })
      .map((d) => {
        const v = d.vendor as Deal['vendor'];
        return { ...d, distance: v?.lat && v?.lng ? getDistanceFromLatLng(lat, lng, v.lat, v.lng) : null };
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999))
      .slice(0, 6);
  }, [deals, lat, lng]);

  if (loading || geoLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const hasDeals = deals.length > 0;
  const catBySlug = (slug: string) => categories.find((c) => c.slug === slug);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('customer.forYou.title')}</h1>
        <p className="text-gray-500 mt-1">{t('customer.forYou.subtitle')}</p>
      </div>

      {/* ===== Preferences card ===== */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary-500 rounded-xl p-2.5"><SlidersHorizontal className="w-5 h-5 text-white" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">What deals do you want?</h2>
            <p className="text-sm text-gray-400">Pick your types and we&rsquo;ll show — and email — you new matching deals. Leave blank to see everything.</p>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map((c) => {
            const on = selectedCats.includes(c.slug);
            return (
              <button
                key={c.slug}
                onClick={() => toggleCat(c.slug)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  on ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                <span>{c.icon}</span> {c.name}
                {on && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Location + radius + email toggle + save */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Your zip code</label>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g. 32801"
              inputMode="numeric"
              className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">I want deals within</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{r} miles</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer sm:ml-2 sm:mb-2">
            <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
            <Mail className="w-4 h-4 text-gray-400" /> Email me new deals
          </label>
          <div className="flex-1" />
          <button
            onClick={savePrefs}
            disabled={savingPrefs}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 sm:mb-0"
          >
            {savingPrefs ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : savedMsg ? <><Check className="w-4 h-4" /> Saved!</> : 'Save preferences'}
          </button>
        </div>
      </div>

      {!hasDeals ? (
        <div className="card p-12 text-center">
          <div className="bg-primary-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center"><Compass className="w-8 h-8 text-primary-500" /></div>
          <h3 className="text-lg font-semibold text-gray-900">{t('customer.forYou.noDealsAvailable')}</h3>
          <p className="text-gray-400 mt-1 mb-6">{t('customer.forYou.checkBackSoon')}</p>
          <Link href="/deals" className="btn-primary inline-flex items-center gap-2"><Compass className="w-4 h-4" /> {t('customer.forYou.browseAllDeals')}</Link>
        </div>
      ) : (
        <>
          {/* Recommended for You */}
          {recommendedDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-blue-500 rounded-xl p-2.5"><Heart className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t('customer.forYou.recommendedForYou')}</h2>
                  <p className="text-sm text-gray-400">{hasHistory ? t('customer.forYou.basedOnHistory') : t('customer.forYou.popularDeals')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedDeals.map((deal) => <DealCard key={`rec-${deal.id}`} deal={deal} showDistance={!!lat} />)}
              </div>
            </section>
          )}

          {/* Near You */}
          {nearYouDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-blue-500 rounded-xl p-2.5"><MapPin className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t('customer.forYou.nearYou')}</h2>
                  <p className="text-sm text-gray-400">{t('customer.forYou.nearYouDesc')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearYouDeals.map((deal) => <DealCard key={`near-${deal.id}`} deal={deal} showDistance />)}
              </div>
            </section>
          )}

          {/* ===== Browse by Category (preference-driven) ===== */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 rounded-xl p-2.5"><Sparkles className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{usingFilter ? 'Your Deal Types' : 'Browse by Category'}</h2>
                  <p className="text-sm text-gray-400">{usingFilter ? 'Based on the types you picked above' : 'All deals, organized by type'}</p>
                </div>
              </div>
              {selectedCats.length > 0 && (
                <button onClick={() => setShowEverything((v) => !v)} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  {showEverything ? 'Show my types only' : 'Show everything'}
                </button>
              )}
            </div>

            {sectionSlugs.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm">
                No deals match your selected types right now. Try adding more categories or widening your radius.
              </div>
            ) : (
              <div className="space-y-8">
                {sectionSlugs.map((slug) => {
                  const cat = catBySlug(slug);
                  const catDeals = dealsByCategory[slug] || [];
                  const expanded = expandedCats.has(slug);
                  const visible = expanded ? catDeals : catDeals.slice(0, 6);
                  return (
                    <div key={slug}>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span>{cat?.icon || '🎯'}</span> {cat?.name || 'More Deals'}
                        <span className="text-xs font-normal text-gray-400">({catDeals.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visible.map((deal) => <DealCard key={`${slug}-${deal.id}`} deal={deal} showDistance={!!lat} />)}
                      </div>
                      {catDeals.length > 6 && (
                        <button
                          onClick={() => setExpandedCats((prev) => { const n = new Set(prev); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; })}
                          className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          {expanded ? 'Show less' : `Show ${catDeals.length - 6} more`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Browse All CTA */}
          <div className="text-center pt-4 pb-2">
            <Link href="/deals" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
              <Compass className="w-5 h-5" /> {t('customer.forYou.browseAllDeals')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
