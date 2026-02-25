'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useInactivityTimeout } from '@/lib/hooks/useInactivityTimeout';

/**
 * InactivityGuard
 *
 * Renders invisibly in the root layout. Activates the inactivity timer
 * only when the user is on a protected route (/vendor, /admin, /dashboard).
 * After 1 hour of no activity the user is signed out and redirected to login.
 */

const PROTECTED_PREFIXES = ['/vendor', '/admin', '/dashboard'];

export function InactivityGuard() {
  const pathname = usePathname();
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    setIsProtected(PROTECTED_PREFIXES.some(p => pathname.startsWith(p)));
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // Fallback — cookies will be stale and middleware will handle it
    }
    // Redirect to login with inactivity reason
    window.location.href = '/auth/login?reason=inactivity';
  };

  useInactivityTimeout(handleSignOut, isProtected);

  return null; // Invisible — no UI rendered
}
