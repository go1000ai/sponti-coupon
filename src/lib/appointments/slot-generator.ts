import { addMinutes, parseISO, isBefore, isEqual, format, startOfDay, setHours, setMinutes } from 'date-fns';
import type { VendorAppointmentSettings, VendorAvailability, DealAvailabilityOverride, TimeSlot } from '@/lib/types/database';

interface ExistingAppointment {
  start_time: string;  // ISO 8601
  end_time: string;    // ISO 8601
  status: string;
}

interface SlotGeneratorInput {
  date: Date;                                    // The date to generate slots for
  vendorAvailability: VendorAvailability | null;  // Vendor's availability for this day_of_week
  dealOverride: DealAvailabilityOverride | null;  // Optional per-deal override
  settings: VendorAppointmentSettings;            // Vendor's appointment settings
  existingAppointments: ExistingAppointment[];    // Already booked appointments on this date
  timezone: string;                               // Vendor's timezone (e.g., "America/New_York")
}

/**
 * Generates available time slots for a given date.
 * Pure function — no database calls.
 */
export function generateTimeSlots(input: SlotGeneratorInput): TimeSlot[] {
  const { date, vendorAvailability, dealOverride, settings, existingAppointments } = input;

  // If vendor hasn't set availability for this day, no slots
  if (!vendorAvailability || !vendorAvailability.is_available) {
    return [];
  }

  // Determine the time window
  const dayOfWeek = date.getDay().toString();
  let startTimeStr = vendorAvailability.start_time; // "09:00"
  let endTimeStr = vendorAvailability.end_time;     // "17:00"

  // Apply deal-level override if it exists for this day
  if (dealOverride && dealOverride[dayOfWeek]) {
    startTimeStr = dealOverride[dayOfWeek].start;
    endTimeStr = dealOverride[dayOfWeek].end;
  }

  // Parse start and end times into Date objects for the given date
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const [endHour, endMin] = endTimeStr.split(':').map(Number);

  const dayStart = startOfDay(date);
  const windowStart = setMinutes(setHours(dayStart, startHour), startMin);
  const windowEnd = setMinutes(setHours(dayStart, endHour), endMin);

  const { slot_duration_minutes, buffer_minutes, max_concurrent } = settings;
  const stepMinutes = slot_duration_minutes + buffer_minutes;

  // Filter to active appointments (pending or confirmed count against capacity)
  const activeAppointments = existingAppointments.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed'
  );

  const slots: TimeSlot[] = [];
  let slotStart = windowStart;

  while (true) {
    const slotEnd = addMinutes(slotStart, slot_duration_minutes);

    // Stop if slot would extend beyond the window
    if (isBefore(windowEnd, slotEnd) || isEqual(windowEnd, slotStart)) {
      break;
    }

    // Count overlapping appointments for this slot
    const overlapping = activeAppointments.filter((appt) => {
      const apptStart = parseISO(appt.start_time);
      const apptEnd = parseISO(appt.end_time);
      // Overlap: apptStart < slotEnd AND apptEnd > slotStart
      return isBefore(apptStart, slotEnd) && isBefore(slotStart, apptEnd);
    });

    const remaining = max_concurrent - overlapping.length;
    const available = remaining > 0;

    // Skip slots in the past (if generating for today)
    const now = new Date();
    const isPast = isBefore(slotStart, now);

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: available && !isPast,
      remaining: isPast ? 0 : Math.max(0, remaining),
    });

    // Move to next slot
    slotStart = addMinutes(slotStart, stepMinutes);
  }

  return slots;
}

/**
 * Maps a Date to day_of_week (0=Sunday, matching JS getDay())
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Formats a time slot for display
 */
export function formatSlotTime(isoString: string, _timezone?: string): string {
  void _timezone; // reserved for future timezone-aware formatting
  const date = parseISO(isoString);
  return format(date, 'h:mm a');
}

/**
 * Checks if a date is within the advance booking window
 */
export function isWithinBookingWindow(date: Date, advanceBookingDays: number): boolean {
  const now = new Date();
  const today = startOfDay(now);
  const targetDay = startOfDay(date);
  const maxDate = addMinutes(today, advanceBookingDays * 24 * 60);

  return !isBefore(targetDay, today) && !isBefore(maxDate, targetDay);
}
