import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/notifications — List notifications with customer names, filters, and pagination
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || '';
  const channel = searchParams.get('channel') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10)));

  try {
    // Build count query for total
    let countQuery = serviceClient
      .from('notifications')
      .select('id', { count: 'exact', head: true });

    if (type) countQuery = countQuery.eq('type', type);
    if (channel) countQuery = countQuery.eq('channel', channel);

    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const total = count || 0;

    // Build data query with pagination
    let query = serviceClient
      .from('notifications')
      .select('*, customer:customers!customer_id(first_name, last_name)')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (type) query = query.eq('type', type);
    if (channel) query = query.eq('channel', channel);

    const { data: notifications, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten customer name into each notification
    const enriched = (notifications || []).map((n: Record<string, unknown>) => {
      const customerRaw = n.customer as { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
      const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
      return {
        ...n,
        customer_name: customer
          ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unknown'
          : 'Unknown',
        customer: undefined,
      };
    });

    return NextResponse.json({ notifications: enriched, total, page, pageSize });
  } catch (error) {
    console.error('[GET /api/admin/notifications] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
