import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PUT /api/admin/categories/[id]
 * Update a category (name, icon, slug).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const serviceClient = await createServiceRoleClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Build update object from allowed fields
    const allowedFields = ['name', 'icon', 'slug'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // If updating slug, check for duplicates
    if (updateData.slug) {
      const { data: existing } = await serviceClient
        .from('categories')
        .select('id')
        .eq('slug', updateData.slug as string)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 409 }
        );
      }
    }

    const { data: category, error } = await serviceClient
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[PUT /api/admin/categories] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('[PUT /api/admin/categories] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Delete a category. Checks for deals referencing it first and warns if any exist.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const serviceClient = await createServiceRoleClient();

    // Check if any deals reference this category
    const { data: referencingDeals, error: checkError } = await serviceClient
      .from('deals')
      .select('id')
      .eq('category_id', id);

    if (checkError) {
      console.error('[DELETE /api/admin/categories] Check error:', checkError);
      return NextResponse.json({ error: 'Failed to check deal references' }, { status: 500 });
    }

    const dealCount = referencingDeals?.length || 0;

    if (dealCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${dealCount} deal${dealCount === 1 ? '' : 's'} reference this category. Remove the category from those deals first.`,
          deal_count: dealCount,
        },
        { status: 409 }
      );
    }

    // Delete the category
    const { error: deleteError } = await serviceClient
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/admin/categories] Delete error:', deleteError);
      return NextResponse.json({ error: `Failed to delete category: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/categories] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
