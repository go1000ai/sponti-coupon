import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/social/crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Get a valid Google access token for a vendor.
 * Refreshes if expired.
 */
export async function getGoogleAccessToken(vendorId: string): Promise<string | null> {
  const supabase = await createServiceRoleClient();

  const { data: gcal } = await supabase
    .from('vendor_google_calendar')
    .select('*')
    .eq('vendor_id', vendorId)
    .single();

  if (!gcal) return null;

  // Check if token is expired (5-minute buffer)
  const now = new Date();
  const expiresAt = gcal.token_expires_at ? new Date(gcal.token_expires_at) : new Date(0);
  const isExpired = now.getTime() > expiresAt.getTime() - 5 * 60 * 1000;

  if (!isExpired) {
    return decrypt(gcal.access_token_encrypted);
  }

  // Refresh the token
  try {
    const refreshToken = decrypt(gcal.refresh_token_encrypted);
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('Failed to refresh Google token:', await res.text());
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    // Update stored token
    await supabase
      .from('vendor_google_calendar')
      .update({
        access_token_encrypted: encrypt(newAccessToken),
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq('vendor_id', vendorId);

    return newAccessToken;
  } catch (err) {
    console.error('Google token refresh error:', err);
    return null;
  }
}

/**
 * Create a Google Calendar event for an appointment.
 */
export async function createCalendarEvent(
  vendorId: string,
  appointment: {
    start_time: string;
    end_time: string;
    customer_notes?: string | null;
  },
  customerEmail: string,
  dealTitle: string,
  vendorName: string,
  address?: string,
): Promise<string | null> {
  const accessToken = await getGoogleAccessToken(vendorId);
  if (!accessToken) return null;

  const supabase = await createServiceRoleClient();
  const { data: gcal } = await supabase
    .from('vendor_google_calendar')
    .select('calendar_id')
    .eq('vendor_id', vendorId)
    .single();

  const calendarId = gcal?.calendar_id || 'primary';

  const event = {
    summary: `${dealTitle} — SpontiCoupon`,
    description: `Deal: ${dealTitle}\nVendor: ${vendorName}\n${appointment.customer_notes ? `Notes: ${appointment.customer_notes}` : ''}\n\nBooked via SpontiCoupon`,
    location: address || undefined,
    start: { dateTime: appointment.start_time },
    end: { dateTime: appointment.end_time },
    attendees: [{ email: customerEmail }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) {
      console.error('Failed to create Google Calendar event:', await res.text());
      return null;
    }

    const data = await res.json();
    return data.id; // Google Calendar event ID
  } catch (err) {
    console.error('Google Calendar event creation error:', err);
    return null;
  }
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteCalendarEvent(vendorId: string, eventId: string): Promise<boolean> {
  const accessToken = await getGoogleAccessToken(vendorId);
  if (!accessToken) return false;

  const supabase = await createServiceRoleClient();
  const { data: gcal } = await supabase
    .from('vendor_google_calendar')
    .select('calendar_id')
    .eq('vendor_id', vendorId)
    .single();

  const calendarId = gcal?.calendar_id || 'primary';

  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.ok || res.status === 404; // 404 = already deleted
  } catch {
    return false;
  }
}
