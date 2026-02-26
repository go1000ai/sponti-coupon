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

    const { data: rawLocations, error } = await serviceClient
      .from('vendor_locations')
      .select(`
        id,
        vendor_id,
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        latitude,
        longitude,
        is_primary,
        created_at,
        vendor:vendors(business_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin/locations] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    let locations = (rawLocations || []).map((l: Record<string, unknown>) => {
      const vendor = l.vendor as { business_name: string } | null;
      return {
        id: l.id as string,
        vendor_id: l.vendor_id as string,
        name: l.name as string | null,
        address: l.address as string | null,
        city: l.city as string | null,
        state: l.state as string | null,
        zip_code: l.zip_code as string | null,
        phone: l.phone as string | null,
        latitude: l.latitude as number | null,
        longitude: l.longitude as number | null,
        is_primary: l.is_primary as boolean,
        created_at: l.created_at as string,
        vendor_name: vendor?.business_name || 'Unknown Vendor',
      };
    });

    if (search) {
      locations = locations.filter(
        (l) =>
          l.vendor_name.toLowerCase().includes(search) ||
          (l.name || '').toLowerCase().includes(search) ||
          (l.address || '').toLowerCase().includes(search) ||
          (l.city || '').toLowerCase().includes(search) ||
          (l.state || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('[GET /api/admin/locations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
