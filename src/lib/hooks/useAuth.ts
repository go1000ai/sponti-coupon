'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserRole, WorkerPermissions } from '@/lib/types/database';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  activeRole: UserRole | null; // which mode they're in (null = primary role)
  isAlsoCustomer: boolean; // vendor who also has a customer record
  loading: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  // Worker (staff) accounts: their employer vendor + granted permissions.
  employerVendorId: string | null;
  employerBusinessName: string | null;
  workerPermissions: WorkerPermissions | null;
}

/**
 * Fetches the user's role from the server API.
 * This avoids using the Supabase browser client for queries, which can
 * deadlock if called from inside onAuthStateChange (because data queries
 * call getSession() which awaits initializePromise).
 */
interface ServerProfile {
  id: string;
  email: string;
  role: UserRole | null;
  active_role: UserRole | null;
  is_also_customer: boolean;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  employer_vendor_id: string | null;
  employer_business_name: string | null;
  worker_permissions: WorkerPermissions | null;
}

async function fetchRoleFromServer(): Promise<ServerProfile | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.id) return null;
    return {
      id: data.id,
      email: data.email,
      role: data.role as UserRole | null,
      active_role: data.active_role as UserRole | null,
      is_also_customer: data.is_also_customer || false,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      avatar_url: data.avatar_url || null,
      employer_vendor_id: data.employer_vendor_id || null,
      employer_business_name: data.employer_business_name || null,
      worker_permissions: data.worker_permissions || null,
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, role: null, activeRole: null, isAlsoCustomer: false, loading: true, firstName: null, lastName: null, avatarUrl: null, employerVendorId: null, employerBusinessName: null, workerPermissions: null });
  const supabaseRef = useRef(createClient());
  const resolvedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Allow components to update the avatar URL immediately (e.g. after upload).
  // Dispatches a custom event so ALL useAuth instances (e.g. sidebar) update too.
  const setAvatarUrl = (url: string | null) => {
    setState((prev) => ({ ...prev, avatarUrl: url }));
    window.dispatchEvent(new CustomEvent('avatar-updated', { detail: url }));
  };

  // Listen for avatar updates from other useAuth instances
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail as string | null;
      setState((prev) => ({ ...prev, avatarUrl: url }));
    };
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);

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
        lastUserIdRef.current = null;
        setState({ user: null, role: null, activeRole: null, isAlsoCustomer: false, loading: false, firstName: null, lastName: null, avatarUrl: null, employerVendorId: null, employerBusinessName: null, workerPermissions: null });
        return;
      }

      if (session?.user) {
        // Skip redundant work: Supabase re-fires SIGNED_IN on tab focus and
        // TOKEN_REFRESHED periodically. If we've already resolved this same user
        // and it isn't a real profile change, do nothing — otherwise every tab
        // refocus would re-fetch /api/auth/me and re-render the whole dashboard
        // (the "dashboard refreshing itself" symptom).
        if (resolvedRef.current && lastUserIdRef.current === session.user.id && event !== 'USER_UPDATED') {
          return;
        }
        // Use server API to get role — avoids Supabase client deadlock
        const profile = await fetchRoleFromServer();
        if (cancelled) return;
        resolvedRef.current = true;
        lastUserIdRef.current = session.user.id;
        setState({
          user: session.user,
          role: profile?.role ?? null,
          activeRole: profile?.active_role ?? null,
          isAlsoCustomer: profile?.is_also_customer ?? false,
          loading: false,
          firstName: profile?.first_name ?? null,
          lastName: profile?.last_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          employerVendorId: profile?.employer_vendor_id ?? null,
          employerBusinessName: profile?.employer_business_name ?? null,
          workerPermissions: profile?.worker_permissions ?? null,
        });
      } else if (event === 'INITIAL_SESSION') {
        resolvedRef.current = true;
        setState({ user: null, role: null, activeRole: null, isAlsoCustomer: false, loading: false, firstName: null, lastName: null, avatarUrl: null, employerVendorId: null, employerBusinessName: null, workerPermissions: null });
      }
    });

    // Strategy 2: Fallback — if onAuthStateChange hasn't resolved within 2s
    // (e.g. initializePromise is stuck), check auth state via server API directly.
    const fallbackTimer = setTimeout(async () => {
      if (cancelled || resolvedRef.current) return;

      const profile = await fetchRoleFromServer();
      if (cancelled || resolvedRef.current) return;

      resolvedRef.current = true;
      lastUserIdRef.current = profile?.id ?? null;
      if (profile) {
        // Try to grab the real Supabase User so JWT claims (aud, user_metadata,
        // app_metadata, etc.) are present for downstream consumers. Race it against a
        // short timeout — if getSession() is itself stuck, fall back to a synthetic
        // User with the minimum fields the type requires.
        let realUser: User | null = null;
        try {
          realUser = await Promise.race<User | null>([
            supabase.auth.getSession().then(({ data }) => data.session?.user ?? null),
            new Promise<User | null>((resolve) => setTimeout(() => resolve(null), 500)),
          ]);
        } catch { /* ignore, fall through to synthetic */ }

        const syntheticUser: User = {
          id: profile.id,
          email: profile.email,
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: '',
          // Cast: we only fill what the partial path needs; consumers shouldn't depend on
          // the rest in the synthetic case (see _isSynthetic flag below).
        } as unknown as User;

        setState({
          user: realUser ?? syntheticUser,
          role: profile.role,
          activeRole: profile.active_role,
          isAlsoCustomer: profile.is_also_customer,
          loading: false,
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatarUrl: profile.avatar_url,
          employerVendorId: profile.employer_vendor_id,
          employerBusinessName: profile.employer_business_name,
          workerPermissions: profile.worker_permissions,
        });
      } else {
        setState({ user: null, role: null, activeRole: null, isAlsoCustomer: false, loading: false, firstName: null, lastName: null, avatarUrl: null, employerVendorId: null, employerBusinessName: null, workerPermissions: null });
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
    setState({ user: null, role: null, activeRole: null, isAlsoCustomer: false, loading: false, firstName: null, lastName: null, avatarUrl: null, employerVendorId: null, employerBusinessName: null, workerPermissions: null });
    window.location.href = '/';
  };

  // Switch between vendor and customer mode
  const switchRole = async (targetRole: 'vendor' | 'customer') => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        setState(prev => ({ ...prev, activeRole: targetRole === 'vendor' ? null : targetRole }));
        // Redirect to the appropriate dashboard
        window.location.href = targetRole === 'vendor' ? '/vendor/dashboard' : '/dashboard';
      }
    } catch {
      // silently fail
    }
  };

  // Create customer record for a vendor (one-time "Become a Customer")
  const becomeCustomer = async () => {
    try {
      const res = await fetch('/api/auth/become-customer', { method: 'POST' });
      if (res.ok) {
        setState(prev => ({ ...prev, isAlsoCustomer: true, activeRole: 'customer' }));
        window.location.href = '/dashboard';
      }
    } catch {
      // silently fail
    }
  };

  // The effective role the user is currently operating as
  const effectiveRole = state.activeRole || state.role;

  return { ...state, effectiveRole, signOut, setAvatarUrl, switchRole, becomeCustomer };
}
