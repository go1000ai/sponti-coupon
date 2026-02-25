import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/categories
 * List all categories ordered by name.
 */
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    const { data: categories, error } = await serviceClient
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/admin/categories] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('[GET /api/admin/categories] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/categories
 * Create a new category (name, icon emoji, slug).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, icon, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'name and slug are required' },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const { data: existing } = await serviceClient
      .from('categories')
      .select('id')
      .eq('slug', slug as string)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 409 }
      );
    }

    const { data: category, error } = await serviceClient
      .from('categories')
      .insert({
        name: name as string,
        icon: (icon as string) || null,
        slug: slug as string,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[POST /api/admin/categories] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/categories] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
