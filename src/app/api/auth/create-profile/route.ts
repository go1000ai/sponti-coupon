import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { accountType, ...profileData } = body;

    if (!accountType || !['customer', 'vendor'].includes(accountType)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const adminClient = await createServiceRoleClient();

    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      // Profile already exists — return the role
      const { data: profile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ role: profile?.role, alreadyExists: true });
    }

    // Create user profile
    await adminClient.from('user_profiles').insert({
      id: user.id,
      role: accountType,
    });

    if (accountType === 'vendor') {
      await adminClient.from('vendors').insert({
        id: user.id,
        business_name: profileData.businessName || 'My Business',
        email: user.email || '',
        phone: profileData.phone || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zip: profileData.zip || null,
        category: profileData.category || null,
        subscription_tier: 'starter',
        subscription_status: 'trialing',
      });
    } else {
      await adminClient.from('customers').insert({
        id: user.id,
        email: user.email || '',
        first_name: profileData.firstName || null,
        last_name: profileData.lastName || null,
        phone: profileData.phone || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zip: profileData.zip || null,
      });
    }

    return NextResponse.json({ role: accountType, created: true });
  } catch (error: unknown) {
    console.error('Profile creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
