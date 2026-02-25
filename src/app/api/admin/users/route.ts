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

    // Step 1: Fetch user profiles (with first_name, last_name)
    let profilesQuery = serviceClient
      .from('user_profiles')
      .select('id, role, first_name, last_name')
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
    const emailMap: Record<string, { email: string; created_at: string; disabled: boolean; full_name: string }> = {};
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
            full_name: u.user_metadata?.full_name || '',
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

    const vendorMap: Record<string, { business_name: string }> = {};
    (vendorsRes.data || []).forEach((v: { id: string; business_name: string }) => {
      vendorMap[v.id] = { business_name: v.business_name };
    });

    const customerMap: Record<string, { first_name: string; last_name: string }> = {};
    (customersRes.data || []).forEach((c: { id: string; first_name: string | null; last_name: string | null }) => {
      customerMap[c.id] = {
        first_name: c.first_name || '',
        last_name: c.last_name || '',
      };
    });

    // Step 4: Build enriched user list
    const users = profiles.map((profile) => {
      const authInfo = emailMap[profile.id];
      const profileRaw = profile as unknown as Record<string, unknown>;

      // Primary: use user_profiles.first_name/last_name (works for all roles)
      let firstName = (profileRaw.first_name as string) || '';
      let lastName = (profileRaw.last_name as string) || '';

      // Fallback: role-specific sources if user_profiles doesn't have names
      if (!firstName && !lastName) {
        if (profile.role === 'customer') {
          const customer = customerMap[profile.id];
          firstName = customer?.first_name || '';
          lastName = customer?.last_name || '';
        } else {
          // Vendor/Admin — fallback to auth metadata
          const fullName = authInfo?.full_name || '';
          if (fullName) {
            const parts = fullName.split(' ');
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          }
        }
      }

      // Associated name: business name for vendors, full name for customers
      let associatedName = '';
      if (profile.role === 'vendor') {
        associatedName = vendorMap[profile.id]?.business_name || '';
      } else if (profile.role === 'customer') {
        associatedName = [firstName, lastName].filter(Boolean).join(' ');
      }

      return {
        id: profile.id,
        email: authInfo?.email || '',
        role: profile.role,
        first_name: firstName,
        last_name: lastName,
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

/**
 * POST /api/admin/users
 * Create a new user account with email, password, role, and optional name.
 * Body: { email, password, role, first_name?, last_name?, business_name? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, password, role, first_name, last_name, business_name } = body as {
      email: string;
      password: string;
      role: string;
      first_name?: string;
      last_name?: string;
      business_name?: string;
    };

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'email, password, and role are required' }, { status: 400 });
    }

    const validRoles = ['vendor', 'customer', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be one of: vendor, customer, admin' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (role === 'vendor' && !business_name) {
      return NextResponse.json({ error: 'business_name is required for vendor accounts' }, { status: 400 });
    }

    // Create the auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[POST /api/admin/users] Auth create error:', authError);
      const msg = authError.message?.includes('already been registered')
        ? 'A user with this email already exists'
        : authError.message || 'Failed to create user';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = authData.user.id;

    // Create user_profiles record
    const { error: profileError } = await serviceClient
      .from('user_profiles')
      .insert({
        id: userId,
        role,
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
      });

    if (profileError) {
      console.error('[POST /api/admin/users] Profile insert error:', profileError);
      // Clean up: delete the auth user since profile creation failed
      await serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    // Create role-specific record
    if (role === 'vendor') {
      const { error: vendorError } = await serviceClient
        .from('vendors')
        .insert({
          id: userId,
          email: email.trim(),
          business_name: business_name!.trim(),
        });

      if (vendorError) {
        console.error('[POST /api/admin/users] Vendor insert error:', vendorError);
      }
    } else if (role === 'customer') {
      const { error: customerError } = await serviceClient
        .from('customers')
        .insert({
          id: userId,
          email: email.trim(),
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
        });

      if (customerError) {
        console.error('[POST /api/admin/users] Customer insert error:', customerError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.trim(),
        role,
        first_name: first_name?.trim() || '',
        last_name: last_name?.trim() || '',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
