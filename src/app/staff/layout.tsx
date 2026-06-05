'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';
import { LogOut, Loader2 } from 'lucide-react';

/**
 * Minimal chrome for worker (staff) accounts. Workers have the `worker` role
 * and don't get the full vendor dashboard — just their permitted screens
 * (redeem-only for now).
 */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, role, firstName, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/auth/login?redirect=/staff/redeem'); return; }
    // Only worker accounts belong here; send anyone else to their own home.
    if (role && role !== 'worker') {
      router.replace(role === 'vendor' ? '/vendor/dashboard' : '/dashboard');
    }
  }, [loading, user, role, router]);

  if (loading || !user || role !== 'worker') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-900 text-white">
        <Image src="/logo.png" alt="SpontiCoupon" width={140} height={42} className="h-8 w-auto brightness-110" />
        <div className="flex items-center gap-3">
          {firstName && <span className="text-sm text-white/70 hidden sm:inline">{firstName}</span>}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
