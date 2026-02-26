import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get role and name from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    let role = profile?.role || null;
    const firstName = profile?.first_name || null;
    const lastName = profile?.last_name || null;

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

    const avatarUrl = user.user_metadata?.avatar_url || null;

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl,
      subscription_status,
      subscription_tier,
    });
  } catch (error) {
    console.error('[/api/auth/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/auth/me
 * Update the current user's own profile (name, email, password).
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();
    const result: Record<string, unknown> = {};

    // Update first_name / last_name in user_profiles
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const nameUpdate: Record<string, string | null> = {};
      if (body.first_name !== undefined) nameUpdate.first_name = (body.first_name as string)?.trim() || null;
      if (body.last_name !== undefined) nameUpdate.last_name = (body.last_name as string)?.trim() || null;

      const { error: nameError } = await serviceClient
        .from('user_profiles')
        .update(nameUpdate)
        .eq('id', user.id);

      if (nameError) {
        console.error('[PUT /api/auth/me] Name update error:', nameError);
        return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
      }

      if (body.first_name !== undefined) result.first_name = nameUpdate.first_name;
      if (body.last_name !== undefined) result.last_name = nameUpdate.last_name;
    }

    // Update email
    if (body.email !== undefined) {
      const email = (body.email as string).trim();
      if (!email) {
        return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      }

      const { error: emailError } = await serviceClient.auth.admin.updateUserById(user.id, { email });

      if (emailError) {
        console.error('[PUT /api/auth/me] Email update error:', emailError);
        return NextResponse.json({ error: emailError.message || 'Failed to update email' }, { status: 500 });
      }

      result.email = email;
    }

    // Update avatar URL (stored in auth user metadata)
    if (body.avatar_url !== undefined) {
      const { error: avatarError } = await serviceClient.auth.admin.updateUserById(user.id, {
        user_metadata: { avatar_url: body.avatar_url as string },
      });

      if (avatarError) {
        console.error('[PUT /api/auth/me] Avatar update error:', avatarError);
        return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
      }

      result.avatar_url = body.avatar_url;
    }

    // Update password
    if (body.password !== undefined) {
      const password = body.password as string;
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json({ error: 'Password must include uppercase, lowercase, and a number' }, { status: 400 });
      }

      const { error: passwordError } = await serviceClient.auth.admin.updateUserById(user.id, { password });

      if (passwordError) {
        console.error('[PUT /api/auth/me] Password update error:', passwordError);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }

      result.password_updated = true;
    }

    if (Object.keys(result).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[PUT /api/auth/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
