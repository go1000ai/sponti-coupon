import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/founders — Public endpoint: returns founder spots count
export async function GET() {
  const serviceClient = await createServiceRoleClient();

  const { count, error } = await serviceClient
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .in('subscription_tier', ['pro', 'business']);

  if (error) {
    return NextResponse.json({ spots_taken: 0, total_spots: 200 });
  }

  return NextResponse.json({
    spots_taken: count || 0,
    total_spots: 200,
    spots_remaining: 200 - (count || 0),
  });
}
