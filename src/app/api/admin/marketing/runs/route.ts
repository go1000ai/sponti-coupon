import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/marketing/runs — Fetch agent run history
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('marketing_agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data });
}
