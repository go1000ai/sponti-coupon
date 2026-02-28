import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/auth/switch-role — toggle between vendor and customer mode
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const targetRole = body.role as string;

    if (!['vendor', 'customer'].includes(targetRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify user has the target role capability
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'vendor') {
      return NextResponse.json({ error: 'Role switching is only available for vendors' }, { status: 403 });
    }

    // If switching to customer, verify customer record exists
    if (targetRole === 'customer') {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'No customer record. Use become-customer first.' }, { status: 400 });
      }
    }

    // Update active_role (null = use primary role i.e. vendor)
    const adminClient = await createServiceRoleClient();
    const activeRole = targetRole === 'vendor' ? null : targetRole;

    await adminClient
      .from('user_profiles')
      .update({ active_role: activeRole })
      .eq('id', user.id);

    return NextResponse.json({ success: true, active_role: targetRole });
  } catch (error) {
    console.error('[switch-role] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
