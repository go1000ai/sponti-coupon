'use client';

/**
 * Client-side state for the redeem kiosk. The device stays logged in as the
 * vendor; the kiosk flag locks the UI to the redeem screen and tracks which
 * staff member is currently active. This is a soft (deterrent) lock suited to
 * a counter device, not a hard security boundary.
 */
const KIOSK_KEY = 'sponti_redeem_kiosk';
const MEMBER_KEY = 'sponti_redeem_member';
export const KIOSK_EVENT = 'redeem-kiosk-changed';

export interface ActiveMember {
  id: string;
  name: string;
}

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(KIOSK_EVENT));
}

// Mirror the kiosk flag into a cookie so the server middleware can read it and
// skip the 1-hour inactivity auto-logout — keeping a shared counter device
// logged in until the owner explicitly exits.
function setKioskCookie(on: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = on
    ? `sb-redeem-kiosk=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    : 'sb-redeem-kiosk=; path=/; max-age=0; samesite=lax';
}

export function isKioskActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KIOSK_KEY) === '1';
}

export function startKiosk() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KIOSK_KEY, '1');
  setKioskCookie(true);
  notify();
}

export function clearKiosk() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KIOSK_KEY);
  sessionStorage.removeItem(MEMBER_KEY);
  setKioskCookie(false);
  notify();
}

export function getActiveMember(): ActiveMember | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MEMBER_KEY);
    return raw ? (JSON.parse(raw) as ActiveMember) : null;
  } catch {
    return null;
  }
}

export function setActiveMember(member: ActiveMember | null) {
  if (typeof window === 'undefined') return;
  if (member) sessionStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  else sessionStorage.removeItem(MEMBER_KEY);
  notify();
}
