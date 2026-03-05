import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runMarketingAgent } from '@/lib/marketing/agent';
import type { MarketingRunType } from '@/lib/marketing/types';

export const runtime = 'nodejs';

// GET /api/cron/marketing-agent
// Runs 3x/day: 8 AM, 1 PM, 6 PM AST (12, 17, 22 UTC)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine run type from current hour (AST = UTC-4)
  const utcHour = new Date().getUTCHours();
  let runType: MarketingRunType;
  if (utcHour >= 11 && utcHour <= 13) runType = 'morning';
  else if (utcHour >= 16 && utcHour <= 18) runType = 'afternoon';
  else runType = 'evening';

  try {
    const supabase = await createServiceRoleClient();
    const result = await runMarketingAgent(supabase, runType);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[Marketing Agent Cron] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
