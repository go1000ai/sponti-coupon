import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/users
 * List all user profiles with email (from auth) and associated name (from vendors/customers).
 * Supports query param: role (vendor | customer | admin)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role') || 'all';

    // Step 1: Fetch user profiles
    let profilesQuery = serviceClient
      .from('user_profiles')
      .select('id, role')
      .order('id');

    if (roleFilter !== 'all') {
      profilesQuery = profilesQuery.eq('role', roleFilter);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('[GET /api/admin/users] Profiles query error:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Step 2: Fetch all auth users (paginated — Supabase returns max 1000 per page)
    const emailMap: Record<string, { email: string; created_at: string; disabled: boolean }> = {};
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: authPage, error: authError } = await serviceClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        console.error('[GET /api/admin/users] Auth listUsers error (page ' + page + '):', authError);
        break;
      }

      if (authPage.users && authPage.users.length > 0) {
        for (const u of authPage.users) {
          emailMap[u.id] = {
            email: u.email || '',
            created_at: u.created_at,
            disabled: u.user_metadata?.disabled === true ||
              (u.banned_until !== null && u.banned_until !== undefined),
          };
        }
        // If we got fewer than perPage, we've reached the end
        if (authPage.users.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // Step 3: Fetch vendor and customer names in parallel
    const profileIds = profiles.map((p) => p.id);

    const [vendorsRes, customersRes] = await Promise.all([
      serviceClient
        .from('vendors')
        .select('id, business_name')
        .in('id', profileIds),
      serviceClient
        .from('customers')
        .select('id, first_name, last_name')
        .in('id', profileIds),
    ]);

    const vendorNameMap: Record<string, string> = {};
    (vendorsRes.data || []).forEach((v: { id: string; business_name: string }) => {
      vendorNameMap[v.id] = v.business_name;
    });

    const customerNameMap: Record<string, string> = {};
    (customersRes.data || []).forEach((c: { id: string; first_name: string | null; last_name: string | null }) => {
      const parts = [c.first_name, c.last_name].filter(Boolean);
      customerNameMap[c.id] = parts.length > 0 ? parts.join(' ') : '';
    });

    // Step 4: Build enriched user list
    const users = profiles.map((profile) => {
      const authInfo = emailMap[profile.id];
      let associatedName = '';
      if (profile.role === 'vendor') {
        associatedName = vendorNameMap[profile.id] || '';
      } else if (profile.role === 'customer') {
        associatedName = customerNameMap[profile.id] || '';
      }

      return {
        id: profile.id,
        email: authInfo?.email || '',
        role: profile.role,
        associated_name: associatedName,
        disabled: authInfo?.disabled || false,
        created_at: authInfo?.created_at || '',
      };
    });

    // Sort by created_at descending (newest first)
    users.sort((a, b) => {
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
