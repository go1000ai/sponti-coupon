import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/users/[id]
 * Returns full user details for the admin user detail page.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Fetch user profile
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('id, role, first_name, last_name')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch auth user data
    const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(id);

    if (authError || !authData?.user) {
      console.error('[GET /api/admin/users] Auth user fetch error:', authError);
      return NextResponse.json({ error: 'Failed to fetch auth user data' }, { status: 500 });
    }

    const authUser = authData.user;
    const disabled = !!authUser.banned_until && new Date(authUser.banned_until) > new Date();

    // Fetch role-specific data, counts, and support tickets in parallel
    const [vendorResult, customerResult, dealsCountResult, claimsCountResult, ticketsResult] =
      await Promise.all([
        // Vendor data (only if vendor)
        profile.role === 'vendor'
          ? serviceClient.from('vendors').select('*').eq('id', id).single()
          : Promise.resolve({ data: null, error: null }),

        // Customer data (only if customer)
        profile.role === 'customer'
          ? serviceClient.from('customers').select('*').eq('id', id).single()
          : Promise.resolve({ data: null, error: null }),

        // Deals count (for vendors)
        profile.role === 'vendor'
          ? serviceClient
              .from('deals')
              .select('id', { count: 'exact', head: true })
              .eq('vendor_id', id)
          : Promise.resolve({ count: 0, error: null }),

        // Claims count (for customers)
        profile.role === 'customer'
          ? serviceClient
              .from('claims')
              .select('id', { count: 'exact', head: true })
              .eq('customer_id', id)
          : Promise.resolve({ count: 0, error: null }),

        // Recent support tickets
        serviceClient
          .from('support_tickets')
          .select('id, subject, status, created_at')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    // Build response
    const profileRaw = profile as unknown as Record<string, unknown>;
    const user = {
      id: profile.id,
      email: authUser.email ?? null,
      role: profile.role,
      first_name: (profileRaw.first_name as string) || null,
      last_name: (profileRaw.last_name as string) || null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      disabled,
      phone: authUser.phone ?? null,
      vendor_data: profile.role === 'vendor' ? vendorResult.data : null,
      customer_data: profile.role === 'customer' ? customerResult.data : null,
      deals_count: profile.role === 'vendor' ? (dealsCountResult.count ?? 0) : 0,
      claims_count: profile.role === 'customer' ? (claimsCountResult.count ?? 0) : 0,
      support_tickets: ticketsResult.data ?? [],
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update a user. Supports:
 *   - { role: 'vendor' | 'customer' | 'admin' } — changes role in user_profiles
 *   - { disabled: boolean } — enables/disables the user via supabase.auth.admin.updateUserById()
 *   - { email: string } — updates auth email and vendor/customer table email
 *   - { first_name: string } — updates first_name in user_profiles
 *   - { last_name: string } — updates last_name in user_profiles
 *   - { vendor_data: object } — updates fields in the vendors table (vendor users only)
 *   - { customer_data: object } — updates fields in the customers table (customer users only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Verify user profile exists
    const { data: existingProfile, error: profileFetchError } = await serviceClient
      .from('user_profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (profileFetchError || !existingProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admins from modifying their own account
    if (id === admin.userId) {
      return NextResponse.json(
        { error: 'You cannot modify your own account' },
        { status: 400 }
      );
    }

    const currentRole = existingProfile.role;
    const result: Record<string, unknown> = {};

    // Handle role change
    if (body.role !== undefined) {
      const validRoles = ['vendor', 'customer', 'admin'];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be one of: vendor, customer, admin' },
          { status: 400 }
        );
      }

      const { error: roleUpdateError } = await serviceClient
        .from('user_profiles')
        .update({ role: body.role })
        .eq('id', id);

      if (roleUpdateError) {
        console.error('[PUT /api/admin/users] Role update error:', roleUpdateError);
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
      }

      result.role = body.role;
    }

    // Handle disable/enable
    if (body.disabled !== undefined) {
      const shouldDisable = Boolean(body.disabled);

      if (shouldDisable) {
        // Ban the user by setting banned_until to a far-future date
        const { error: banError } = await serviceClient.auth.admin.updateUserById(id, {
          ban_duration: '876000h', // ~100 years
        });

        if (banError) {
          console.error('[PUT /api/admin/users] Ban user error:', banError);
          return NextResponse.json({ error: 'Failed to disable user' }, { status: 500 });
        }
      } else {
        // Unban the user
        const { error: unbanError } = await serviceClient.auth.admin.updateUserById(id, {
          ban_duration: 'none',
        });

        if (unbanError) {
          console.error('[PUT /api/admin/users] Unban user error:', unbanError);
          return NextResponse.json({ error: 'Failed to enable user' }, { status: 500 });
        }
      }

      result.disabled = shouldDisable;
    }

    // Handle email update
    if (body.email !== undefined) {
      const email = body.email.trim();

      if (!email) {
        return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      }

      // Update auth email
      const { error: emailAuthError } = await serviceClient.auth.admin.updateUserById(id, {
        email,
      });

      if (emailAuthError) {
        console.error('[PUT /api/admin/users] Email auth update error:', emailAuthError);
        return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
      }

      // Update email in the role-specific table
      if (currentRole === 'vendor') {
        const { error: vendorEmailError } = await serviceClient
          .from('vendors')
          .update({ email })
          .eq('id', id);

        if (vendorEmailError) {
          console.error('[PUT /api/admin/users] Vendor email update error:', vendorEmailError);
        }
      } else if (currentRole === 'customer') {
        const { error: customerEmailError } = await serviceClient
          .from('customers')
          .update({ email })
          .eq('id', id);

        if (customerEmailError) {
          console.error('[PUT /api/admin/users] Customer email update error:', customerEmailError);
        }
      }

      result.email = email;
    }

    // Handle vendor_data update
    if (body.vendor_data !== undefined && currentRole === 'vendor') {
      const { error: vendorUpdateError } = await serviceClient
        .from('vendors')
        .update(body.vendor_data)
        .eq('id', id);

      if (vendorUpdateError) {
        console.error('[PUT /api/admin/users] Vendor data update error:', vendorUpdateError);
        return NextResponse.json({ error: 'Failed to update vendor data' }, { status: 500 });
      }

      result.vendor_data = body.vendor_data;
    }

    // Handle first_name / last_name update (stored in user_profiles for all roles)
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const nameUpdate: Record<string, string | null> = {};
      if (body.first_name !== undefined) nameUpdate.first_name = body.first_name || null;
      if (body.last_name !== undefined) nameUpdate.last_name = body.last_name || null;

      const { error: nameError } = await serviceClient
        .from('user_profiles')
        .update(nameUpdate)
        .eq('id', id);

      if (nameError) {
        console.error('[PUT /api/admin/users] Name update error:', nameError);
        return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
      }

      if (body.first_name !== undefined) result.first_name = body.first_name;
      if (body.last_name !== undefined) result.last_name = body.last_name;
    }

    // Handle customer_data update
    if (body.customer_data !== undefined && currentRole === 'customer') {
      const { error: customerUpdateError } = await serviceClient
        .from('customers')
        .update(body.customer_data)
        .eq('id', id);

      if (customerUpdateError) {
        console.error('[PUT /api/admin/users] Customer data update error:', customerUpdateError);
        return NextResponse.json({ error: 'Failed to update customer data' }, { status: 500 });
      }

      result.customer_data = body.customer_data;
    }

    if (Object.keys(result).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[PUT /api/admin/users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Hard delete a user: removes user_profiles, associated vendor/customer records, and auth user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admins from deleting their own account
    if (id === admin.userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceRoleClient();

    // Get user profile to determine role
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', id)
      .single();

    // Delete role-specific records
    if (profile?.role === 'vendor') {
      await serviceClient.from('vendors').delete().eq('id', id);
    } else if (profile?.role === 'customer') {
      await serviceClient.from('customers').delete().eq('id', id);
    }

    // Delete user_profiles record
    await serviceClient.from('user_profiles').delete().eq('id', id);

    // Delete the auth user
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.error('[DELETE /api/admin/users] Auth delete error:', authDeleteError);
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
