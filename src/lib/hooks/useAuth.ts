'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/types/database';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

/**
 * Fetches the user's role from the server API.
 * This avoids using the Supabase browser client for queries, which can
 * deadlock if called from inside onAuthStateChange (because data queries
 * call getSession() which awaits initializePromise).
 */
async function fetchRoleFromServer(): Promise<{ id: string; email: string; role: UserRole | null } | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.id) return null;
    return { id: data.id, email: data.email, role: data.role as UserRole | null };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true });
  const supabaseRef = useRef(createClient());
  const resolvedRef = useRef(false);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;

    // Strategy 1: Listen for auth state changes (normal Supabase path).
    // When we get an event, fetch the role from the server API (not from
    // the Supabase client, to avoid the getSession() deadlock).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT') {
        resolvedRef.current = true;
        setState({ user: null, role: null, loading: false });
        return;
      }

      if (session?.user) {
        // Use server API to get role — avoids Supabase client deadlock
        const profile = await fetchRoleFromServer();
        if (cancelled) return;
        resolvedRef.current = true;
        setState({
          user: session.user,
          role: profile?.role ?? null,
          loading: false,
        });
      } else if (event === 'INITIAL_SESSION') {
        resolvedRef.current = true;
        setState({ user: null, role: null, loading: false });
      }
    });

    // Strategy 2: Fallback — if onAuthStateChange hasn't resolved within 2s
    // (e.g. initializePromise is stuck), check auth state via server API directly.
    const fallbackTimer = setTimeout(async () => {
      if (cancelled || resolvedRef.current) return;

      const profile = await fetchRoleFromServer();
      if (cancelled || resolvedRef.current) return;

      resolvedRef.current = true;
      if (profile) {
        setState({
          user: { id: profile.id, email: profile.email } as User,
          role: profile.role,
          loading: false,
        });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Sign out via server API to avoid browser client initializePromise deadlock
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // Fallback: try browser client signout
      try { await supabaseRef.current.auth.signOut(); } catch { /* ignore */ }
    }
    setState({ user: null, role: null, loading: false });
    window.location.href = '/';
  };

  return { ...state, signOut };
}
