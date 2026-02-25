import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/support — List all support tickets with filters
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const userRole = searchParams.get('user_role');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  // Get total counts by status (unfiltered)
  const { data: allTickets } = await serviceClient
    .from('support_tickets')
    .select('status');

  const statusCounts = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  };

  (allTickets || []).forEach((t: { status: string }) => {
    statusCounts[t.status as keyof typeof statusCounts]++;
    statusCounts.total++;
  });

  // Build filtered query
  let query = serviceClient
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (category) query = query.eq('category', category);
  if (userRole) query = query.eq('user_role', userRole);

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: tickets, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apply search filter client-side (subject or email)
  let filtered = tickets || [];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t: Record<string, unknown>) => {
      const subject = ((t.subject as string) || '').toLowerCase();
      const email = ((t.user_email as string) || '').toLowerCase();
      return subject.includes(q) || email.includes(q);
    });
  }

  return NextResponse.json({
    tickets: filtered,
    total: count || 0,
    page,
    pageSize,
    statusCounts,
  });
}
