'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getDealImage } from '@/lib/constants';
import type { Deal } from '@/lib/types/database';
import { useLanguage } from '@/lib/i18n';
import DealsNavHeader from '@/components/vendor/DealsNavHeader';
import { isWipDraft, isScheduled } from '@/lib/deal-lifecycle';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DealsCalendarPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [zoomDeal, setZoomDeal] = useState<Deal | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDeals();
  }, [user, currentMonth, currentYear]);

  async function fetchDeals() {
    setLoading(true);
    const supabase = createClient();

    // Get deals that overlap with the current month. Work-in-progress drafts
    // are excluded below — the calendar only shows active and scheduled deals.
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString();
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('vendor_id', user!.id)
      .lte('starts_at', monthEnd)
      .gte('expires_at', monthStart)
      .order('starts_at', { ascending: true });

    // Drop WIP drafts — they have no real run date and belong in My Deals → Drafts.
    setDeals((data || []).filter(d => !isWipDraft(d)));
    setLoading(false);
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDay(now.getDate());
  };

  // Map: day number -> deals active on that day
  const dealsByDay = useMemo(() => {
    const map: Record<number, Deal[]> = {};
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(currentYear, currentMonth, day);
      const dayEnd = new Date(currentYear, currentMonth, day, 23, 59, 59);

      const activeDeals = deals.filter(deal => {
        const dealStart = new Date(deal.starts_at);
        const dealEnd = new Date(deal.expires_at);
        return dealStart <= dayEnd && dealEnd >= dayStart;
      });

      if (activeDeals.length > 0) {
        map[day] = activeDeals;
      }
    }
    return map;
  }, [deals, currentMonth, currentYear]);

  const selectedDeals = selectedDay ? dealsByDay[selectedDay] || [] : [];
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  return (
    <div className="max-w-6xl mx-auto">
      <DealsNavHeader view="calendar" showTabs={false} />

      {/* The calendar shows only published deals — active now and scheduled for
          a future date. Work-in-progress drafts live in My Deals → Drafts. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid — overflow-visible so the day hover-preview isn't clipped */}
        <div className="lg:col-span-2 card p-6 !overflow-visible">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button onClick={goToToday} className="text-xs text-primary-500 hover:text-primary-600 font-medium mt-0.5">
                {t('common.today')}
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_HEADERS.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {[...Array(firstDay)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const dayDeals = dealsByDay[day] || [];
                const isToday = isCurrentMonth && day === today.getDate();
                const isSelected = day === selectedDay;

                return (
                  <div
                    key={day}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedDay(day === selectedDay ? null : day);
                      }
                    }}
                    className={`aspect-square rounded-lg p-1 text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-200/50 ring-2 ring-primary-300'
                        : isToday
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                        : dayDeals.length > 0
                        ? 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        : 'hover:bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isSelected ? 'text-white' : ''}`}>
                      {day}
                    </span>

                    {/* Deal thumbnail — hover it (not the date) to preview, click it to zoom */}
                    {dayDeals.length > 0 && (() => {
                      // Show the most relevant deal: active first, then scheduled, else first.
                      const primary =
                        dayDeals.find(d => d.status === 'active') ||
                        dayDeals.find(d => isScheduled(d)) ||
                        dayDeals[0];
                      const ring =
                        primary.status === 'active' ? 'ring-green-500' :
                        isScheduled(primary) ? 'ring-blue-400' :
                        primary.status === 'paused' ? 'ring-yellow-400' :
                        'ring-gray-300';
                      const thumb = getDealImage(primary.image_url, primary.category?.slug);
                      return (
                        <div className="absolute inset-x-1 bottom-1 flex justify-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setZoomDeal(primary); }}
                            className="group/thumb relative cursor-zoom-in"
                            aria-label={`Zoom ${primary.title}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb}
                              alt={primary.title}
                              className={`w-9 h-9 rounded-md object-cover ring-2 ${ring} shadow-sm bg-white transition-transform group-hover/thumb:scale-110`}
                            />
                            {dayDeals.length > 1 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary-500 text-white text-[9px] font-bold shadow">
                                {dayDeals.length}
                              </span>
                            )}

                            {/* Preview on hovering the thumbnail only */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 origin-bottom opacity-0 scale-95 transition-all duration-150 group-hover/thumb:opacity-100 group-hover/thumb:scale-100">
                              <div className="overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={thumb} alt={primary.title} className="h-28 w-full object-cover" />
                                <div className="p-2 text-left">
                                  <p className="text-[11px] font-semibold leading-tight text-gray-900 line-clamp-2">{primary.title}</p>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      primary.status === 'active' ? 'bg-green-100 text-green-700' :
                                      isScheduled(primary) ? 'bg-blue-100 text-blue-700' :
                                      primary.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-500'
                                    }`}>
                                      {isScheduled(primary) ? t('vendor.calendar.scheduled') : primary.status}
                                    </span>
                                    <span className="text-[10px] font-semibold text-primary-500">{formatCurrency(primary.deal_price)}</span>
                                  </div>
                                  <p className="mt-1 text-[9px] text-gray-400">Click to zoom{dayDeals.length > 1 ? ` · +${dayDeals.length - 1} more this day` : ''}</p>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>{t('vendor.deals.status.active')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span>{t('vendor.calendar.scheduled')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span>{t('vendor.deals.status.paused')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span>{t('vendor.deals.status.expired')}</span>
            </div>
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="card p-6">
          {selectedDay ? (
            <>
              <h3 className="font-bold text-gray-900 mb-1">
                {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {selectedDeals.length} deal{selectedDeals.length !== 1 ? 's' : ''} active
              </p>

              {selectedDeals.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">{t('vendor.calendar.noDealsOnDay')}</p>
                  <Link href="/vendor/deals/new" className="text-sm text-primary-500 hover:text-primary-600 font-medium mt-2 inline-block">
                    + {t('vendor.dashboard.createADeal')}
                  </Link>
                </div>
              ) : (
                /* 2x2 bento of the day's deal images — click a tile to zoom */
                <div className="grid grid-cols-2 gap-3">
                  {selectedDeals.map(deal => {
                    const img = getDealImage(deal.image_url, deal.category?.slug);
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => setZoomDeal(deal)}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 text-left cursor-zoom-in transition-all hover:border-primary-300 hover:shadow-md"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={deal.title} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                        <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          deal.status === 'active' ? 'bg-green-500 text-white' :
                          isScheduled(deal) ? 'bg-blue-500 text-white' :
                          deal.status === 'paused' ? 'bg-yellow-400 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {isScheduled(deal) ? t('vendor.calendar.scheduled') : deal.status}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 p-2">
                          <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{deal.title}</p>
                          <p className="text-white/90 text-[10px] font-medium mt-0.5">
                            {formatCurrency(deal.deal_price)} · {Math.round(deal.discount_percentage)}% off
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-500 mb-1">Select a Day</h3>
              <p className="text-sm text-gray-400">Click on a day to see active deals</p>
            </div>
          )}

          {/* Month Summary */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Month Summary</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
                <p className="text-[10px] text-gray-400">Total Deals</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {deals.filter(d => d.status === 'active').length}
                </p>
                <p className="text-[10px] text-gray-400">Active</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {deals.filter(isScheduled).length}
                </p>
                <p className="text-[10px] text-gray-400">Scheduled</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-500">
                  {deals.filter(d => d.deal_type === 'sponti_coupon').length}
                </p>
                <p className="text-[10px] text-gray-400">Sponti Deals</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom lightbox — opens when a deal thumbnail/tile is clicked */}
      {zoomDeal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setZoomDeal(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomDeal(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getDealImage(zoomDeal.image_url, zoomDeal.category?.slug)}
              alt={zoomDeal.title}
              className="max-h-[60vh] w-full bg-gray-900 object-contain"
            />
            <div className="p-4">
              <h3 className="font-bold text-gray-900">{zoomDeal.title}</h3>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="font-bold text-primary-500">{formatCurrency(zoomDeal.deal_price)}</span>
                <span className="text-gray-400 line-through">{formatCurrency(zoomDeal.original_price)}</span>
                <span className="font-medium text-green-600">{Math.round(zoomDeal.discount_percentage)}% off</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {new Date(zoomDeal.starts_at).toLocaleDateString()} — {new Date(zoomDeal.expires_at).toLocaleDateString()}
              </div>
              <Link
                href={`/vendor/deals/edit?id=${zoomDeal.id}`}
                className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 text-sm"
              >
                Edit deal
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
