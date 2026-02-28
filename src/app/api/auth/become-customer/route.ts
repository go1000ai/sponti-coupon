import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/auth/become-customer — creates a customer record for a vendor user
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a vendor
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'vendor') {
      return NextResponse.json({ error: 'Only vendors can become customers' }, { status: 403 });
    }

    // Check if customer record already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already a customer' });
    }

    // Get vendor info to pre-fill customer record
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, city, state, zip, lat, lng')
      .eq('id', user.id)
      .single();

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Create customer record using service role (bypasses RLS)
    const adminClient = await createServiceRoleClient();
    const { error } = await adminClient
      .from('customers')
      .insert({
        id: user.id,
        email: user.email || '',
        first_name: userProfile?.first_name || null,
        last_name: userProfile?.last_name || null,
        city: vendor?.city || null,
        state: vendor?.state || null,
        zip: vendor?.zip || null,
        lat: vendor?.lat || null,
        lng: vendor?.lng || null,
      });

    if (error) {
      console.error('[become-customer] Error creating customer record:', error);
      return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
    }

    // Set active_role to customer so they switch immediately
    await adminClient
      .from('user_profiles')
      .update({ active_role: 'customer' })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[become-customer] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
