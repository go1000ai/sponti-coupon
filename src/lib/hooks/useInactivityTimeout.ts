'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * useInactivityTimeout
 *
 * Tracks user activity (mouse, keyboard, touch, scroll) and automatically
 * signs the user out after 1 hour of inactivity. Works alongside the
 * server-side middleware check for defense-in-depth.
 *
 * Shows a warning 5 minutes before timeout so the user can take action.
 */

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;    // 1 hour
const WARNING_BEFORE_MS     = 5 * 60 * 1000;      // Warn 5 min before
const THROTTLE_MS           = 30_000;              // Throttle activity tracking to every 30s
const STORAGE_KEY           = 'sb-last-activity';  // Syncs across tabs

const TRACKED_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
] as const;

export function useInactivityTimeout(
  onSignOut: () => void,
  enabled: boolean = true,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);
  const lastUpdateRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
  }, []);

  const dismissWarning = useCallback(() => {
    if (warningShownRef.current) {
      // Remove warning banner if it exists
      const banner = document.getElementById('inactivity-warning');
      if (banner) banner.remove();
      warningShownRef.current = false;
    }
  }, []);

  const showWarning = useCallback(() => {
    if (warningShownRef.current) return;
    warningShownRef.current = true;

    // Create a non-intrusive warning banner at the top of the page
    const banner = document.createElement('div');
    banner.id = 'inactivity-warning';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white; text-align: center; padding: 12px 16px;
      font-size: 14px; font-weight: 500; font-family: system-ui, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideDown 0.3s ease-out;
    `;
    banner.innerHTML = `
      <style>@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}</style>
      <span>You'll be signed out in 5 minutes due to inactivity.</span>
      <button
        onclick="this.parentElement.remove()"
        style="margin-left:12px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:white;padding:4px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600"
      >
        Stay signed in
      </button>
    `;
    document.body.appendChild(banner);

    // Clicking "Stay signed in" counts as activity and resets timers
    const btn = banner.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => {
        warningShownRef.current = false;
        resetTimers();
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeout = useCallback(() => {
    dismissWarning();
    // Perform sign-out
    onSignOut();
  }, [onSignOut, dismissWarning]);

  const resetTimers = useCallback(() => {
    clearTimers();
    dismissWarning();

    const now = Date.now();

    // Set warning timer (fires 5 min before timeout)
    warningRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set sign-out timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, INACTIVITY_TIMEOUT_MS);

    // Persist to localStorage so other tabs can sync
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // localStorage may be unavailable (private browsing)
    }
  }, [clearTimers, dismissWarning, showWarning, handleTimeout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle: only reset if enough time has passed since last reset
    if (now - lastUpdateRef.current < THROTTLE_MS) return;
    lastUpdateRef.current = now;
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) return;

    // Initial timer setup
    resetTimers();

    // Listen for user activity
    TRACKED_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cross-tab sync: if another tab updates activity, reset our timers
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        resetTimers();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearTimers();
      dismissWarning();
      TRACKED_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
    };
  }, [enabled, resetTimers, handleActivity, clearTimers, dismissWarning]);
}
