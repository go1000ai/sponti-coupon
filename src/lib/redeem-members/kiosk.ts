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

export function isKioskActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KIOSK_KEY) === '1';
}

export function startKiosk() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KIOSK_KEY, '1');
  notify();
}

export function clearKiosk() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KIOSK_KEY);
  sessionStorage.removeItem(MEMBER_KEY);
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
