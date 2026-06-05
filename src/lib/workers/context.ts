import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_WORKER_PERMISSIONS, type WorkerPermissions } from '@/lib/types/database';

export interface VendorContext {
  userId: string;          // the logged-in auth user
  vendorId: string;        // effective vendor id (owner's id, or a worker's employer)
  isWorker: boolean;
  permissions: WorkerPermissions;
}

const OWNER_PERMISSIONS: WorkerPermissions = {
  redeem: true, loyalty: true, deals: true, analytics: true, appointments: true,
};

/**
 * Resolve which vendor the current request acts on behalf of, and with what
 * permissions. Owners get full permissions; workers get their employer's id and
 * their granted flags. Returns null if not authenticated or not a vendor/worker.
 */
export async function resolveVendorContext(): Promise<VendorContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'vendor') {
    return { userId: user.id, vendorId: user.id, isWorker: false, permissions: OWNER_PERMISSIONS };
  }

  if (profile?.role === 'worker') {
    const service = await createServiceRoleClient();
    const { data: member } = await service
      .from('team_members')
      .select('vendor_id, permissions, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!member) return null;
    return {
      userId: user.id,
      vendorId: member.vendor_id,
      isWorker: true,
      permissions: { ...DEFAULT_WORKER_PERMISSIONS, ...(member.permissions || {}) },
    };
  }

  return null;
}

/** True if the context may use a feature (owners always; workers per their flags). */
export function can(ctx: VendorContext, feature: keyof WorkerPermissions): boolean {
  return !ctx.isWorker || ctx.permissions[feature] === true;
}
