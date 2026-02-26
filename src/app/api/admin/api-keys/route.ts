import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const { data: rawKeys, error } = await serviceClient
      .from('vendor_api_keys')
      .select(`
        id,
        vendor_id,
        key_name,
        api_key,
        is_active,
        created_at,
        last_used_at,
        revoked_at,
        vendor:vendors(business_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin/api-keys] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    let keys = (rawKeys || []).map((k: Record<string, unknown>) => {
      const vendor = k.vendor as { business_name: string } | null;
      const apiKey = k.api_key as string || '';
      return {
        id: k.id as string,
        vendor_id: k.vendor_id as string,
        key_name: k.key_name as string | null,
        api_key_masked: apiKey.length > 8 ? apiKey.substring(0, 8) + '...' : apiKey,
        is_active: k.is_active as boolean,
        created_at: k.created_at as string,
        last_used_at: k.last_used_at as string | null,
        revoked_at: k.revoked_at as string | null,
        vendor_name: vendor?.business_name || 'Unknown Vendor',
      };
    });

    if (search) {
      keys = keys.filter(
        (k) =>
          k.vendor_name.toLowerCase().includes(search) ||
          (k.key_name || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ api_keys: keys });
  } catch (error) {
    console.error('[GET /api/admin/api-keys] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Key ID required' }, { status: 400 });

    const serviceClient = await createServiceRoleClient();
    const { error } = await serviceClient
      .from('vendor_api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/admin/api-keys] Error:', error);
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/api-keys] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
