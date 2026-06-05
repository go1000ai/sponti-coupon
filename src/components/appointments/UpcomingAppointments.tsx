'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CalendarCheck, ArrowRight, Clock, MapPin, Store, User, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ApptVendor { business_name?: string; address?: string; city?: string; state?: string; }
interface ApptCustomer { first_name?: string | null; last_name?: string | null; email?: string; }
interface ApptDeal { title?: string; }
interface UpcomingAppt {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  deal?: ApptDeal | null;
  vendor?: ApptVendor | null;
  customer?: ApptCustomer | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-green-50 text-green-700' },
};

export function UpcomingAppointments({ role, limit = 3 }: { role: 'customer' | 'vendor'; limit?: number }) {
  const [appts, setAppts] = useState<UpcomingAppt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/appointments?status=upcoming&role=${role}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setAppts((data.appointments || []).slice(0, limit));
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role, limit]);

  // Hide entirely when there's nothing upcoming (keeps the dashboard clean).
  if (!loading && appts.length === 0) return null;

  const href = role === 'vendor' ? '/vendor/appointments' : '/dashboard/appointments';

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-secondary-500 to-secondary-400 rounded-lg p-1.5">
            <CalendarClock className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Upcoming Appointments</h2>
        </div>
        <Link href={href} className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 group">
          View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {loading ? (
        <div className="card p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
      ) : (
        <div className="space-y-3">
          {appts.map((a) => {
            const badge = STATUS_BADGE[a.status] || { label: a.status, cls: 'bg-gray-100 text-gray-600' };
            const customerName = [a.customer?.first_name, a.customer?.last_name].filter(Boolean).join(' ').trim()
              || a.customer?.email || 'Customer';
            const secondaryLine = role === 'vendor'
              ? customerName
              : (a.vendor?.business_name || 'Business');
            const location = role === 'customer'
              ? [a.vendor?.address, a.vendor?.city, a.vendor?.state].filter(Boolean).join(', ')
              : '';
            return (
              <Link key={a.id} href={href} className="card p-4 flex items-center gap-4 hover:shadow-lg transition-all group">
                <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 bg-gradient-to-br from-primary-50 to-orange-50 rounded-xl py-2">
                  <span className="text-[10px] font-bold text-primary-500 uppercase">{format(parseISO(a.start_time), 'MMM')}</span>
                  <span className="text-xl font-extrabold text-gray-900 leading-none">{format(parseISO(a.start_time), 'd')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{a.deal?.title || 'Appointment'}</p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    {role === 'vendor' ? <User className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                    {secondaryLine}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(a.start_time), 'h:mm a')}</span>
                    {location && <span className="hidden sm:flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{location}</span>}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                  {a.status === 'confirmed' && <CalendarCheck className="w-3 h-3" />}
                  {badge.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
