'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import {
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
  Loader2, Phone, MessageSquare,
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

export default function VendorAppointmentsPage() {
  const { user, role } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('upcoming');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAppointments();
  }, [user, tab]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?status=${tab}&role=vendor`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load appointments' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(appointmentId: string, action: string, reason?: string) {
    setActionLoading(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
        return;
      }

      setMessage({ type: 'success', text: `Appointment ${action === 'no_show' ? 'marked as no-show' : action + 'ed'} successfully` });
      fetchAppointments();
    } catch {
      setMessage({ type: 'error', text: 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  }

  if (!user || role !== 'vendor') return null;

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary-500" />
          Appointments
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your customer appointments</p>
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
          <p className="text-gray-500">No {tab} appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const statusConfig = STATUS_CONFIG[appt.status];
            const deal = appt.deal as { title: string; image_url: string } | undefined;
            const customer = appt.customer as { email: string; first_name: string; last_name: string; phone: string } | undefined;
            const customerName = customer
              ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
              : 'Unknown';

            return (
              <div key={appt.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Customer + Status */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{customerName}</p>
                        {customer?.email && (
                          <p className="text-xs text-gray-400">{customer.email}</p>
                        )}
                      </div>
                      <span className={`ml-auto inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Deal + Time */}
                    <div className="ml-10 space-y-1">
                      {deal && (
                        <p className="text-sm text-gray-700 font-medium">{deal.title}</p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(appt.start_time), 'EEE, MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(parseISO(appt.start_time), 'h:mm a')} — {format(parseISO(appt.end_time), 'h:mm a')}
                        </span>
                      </div>

                      {/* Customer contact */}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {customer?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {customer.phone}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {appt.customer_notes && (
                        <div className="flex items-start gap-1 mt-1">
                          <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                          <p className="text-xs text-gray-500 italic">{appt.customer_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {tab === 'upcoming' && (
                    <div className="flex flex-col gap-1.5">
                      {appt.status === 'pending' && (
                        <button
                          onClick={() => handleAction(appt.id, 'confirm')}
                          disabled={actionLoading === appt.id}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {actionLoading === appt.id ? '...' : 'Confirm'}
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(appt.id, 'complete')}
                        disabled={actionLoading === appt.id}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleAction(appt.id, 'no_show')}
                        disabled={actionLoading === appt.id}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        No Show
                      </button>
                      <button
                        onClick={() => handleAction(appt.id, 'cancel')}
                        disabled={actionLoading === appt.id}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
