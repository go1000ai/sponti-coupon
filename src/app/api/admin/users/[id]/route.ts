import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PUT /api/admin/users/[id]
 * Update a user. Supports:
 *   - { role: 'vendor' | 'customer' | 'admin' } — changes role in user_profiles
 *   - { disabled: boolean } — enables/disables the user via supabase.auth.admin.updateUserById()
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

    const result: { role?: string; disabled?: boolean } = {};

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
