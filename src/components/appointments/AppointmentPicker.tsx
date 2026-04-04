'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2, X, CalendarDays } from 'lucide-react';
import { format, addDays, startOfDay, isBefore, isEqual, parseISO } from 'date-fns';
import type { TimeSlot } from '@/lib/types/database';

interface AppointmentPickerProps {
  dealId: string;
  dealTitle: string;
  businessName: string;
  advanceBookingDays?: number;
  onSelect: (startTime: string) => void;
  onClose: () => void;
}

export default function AppointmentPicker({
  dealId,
  dealTitle,
  businessName,
  advanceBookingDays = 14,
  onSelect,
  onClose,
}: AppointmentPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0); // For horizontal date scrolling
  const [customerNotes, setCustomerNotes] = useState('');

  const today = startOfDay(new Date());
  const maxDate = addDays(today, advanceBookingDays);
  const visibleDays = 7;

  // Generate visible dates
  const visibleDates = Array.from({ length: visibleDays }, (_, i) =>
    addDays(today, dateOffset + i)
  ).filter((d) => !isBefore(maxDate, d));

  const fetchSlots = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/appointments/slots?deal_id=${dealId}&date=${dateStr}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load time slots');
        setSlots([]);
        return;
      }

      setSlots(data.slots || []);
      if (data.blocked) {
        setError('This date is not available');
      }
    } catch {
      setError('Failed to load time slots');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const handleConfirm = () => {
    if (!selectedSlot) return;
    onSelect(selectedSlot.start);
  };

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary-500" />
              Book Your Appointment
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{businessName} — {dealTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Date Selector */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Select a Date</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDateOffset(Math.max(0, dateOffset - visibleDays))}
                disabled={dateOffset === 0}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 flex gap-1.5 overflow-hidden">
                {visibleDates.map((date) => {
                  const isSelected = isEqual(startOfDay(date), startOfDay(selectedDate));
                  const isToday = isEqual(startOfDay(date), today);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(startOfDay(date))}
                      className={`flex-1 min-w-0 py-2 px-1 rounded-xl text-center transition-all ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-medium opacity-70">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-lg font-bold leading-tight">
                        {format(date, 'd')}
                      </div>
                      <div className="text-[10px] opacity-70">
                        {format(date, 'MMM')}
                      </div>
                      {isToday && !isSelected && (
                        <div className="w-1 h-1 bg-primary-500 rounded-full mx-auto mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setDateOffset(dateOffset + visibleDays)}
                disabled={visibleDates.length < visibleDays}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Available Times — {format(selectedDate, 'EEEE, MMMM d')}
            </label>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                <span className="ml-2 text-sm text-gray-500">Loading available times...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No available times on this date</p>
                <p className="text-xs text-gray-400 mt-1">Try selecting a different date</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  const time = format(parseISO(slot.start), 'h:mm a');

                  return (
                    <button
                      key={slot.start}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                      disabled={!slot.available}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-md ring-2 ring-primary-300'
                          : slot.available
                          ? 'bg-gray-50 hover:bg-primary-50 hover:text-primary-600 text-gray-700 border border-gray-200'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {time}
                      {slot.available && slot.remaining <= 2 && slot.remaining > 0 && (
                        <span className="block text-[10px] font-normal opacity-70">
                          {slot.remaining} left
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Notes */}
          {selectedSlot && (
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                Notes (optional)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Any special requests or notes for the vendor..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none resize-none"
                maxLength={500}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {selectedSlot ? (
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-medium">Your Appointment</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-primary-600 font-medium">
                  {format(parseISO(selectedSlot.start), 'h:mm a')} — {format(parseISO(selectedSlot.end), 'h:mm a')}
                </p>
              </div>
              <button
                onClick={handleConfirm}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Confirm & Continue
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed"
            >
              Select a time to continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
