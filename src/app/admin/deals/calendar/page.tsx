'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Clock,
  Tag,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface CalendarDeal {
  id: string;
  title: string;
  vendor_name: string;
  deal_type: 'sponti' | 'steady';
  status: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Check if a deal is active on a given date (inclusive of start and expiry day) */
function isDealActiveOnDate(deal: CalendarDeal, date: Date): boolean {
  const startStr = deal.starts_at || deal.created_at;
  if (!startStr) return false;

  const start = new Date(startStr);
  start.setHours(0, 0, 0, 0);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  // Deal must have started by this day
  if (dayStart < start) return false;

  // If there's an expiry, the deal must not have expired before this day
  if (deal.expires_at) {
    const end = new Date(deal.expires_at);
    end.setHours(23, 59, 59, 999);
    if (dayStart > end) return false;
  }

  return true;
}

function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-50 text-green-700';
    case 'draft':
      return 'bg-gray-50 text-gray-600';
    case 'paused':
      return 'bg-yellow-50 text-yellow-700';
    case 'expired':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-50 text-gray-600';
  }
}

// ── Component ──────────────────────────────────────────────────────────

export default function AdminDealCalendarPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<CalendarDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ── Fetch deals ────────────────────────────────────────────────────

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/deals');
      if (!res.ok) throw new Error('Failed to fetch deals');
      const json = await res.json();

      const mapped: CalendarDeal[] = (json.deals || []).map(
        (d: Record<string, unknown>) => ({
          id: d.id as string,
          title: d.title as string,
          vendor_name:
            (d.vendor as { business_name: string } | null)?.business_name ||
            'Unknown Vendor',
          deal_type: (d.deal_type as string) || 'steady',
          status: (d.status as string) || 'draft',
          starts_at: (d.starts_at as string) || '',
          expires_at: (d.expires_at as string) || '',
          created_at: (d.created_at as string) || '',
        })
      );

      setDeals(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchDeals();
  }, [user, fetchDeals]);

  // ── Calendar data ──────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  /** Map of day-of-month -> deals active on that day */
  const dealsByDay = useMemo(() => {
    const map: Record<number, CalendarDeal[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const active = deals.filter((d) => isDealActiveOnDate(d, date));
      if (active.length > 0) {
        map[day] = active;
      }
    }
    return map;
  }, [deals, viewYear, viewMonth, daysInMonth]);

  /** Deals for the currently selected date */
  const selectedDeals = useMemo(() => {
    if (!selectedDate) return [];
    return deals.filter((d) => isDealActiveOnDate(d, selectedDate));
  }, [deals, selectedDate]);

  // ── Navigation ─────────────────────────────────────────────────────

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDate(null);
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(today);
  }

  // ── Render helpers ─────────────────────────────────────────────────

  function renderCalendarCells() {
    const cells: React.ReactNode[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div key={`empty-${i}`} className="min-h-[90px] bg-gray-50/50 rounded-lg" />
      );
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const isToday = isSameDay(date, today);
      const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
      const dayDeals = dealsByDay[day] || [];
      const spontiCount = dayDeals.filter((d) => d.deal_type === 'sponti').length;
      const steadyCount = dayDeals.filter((d) => d.deal_type === 'steady').length;

      cells.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`min-h-[90px] rounded-lg border text-left p-2 transition-all hover:shadow-md cursor-pointer ${
            isSelected
              ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
              : isToday
              ? 'border-primary-300 bg-primary-50/40'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          {/* Day number */}
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-semibold ${
                isToday
                  ? 'bg-primary-500 text-white w-6 h-6 rounded-full flex items-center justify-center'
                  : isSelected
                  ? 'text-primary-700'
                  : 'text-gray-700'
              }`}
            >
              {day}
            </span>
            {dayDeals.length > 0 && (
              <span className="text-[10px] text-gray-400 font-medium">
                {dayDeals.length}
              </span>
            )}
          </div>

          {/* Deal dots / pills */}
          {dayDeals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {spontiCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {spontiCount}
                </span>
              )}
              {steadyCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {steadyCount}
                </span>
              )}
            </div>
          )}

          {/* Show first 2 deal titles when space allows */}
          <div className="hidden lg:block mt-1 space-y-0.5">
            {dayDeals.slice(0, 2).map((d) => (
              <div
                key={d.id}
                className={`text-[10px] truncate rounded px-1 py-0.5 ${
                  d.deal_type === 'sponti'
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {d.title}
              </div>
            ))}
            {dayDeals.length > 2 && (
              <div className="text-[10px] text-gray-400 px-1">
                +{dayDeals.length - 2} more
              </div>
            )}
          </div>
        </button>
      );
    }

    return cells;
  }

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={fetchDeals}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Deal Calendar</h1>
            <p className="text-sm text-gray-500">
              Monthly view of all deals &mdash; {deals.length} total
            </p>
          </div>
        </div>
        <button
          onClick={fetchDeals}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Calendar Card */}
      <div className="card p-6 mb-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-secondary-500">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
            >
              Today
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            Sponti
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Steady
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-400 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarCells()}
        </div>
      </div>

      {/* Selected Day Panel */}
      {selectedDate && (
        <div className="card">
          <div className="flex items-center gap-2 p-6 border-b border-gray-100">
            <Clock className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-secondary-500">
              Deals on{' '}
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
            <span className="ml-auto text-sm text-gray-400">
              {selectedDeals.length} deal{selectedDeals.length !== 1 ? 's' : ''}
            </span>
          </div>

          {selectedDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Calendar className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">No deals active on this day</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Deal type icon */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      deal.deal_type === 'sponti'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {deal.deal_type === 'sponti' ? (
                      <Zap className="w-5 h-5" />
                    ) : (
                      <Tag className="w-5 h-5" />
                    )}
                  </div>

                  {/* Deal info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary-500 truncate">
                      {deal.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {deal.vendor_name}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                        deal.deal_type === 'sponti'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {deal.deal_type === 'sponti' ? 'Sponti' : 'Steady'}
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusColor(
                        deal.status
                      )}`}
                    >
                      {deal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state when no deals at all */}
      {deals.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium text-gray-500 mb-1">No deals found</p>
          <p className="text-sm">Deals will appear on the calendar once created.</p>
        </div>
      )}
    </div>
  );
}
