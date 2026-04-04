'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import {
  Calendar, Clock, MapPin, Phone, Store, Loader2,
  CheckCircle, XCircle, AlertCircle, ExternalLink,
} from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@/lib/types/database';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  rescheduled: { label: 'Rescheduled', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: <Calendar className="w-3.5 h-3.5" /> },
  no_show: { label: 'No Show', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

type TabFilter = 'upcoming' | 'past' | 'cancelled';

export default function CustomerAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('upcoming');
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAppointments();
  }, [user, tab]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?status=${tab}&role=customer`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load appointments' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(appointmentId: string) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    setCancelLoading(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to cancel' });
        return;
      }

      setMessage({ type: 'success', text: 'Appointment cancelled' });
      fetchAppointments();
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel appointment' });
    } finally {
      setCancelLoading(null);
    }
  }

  // Generate Google Calendar URL for "Add to Calendar"
  function getGoogleCalendarUrl(appt: Appointment) {
    const deal = appt.deal as { title: string } | undefined;
    const vendor = appt.vendor as { business_name: string; address: string; city: string; state: string } | undefined;
    const title = encodeURIComponent(`${deal?.title || 'Appointment'} — ${vendor?.business_name || ''}`);
    const startISO = parseISO(appt.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const endISO = parseISO(appt.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const location = vendor ? encodeURIComponent([vendor.address, vendor.city, vendor.state].filter(Boolean).join(', ')) : '';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&location=${location}&sf=true`;
  }

  if (!user) return null;

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary-500" />
          My Appointments
        </h1>
        <p className="text-gray-500 text-sm mt-1">View and manage your booked appointments</p>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {tab} appointments</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'upcoming' ? 'Book an appointment when claiming a deal that requires one' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const statusConfig = STATUS_CONFIG[appt.status];
            const deal = appt.deal as { title: string; image_url: string } | undefined;
            const vendor = appt.vendor as { business_name: string; address: string; city: string; state: string; phone: string; logo_url: string } | undefined;

            return (
              <div key={appt.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                <div className="p-4">
                  {/* Business + Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {vendor?.logo_url ? (
                        <img src={vendor.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                          <Store className="w-4 h-4 text-primary-500" />
                        </div>
                      )}
                      <p className="font-semibold text-gray-900 text-sm">{vendor?.business_name || 'Business'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Deal Title */}
                  {deal && (
                    <p className="text-sm text-gray-700 font-medium mb-2">{deal.title}</p>
                  )}

                  {/* Date + Time */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      {format(parseISO(appt.start_time), 'EEE, MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary-500" />
                      {format(parseISO(appt.start_time), 'h:mm a')} — {format(parseISO(appt.end_time), 'h:mm a')}
                    </span>
                  </div>

                  {/* Location + Phone */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                    {vendor?.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[vendor.address, vendor.city, vendor.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {vendor?.phone && (
                      <a href={`tel:${vendor.phone}`} className="flex items-center gap-1 hover:text-primary-500">
                        <Phone className="w-3 h-3" /> {vendor.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {tab === 'upcoming' && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <a
                      href={getGoogleCalendarUrl(appt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Add to Google Calendar
                    </a>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancelLoading === appt.id}
                      className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {cancelLoading === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
