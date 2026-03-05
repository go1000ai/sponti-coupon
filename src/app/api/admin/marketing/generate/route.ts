import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runMarketingAgent } from '@/lib/marketing/agent';
import type { MarketingRunType } from '@/lib/marketing/types';

// POST /api/admin/marketing/generate — Manually trigger the marketing agent
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const body = await request.json().catch(() => ({}));
  const runType: MarketingRunType = body.runType || 'manual';

  try {
    const supabase = await createServiceRoleClient();
    const result = await runMarketingAgent(supabase, runType);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
