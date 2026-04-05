'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, startOfDay, isSameDay, isSameMonth } from 'date-fns';
import {
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
  Loader2, Phone, MessageSquare, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@/lib/types/database';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; dotColor: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dotColor: 'bg-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-700 border-green-200', dotColor: 'bg-green-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  rescheduled: { label: 'Rescheduled', color: 'bg-gray-50 text-gray-700 border-gray-200', dotColor: 'bg-gray-400', icon: <Calendar className="w-3.5 h-3.5" /> },
  no_show: { label: 'No Show', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-600', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function VendorAppointmentsPage() {
  const { user, role } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?status=all&role=vendor`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load appointments' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  async function handleAction(appointmentId: string, action: string) {
    setActionLoading(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Action failed' }); return; }
      setMessage({ type: 'success', text: `Appointment ${action === 'no_show' ? 'marked as no-show' : action + 'ed'} successfully` });
      fetchAppointments();
    } catch {
      setMessage({ type: 'error', text: 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  }

  if (!user || role !== 'vendor') return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = startOfDay(new Date());

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) =>
    appointments.filter(a => isSameDay(parseISO(a.start_time), date));

  // Appointments for selected day
  const selectedAppointments = getAppointmentsForDate(selectedDate);

  // Stats
  const monthAppointments = appointments.filter(a => isSameMonth(parseISO(a.start_time), currentMonth));
  const confirmedCount = monthAppointments.filter(a => a.status === 'confirmed').length;
  const pendingCount = monthAppointments.filter(a => a.status === 'pending').length;
  const completedCount = monthAppointments.filter(a => a.status === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{monthAppointments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-green-600 uppercase font-medium">Confirmed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-yellow-600 uppercase font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">{MONTH_NAMES[month]} {year}</h2>
              <button onClick={() => { setCurrentMonth(new Date()); setSelectedDate(today); }} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                Today
              </button>
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 border-t border-gray-100" />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);
              const dayAppointments = getAppointmentsForDate(date);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(startOfDay(date))}
                  className={`h-20 border-t border-gray-100 p-1 text-left transition-colors relative ${
                    isSelected ? 'bg-primary-50 ring-2 ring-primary-300 rounded-lg z-10' :
                    isToday ? 'bg-orange-50' :
                    'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    isToday ? 'text-primary-600 font-bold' :
                    isSelected ? 'text-primary-700' :
                    'text-gray-700'
                  }`}>
                    {day}
                  </span>

                  {/* Appointment dots */}
                  {dayAppointments.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayAppointments.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className={`w-2 h-2 rounded-full ${STATUS_CONFIG[a.status].dotColor}`}
                          title={`${format(parseISO(a.start_time), 'h:mm a')} — ${a.status}`}
                        />
                      ))}
                      {dayAppointments.length > 4 && (
                        <span className="text-[9px] text-gray-400 font-medium">+{dayAppointments.length - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            {(['confirmed', 'pending', 'completed', 'cancelled'] as AppointmentStatus[]).map(status => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[status].dotColor}`} />
                {STATUS_CONFIG[status].label}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Detail */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            </div>
          ) : selectedAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map((appt) => {
                  const statusConfig = STATUS_CONFIG[appt.status];
                  const deal = appt.deal as { title: string } | undefined;
                  const customer = appt.customer as { email: string; first_name: string; last_name: string; phone: string } | undefined;
                  const customerName = customer
                    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
                    : 'Unknown';

                  return (
                    <div key={appt.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      {/* Time + Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(parseISO(appt.start_time), 'h:mm a')} — {format(parseISO(appt.end_time), 'h:mm a')}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customerName}</p>
                          {customer?.phone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Deal */}
                      {deal && <p className="text-xs text-gray-500">{deal.title}</p>}

                      {/* Notes */}
                      {appt.customer_notes && (
                        <p className="text-xs text-gray-400 italic flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {appt.customer_notes}
                        </p>
                      )}

                      {/* Actions */}
                      {['pending', 'confirmed'].includes(appt.status) && (
                        <div className="flex gap-1.5 pt-1">
                          {appt.status === 'pending' && (
                            <button
                              onClick={() => handleAction(appt.id, 'confirm')}
                              disabled={actionLoading === appt.id}
                              className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(appt.id, 'complete')}
                            disabled={actionLoading === appt.id}
                            className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleAction(appt.id, 'cancel')}
                            disabled={actionLoading === appt.id}
                            className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
