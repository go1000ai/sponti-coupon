import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PUT /api/admin/vendors/[id]
 * Update vendor fields. Accepts body with any vendor-editable fields.
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
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    // Only allow safe fields to be updated
    const allowedFields = [
      'business_name',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'zip',
      'category',
      'description',
      'website',
      'subscription_tier',
      'subscription_status',
      'logo_url',
      'cover_url',
      'social_links',
      'business_hours',
      'primary_color',
      'secondary_color',
      'accent_color',
      'custom_logo_url',
      'hide_sponticoupon_branding',
      'lat',
      'lng',
      'average_ticket_value',
      'notification_preferences',
      'branding',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    const hasNameUpdates = body.first_name !== undefined || body.last_name !== undefined;

    if (Object.keys(updates).length === 0 && !hasNameUpdates) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Verify vendor exists
    const { data: existing, error: fetchError } = await serviceClient
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Handle first_name/last_name (stored in user_profiles, not vendors)
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const nameUpdate: Record<string, string | null> = {};
      if (body.first_name !== undefined) nameUpdate.first_name = body.first_name || null;
      if (body.last_name !== undefined) nameUpdate.last_name = body.last_name || null;

      const { error: nameError } = await serviceClient
        .from('user_profiles')
        .update(nameUpdate)
        .eq('id', id);

      if (nameError) {
        console.error('[PUT /api/admin/vendors] Name update error:', nameError);
        return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
      }
    }

    // If email is being updated, also update the auth user email
    if (updates.email) {
      const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(id, {
        email: updates.email as string,
      });

      if (authUpdateError) {
        console.error('[PUT /api/admin/vendors] Auth email update error:', authUpdateError);
        return NextResponse.json(
          { error: 'Failed to update user email' },
          { status: 400 }
        );
      }
    }

    // Update vendor record (only if there are vendor-specific updates)
    let vendor = existing;
    if (Object.keys(updates).length > 0) {
      const { data: updatedVendor, error: updateError } = await serviceClient
        .from('vendors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[PUT /api/admin/vendors] Update error:', updateError);
        return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
      }
      vendor = updatedVendor;
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error('[PUT /api/admin/vendors] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/vendors/[id]
 * Delete a vendor. Cascading deletes are handled by database foreign key constraints.
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
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Verify vendor exists
    const { data: existing, error: fetchError } = await serviceClient
      .from('vendors')
      .select('id, business_name')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Delete vendor record (cascade handles deals, claims, etc.)
    const { error: deleteError } = await serviceClient
      .from('vendors')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/admin/vendors] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
    }

    // Delete user_profiles record
    await serviceClient.from('user_profiles').delete().eq('id', id);

    // Delete the auth user
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.error('[DELETE /api/admin/vendors] Auth delete warning:', authDeleteError);
      // Non-fatal: vendor record is already deleted
    }

    return NextResponse.json({ success: true, deleted: existing.business_name });
  } catch (error) {
    console.error('[DELETE /api/admin/vendors] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
