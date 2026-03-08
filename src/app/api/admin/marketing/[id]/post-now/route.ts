import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { postMarketingContent } from '@/lib/marketing/poster';
import type { MarketingContentItem } from '@/lib/marketing/types';

// POST /api/admin/marketing/[id]/post-now — Immediately post an approved item
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data: item, error } = await supabase
    .from('marketing_content_queue')
    .select('*')
    .eq('id', id)
    .in('status', ['draft', 'approved', 'scheduled', 'failed'])
    .single();

  if (error || !item) {
    return NextResponse.json(
      { error: 'Item not found or already posted' },
      { status: 400 }
    );
  }

  // Mark as approved first
  await supabase.from('marketing_content_queue').update({
    status: 'approved',
    reviewed_by: admin.userId,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);

  const result = await postMarketingContent(supabase, item as MarketingContentItem);

  return NextResponse.json({
    success: result.success,
    errors: result.errors,
    item: (await supabase.from('marketing_content_queue').select('*').eq('id', id).single()).data,
  });
}
