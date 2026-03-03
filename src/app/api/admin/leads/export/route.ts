import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/leads/export — download all saved leads as CSV
// Optional ?status= filter to export only a specific status
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';

  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('vendor_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('[GET /api/admin/leads/export]', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }

  // RFC 4180 CSV builder — escape double-quotes by doubling them
  function escapeCell(value: unknown): string {
    const str = value == null ? '' : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  }

  const HEADERS = [
    'Business Name', 'Address', 'Phone', 'Website',
    'Category', 'City', 'State', 'Rating', 'Reviews',
    'Status', 'On Groupon', 'Notes', 'Saved On',
  ];

  const rows = (leads || []).map((l) => [
    l.business_name,
    l.address,
    l.phone,
    l.website,
    l.category,
    l.city,
    l.state,
    l.rating,
    l.review_count,
    l.status,
    l.on_groupon ? 'Yes' : 'No',
    l.notes,
    l.created_at ? new Date(l.created_at).toLocaleDateString('en-US') : '',
  ].map(escapeCell).join(','));

  const csv = [HEADERS.join(','), ...rows].join('\n');
  const today = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vendor-leads-${today}.csv"`,
    },
  });
}
