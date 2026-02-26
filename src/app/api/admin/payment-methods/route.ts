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
    const methodType = searchParams.get('method_type') || '';

    let query = serviceClient
      .from('vendor_payment_methods')
      .select(`
        id,
        vendor_id,
        method_type,
        is_primary,
        account_identifier,
        created_at,
        updated_at,
        vendor:vendors(business_name)
      `)
      .order('created_at', { ascending: false });

    if (methodType && methodType !== 'all') {
      query = query.eq('method_type', methodType);
    }

    const { data: rawMethods, error } = await query;

    if (error) {
      console.error('[GET /api/admin/payment-methods] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
    }

    let methods = (rawMethods || []).map((m: Record<string, unknown>) => {
      const vendor = m.vendor as { business_name: string } | null;
      return {
        id: m.id as string,
        vendor_id: m.vendor_id as string,
        method_type: m.method_type as string,
        is_primary: m.is_primary as boolean,
        account_identifier: m.account_identifier as string | null,
        created_at: m.created_at as string,
        updated_at: m.updated_at as string | null,
        vendor_name: vendor?.business_name || 'Unknown Vendor',
      };
    });

    if (search) {
      methods = methods.filter(
        (m) =>
          m.vendor_name.toLowerCase().includes(search) ||
          m.method_type.toLowerCase().includes(search) ||
          (m.account_identifier || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ payment_methods: methods });
  } catch (error) {
    console.error('[GET /api/admin/payment-methods] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
