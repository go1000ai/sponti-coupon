import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get role from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let role = profile?.role || null;

    // Fallback: check vendors table
    if (!role) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', user.id)
        .single();

      if (vendor) {
        role = 'vendor';
        // Auto-fix missing profile
        const { createServiceRoleClient } = await import('@/lib/supabase/server');
        const adminClient = await createServiceRoleClient();
        await adminClient.from('user_profiles').upsert({ id: user.id, role: 'vendor' });
      }
    }

    // Fallback: check customers table
    if (!role) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', user.id)
        .single();

      if (customer) {
        role = 'customer';
        const { createServiceRoleClient } = await import('@/lib/supabase/server');
        const adminClient = await createServiceRoleClient();
        await adminClient.from('user_profiles').upsert({ id: user.id, role: 'customer' });
      }
    }

    // If vendor, get subscription info too
    let subscription_status = null;
    let subscription_tier = null;
    if (role === 'vendor') {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('subscription_status, subscription_tier')
        .eq('id', user.id)
        .single();

      subscription_status = vendor?.subscription_status || null;
      subscription_tier = vendor?.subscription_tier || null;
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role,
      subscription_status,
      subscription_tier,
    });
  } catch (error) {
    console.error('[/api/auth/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
