import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getValidSquareToken } from '@/lib/square-token';

// GET /api/cron/refresh-square-tokens
// Proactively refresh Square OAuth tokens that expire within 7 days.
// Square tokens expire after 30 days; this runs daily to prevent dead tokens.
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // Find vendors with tokens expiring within 7 days
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, square_connect_merchant_id, square_connect_token_expires_at')
    .not('square_connect_merchant_id', 'is', null)
    .not('square_connect_access_token_encrypted', 'is', null)
    .lt('square_connect_token_expires_at', sevenDaysFromNow);

  if (!vendors?.length) {
    return NextResponse.json({ message: 'No tokens need refresh', refreshed: 0 });
  }

  let refreshed = 0;
  const errors: string[] = [];

  for (const vendor of vendors) {
    try {
      const token = await getValidSquareToken(supabase, vendor.id);
      if (token) {
        refreshed++;
        console.log(`[Square Token Refresh] Refreshed token for vendor ${vendor.id}`);
      } else {
        errors.push(`Vendor ${vendor.id}: refresh returned null`);
        console.error(`[Square Token Refresh] Failed for vendor ${vendor.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Vendor ${vendor.id}: ${msg}`);
      console.error(`[Square Token Refresh] Error for vendor ${vendor.id}:`, msg);
    }
  }

  return NextResponse.json({
    message: `Refreshed ${refreshed}/${vendors.length} tokens`,
    refreshed,
    total: vendors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
