import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const roleFilter = searchParams.get('role') || '';

    let query = serviceClient
      .from('vendor_team_members')
      .select(`
        id,
        vendor_id,
        user_id,
        role,
        created_at,
        vendor:vendors(business_name),
        user:user_profiles(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data: rawMembers, error } = await query;

    if (error) {
      console.error('[GET /api/admin/teams] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    let members = (rawMembers || []).map((m: Record<string, unknown>) => {
      const vendor = m.vendor as { business_name: string } | null;
      const user = m.user as { first_name: string | null; last_name: string | null; email: string | null } | null;
      return {
        id: m.id as string,
        vendor_id: m.vendor_id as string,
        user_id: m.user_id as string,
        role: m.role as string,
        created_at: m.created_at as string,
        vendor_name: vendor?.business_name || 'Unknown Vendor',
        user_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown',
        user_email: user?.email || null,
      };
    });

    if (search) {
      members = members.filter(
        (m) =>
          m.vendor_name.toLowerCase().includes(search) ||
          m.user_name.toLowerCase().includes(search) ||
          (m.user_email || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[GET /api/admin/teams] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
