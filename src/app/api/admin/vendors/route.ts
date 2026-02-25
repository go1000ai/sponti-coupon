import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/vendors
 * List all vendors with deal/claims stats.
 * Supports query params: search, status, tier
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'all';
    const tier = searchParams.get('tier') || 'all';

    // Fetch all vendors
    let query = serviceClient
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('subscription_status', status);
    }
    if (tier !== 'all') {
      if (tier === 'none') {
        query = query.is('subscription_tier', null);
      } else {
        query = query.eq('subscription_tier', tier);
      }
    }

    const { data: vendorsData, error: vendorsError } = await query;

    if (vendorsError) {
      console.error('[GET /api/admin/vendors] Vendors query error:', vendorsError);
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
    }

    if (!vendorsData || vendorsData.length === 0) {
      return NextResponse.json({ vendors: [] });
    }

    // Apply search filter in-memory (covers business_name, email, city)
    const filtered = search
      ? vendorsData.filter(
          (v) =>
            v.business_name?.toLowerCase().includes(search) ||
            v.email?.toLowerCase().includes(search) ||
            v.city?.toLowerCase().includes(search)
        )
      : vendorsData;

    const vendorIds = filtered.map((v) => v.id);

    if (vendorIds.length === 0) {
      return NextResponse.json({ vendors: [] });
    }

    // Fetch deal counts and claim counts in parallel
    const [dealsRes, claimsRes] = await Promise.all([
      serviceClient
        .from('deals')
        .select('vendor_id')
        .in('vendor_id', vendorIds),
      serviceClient
        .from('claims')
        .select('deal_id, deals!inner(vendor_id)')
        .in('deals.vendor_id', vendorIds),
    ]);

    // Aggregate deal counts
    const dealCounts: Record<string, number> = {};
    (dealsRes.data || []).forEach((d: { vendor_id: string }) => {
      dealCounts[d.vendor_id] = (dealCounts[d.vendor_id] || 0) + 1;
    });

    // Aggregate claim counts
    const claimCounts: Record<string, number> = {};
    (claimsRes.data || []).forEach((c: Record<string, unknown>) => {
      const deal = c.deals as { vendor_id: string } | { vendor_id: string }[] | null;
      const vid = Array.isArray(deal) ? deal[0]?.vendor_id : deal?.vendor_id;
      if (vid) claimCounts[vid] = (claimCounts[vid] || 0) + 1;
    });

    // Fetch first_name/last_name from user_profiles
    const { data: profilesData } = await serviceClient
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', vendorIds);

    const profileMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
    (profilesData || []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
    });

    // Enrich vendors with stats and names
    const vendors = filtered.map((v) => ({
      ...v,
      first_name: profileMap[v.id]?.first_name || null,
      last_name: profileMap[v.id]?.last_name || null,
      deal_count: dealCounts[v.id] || 0,
      total_claims: claimCounts[v.id] || 0,
    }));

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error('[GET /api/admin/vendors] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/vendors
 * Create a new vendor (auth user + vendor record + user_profiles record).
 * Body: { email, password, business_name, phone, address, city, state, zip, category, description, website }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const body = await request.json();
    const {
      email,
      password,
      business_name,
      phone,
      address,
      city,
      state,
      zip,
      category,
      description,
      website,
    } = body;

    // Validate required fields
    if (!email || !password || !business_name) {
      return NextResponse.json(
        { error: 'Email, password, and business name are required' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceRoleClient();

    // Step 1: Create auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[POST /api/admin/vendors] Auth create error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const userId = authData.user.id;

    // Step 2: Insert user_profiles record with role 'vendor'
    const { error: profileError } = await serviceClient
      .from('user_profiles')
      .insert({ id: userId, role: 'vendor' });

    if (profileError) {
      console.error('[POST /api/admin/vendors] Profile insert error:', profileError);
      // Clean up: delete the auth user since profile creation failed
      await serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Step 3: Insert vendor record
    const vendorRecord: Record<string, unknown> = {
      id: userId,
      business_name,
      email,
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      category: category || null,
      description: description || null,
      website: website || null,
    };

    const { data: vendor, error: vendorError } = await serviceClient
      .from('vendors')
      .insert(vendorRecord)
      .select()
      .single();

    if (vendorError) {
      console.error('[POST /api/admin/vendors] Vendor insert error:', vendorError);
      // Clean up: delete profile and auth user
      await serviceClient.from('user_profiles').delete().eq('id', userId);
      await serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create vendor record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/vendors] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
