import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/subscriptions — List all subscriptions with vendor business_name
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier') || '';
  const status = searchParams.get('status') || '';

  let query = serviceClient
    .from('subscriptions')
    .select('*, vendor:vendors(business_name)')
    .order('created_at', { ascending: false });

  // Apply tier filter
  if (tier && tier !== 'all') {
    query = query.eq('tier', tier);
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: subscriptionsData, error: subscriptionsError } = await query;

  if (subscriptionsError) {
    return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });
  }

  const subscriptions = (subscriptionsData || []).map((sub: Record<string, unknown>) => {
    const vendor = sub.vendor as { business_name: string } | null;
    return {
      ...sub,
      vendor_name: vendor?.business_name || '--',
    };
  });

  return NextResponse.json({ subscriptions });
}
