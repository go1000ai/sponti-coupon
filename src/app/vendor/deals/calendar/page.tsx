'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Tag, Clock,
  List, CalendarDays,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { formatCurrency } from '@/lib/utils';
import type { Deal } from '@/lib/types/database';

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDeals();
  }, [user, currentMonth, currentYear]);

  async function fetchDeals() {
    setLoading(true);
    const supabase = createClient();

    // Get deals that overlap with the current month
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString();
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('vendor_id', user!.id)
      .lte('starts_at', monthEnd)
      .gte('expires_at', monthStart)
      .order('starts_at', { ascending: true });

    setDeals(data || []);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-3xl font-bold text-secondary-500">My Deals</h1>
            <p className="text-gray-500 text-sm mt-1">Visualize your deals across the month</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <Link
              href="/vendor/deals"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-secondary-500 transition-colors"
              title="List View"
            >
              <List className="w-3.5 h-3.5" /> List
            </Link>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-secondary-500 shadow-sm"
              title="Calendar View"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
        </div>
        <Link href="/vendor/deals/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Deal
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 card p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-secondary-500">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button onClick={goToToday} className="text-xs text-primary-500 hover:text-primary-600 font-medium mt-0.5">
                Today
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
                const hasActive = dayDeals.some(d => d.status === 'active');
                const hasDraft = dayDeals.some(d => d.status === 'draft');
                const hasPaused = dayDeals.some(d => d.status === 'paused');
                const hasExpired = dayDeals.every(d => d.status === 'expired') && dayDeals.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    className={`aspect-square rounded-lg p-1 text-left transition-all relative ${
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

                    {/* Deal status indicators */}
                    {dayDeals.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-0.5">
                        {hasActive && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                        )}
                        {hasDraft && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-blue-400'}`} />
                        )}
                        {hasPaused && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-yellow-400'}`} />
                        )}
                        {hasExpired && !hasActive && !hasDraft && !hasPaused && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/40' : 'bg-gray-300'}`} />
                        )}
                        {dayDeals.length > 1 && (
                          <span className={`text-[8px] font-bold ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                            {dayDeals.length}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span>Paused</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span>Expired</span>
            </div>
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="card p-6">
          {selectedDay ? (
            <>
              <h3 className="font-bold text-secondary-500 mb-1">
                {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {selectedDeals.length} deal{selectedDeals.length !== 1 ? 's' : ''} active
              </p>

              {selectedDeals.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No deals on this day</p>
                  <Link href="/vendor/deals/new" className="text-sm text-primary-500 hover:text-primary-600 font-medium mt-2 inline-block">
                    + Create a deal
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDeals.map(deal => {
                    const isSponti = deal.deal_type === 'sponti_coupon';
                    return (
                      <Link
                        key={deal.id}
                        href={`/vendor/deals/edit?id=${deal.id}`}
                        className="block p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isSponti ? (
                            <SpontiIcon className="w-4 h-4 text-primary-500" />
                          ) : (
                            <Tag className="w-4 h-4 text-secondary-400" />
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isSponti ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isSponti ? 'Sponti' : 'Steady'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            deal.status === 'active' ? 'bg-green-100 text-green-700' :
                            deal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {deal.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-secondary-500 text-sm line-clamp-1">{deal.title}</h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="font-semibold text-primary-500">{formatCurrency(deal.deal_price)}</span>
                          <span className="line-through">{formatCurrency(deal.original_price)}</span>
                          <span className="text-green-600 font-medium">{Math.round(deal.discount_percentage)}% off</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(deal.starts_at).toLocaleDateString()} — {new Date(deal.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
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
                <p className="text-2xl font-bold text-secondary-500">{deals.length}</p>
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
                  {deals.filter(d => d.status === 'draft').length}
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
    </div>
  );
}
