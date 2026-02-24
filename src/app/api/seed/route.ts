import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seeding disabled in production' }, { status: 403 });
  }

  const supabase = await createServiceRoleClient();

  // Helper: create an auth user (or get existing) and return their ID
  async function getOrCreateAuthUser(email: string): Promise<string> {
    // Try to find existing user by email
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users?.find(u => u.email === email);
    if (existing) return existing.id;

    // Create new auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'seedpassword123!',
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create auth user ${email}: ${error.message}`);
    return data.user.id;
  }

  // Create auth users first and collect IDs
  const vendorEmails = [
    'bella@example.com',
    'glow@example.com',
    'iron@example.com',
    'escape@example.com',
    'cafe@example.com',
    'luxe@example.com',
  ];

  const customerEmails = [
    'customer@example.com',
  ];

  const adminEmails = [
    'admin@example.com',
  ];

  const allEmails = [...vendorEmails, ...customerEmails, ...adminEmails];

  const authIds: Record<string, string> = {};
  for (const email of allEmails) {
    try {
      authIds[email] = await getOrCreateAuthUser(email);
    } catch (err) {
      return NextResponse.json({ error: `Auth user creation failed for ${email}`, details: String(err) }, { status: 500 });
    }
  }

  // Upsert user_profiles for all users
  const userProfiles = [
    ...vendorEmails.map(email => ({ id: authIds[email], role: 'vendor' as const })),
    ...customerEmails.map(email => ({ id: authIds[email], role: 'customer' as const })),
    ...adminEmails.map(email => ({ id: authIds[email], role: 'admin' as const })),
  ];

  for (const profile of userProfiles) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profile, { onConflict: 'id' });
    if (profileError) {
      return NextResponse.json({ error: `user_profiles upsert failed for ${profile.id}`, details: profileError.message }, { status: 500 });
    }
  }

  // Create test customer record
  const testCustomers = [
    {
      id: authIds['customer@example.com'],
      email: 'customer@example.com',
      first_name: 'Maria',
      last_name: 'Rodriguez',
      phone: '(305) 555-0200',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      lat: 25.7617,
      lng: -80.1918,
      email_digest_opt_in: true,
    },
  ];

  // Clean up existing test customers
  await supabase.from('customers').delete().in('email', customerEmails);

  const { error: customerError } = await supabase.from('customers').upsert(testCustomers, { onConflict: 'id' });
  if (customerError) {
    return NextResponse.json({ error: 'Customer insert failed', details: customerError.message }, { status: 500 });
  }

  // Create sample vendors
  const vendors = [
    {
      id: authIds['bella@example.com'],
      business_name: 'Bella Napoli Pizza',
      email: 'bella@example.com',
      phone: '(305) 555-0101',
      address: '123 Main St',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      lat: 25.7617,
      lng: -80.1918,
      category: 'restaurants',
      subscription_tier: 'pro',
      subscription_status: 'active',
    },
    {
      id: authIds['glow@example.com'],
      business_name: 'Glow Skin Studio',
      email: 'glow@example.com',
      phone: '(305) 555-0102',
      address: '456 Ocean Dr',
      city: 'Miami Beach',
      state: 'FL',
      zip: '33139',
      lat: 25.7907,
      lng: -80.1300,
      category: 'beauty-spa',
      subscription_tier: 'business',
      subscription_status: 'active',
    },
    {
      id: authIds['iron@example.com'],
      business_name: 'Iron Temple Fitness',
      email: 'iron@example.com',
      phone: '(305) 555-0103',
      address: '789 Brickell Ave',
      city: 'Miami',
      state: 'FL',
      zip: '33131',
      lat: 25.7589,
      lng: -80.1893,
      category: 'health-fitness',
      subscription_tier: 'starter',
      subscription_status: 'active',
    },
    {
      id: authIds['escape@example.com'],
      business_name: 'Escape Room Miami',
      email: 'escape@example.com',
      phone: '(305) 555-0104',
      address: '321 Coral Way',
      city: 'Miami',
      state: 'FL',
      zip: '33145',
      lat: 25.7512,
      lng: -80.2341,
      category: 'entertainment',
      subscription_tier: 'pro',
      subscription_status: 'active',
    },
    {
      id: authIds['cafe@example.com'],
      business_name: 'Café Tropical',
      email: 'cafe@example.com',
      phone: '(305) 555-0105',
      address: '555 Calle Ocho',
      city: 'Miami',
      state: 'FL',
      zip: '33135',
      lat: 25.7655,
      lng: -80.2195,
      category: 'food-drink',
      subscription_tier: 'starter',
      subscription_status: 'active',
    },
    {
      id: authIds['luxe@example.com'],
      business_name: 'Luxe Boutique',
      email: 'luxe@example.com',
      phone: '(305) 555-0106',
      address: '900 Lincoln Rd',
      city: 'Miami Beach',
      state: 'FL',
      zip: '33139',
      lat: 25.7935,
      lng: -80.1387,
      category: 'shopping',
      subscription_tier: 'enterprise',
      subscription_status: 'active',
    },
  ];

  // Delete existing seed data first (by email pattern)
  const seedEmails = vendors.map(v => v.email);
  const { data: existingVendors } = await supabase
    .from('vendors')
    .select('id')
    .in('email', seedEmails);

  if (existingVendors && existingVendors.length > 0) {
    const existingIds = existingVendors.map(v => v.id);
    await supabase.from('deals').delete().in('vendor_id', existingIds);
    await supabase.from('vendors').delete().in('id', existingIds);
  }

  const { error: vendorError } = await supabase.from('vendors').insert(vendors);
  if (vendorError) {
    return NextResponse.json({ error: 'Vendor insert failed', details: vendorError.message }, { status: 500 });
  }

  const vendorMap: Record<string, string> = {};
  vendors.forEach(v => { vendorMap[v.email] = v.id; });

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create sample deals — mix of regular and sponti_coupon
  const regularDeals = [
    {
      id: uuidv4(),
      vendor_id: vendorMap['bella@example.com'],
      deal_type: 'regular' as const,
      title: '2-for-1 Large Pizzas',
      description: 'Buy one large pizza, get the second one free! Choose from our full menu of hand-tossed Neapolitan pizzas.',
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200&auto=format&fit=crop',
      original_price: 36.00,
      deal_price: 18.00,
      discount_percentage: 50,
      deposit_amount: null,
      max_claims: 100,
      claims_count: 42,
      starts_at: now.toISOString(),
      expires_at: in14d.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['glow@example.com'],
      deal_type: 'regular' as const,
      title: '40% Off Facial Treatment',
      description: 'Luxury hydrating facial with organic serums and LED light therapy. Normally $120, now just $72.',
      image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=1200&auto=format&fit=crop',
      original_price: 120.00,
      deal_price: 72.00,
      discount_percentage: 40,
      deposit_amount: null,
      max_claims: 30,
      claims_count: 12,
      starts_at: now.toISOString(),
      expires_at: in30d.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['iron@example.com'],
      deal_type: 'regular' as const,
      title: 'Monthly Membership — 30% Off',
      description: 'Full gym access with free group classes for your first month. No commitment required.',
      image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
      original_price: 79.99,
      deal_price: 55.99,
      discount_percentage: 30,
      deposit_amount: null,
      max_claims: 50,
      claims_count: 23,
      starts_at: now.toISOString(),
      expires_at: in30d.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['escape@example.com'],
      deal_type: 'regular' as const,
      title: 'Escape Room — 35% Off Group Booking',
      description: 'Book for 4-6 players and save big on our most popular rooms: "The Heist" or "Lost Temple".',
      image_url: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?q=80&w=1200&auto=format&fit=crop',
      original_price: 180.00,
      deal_price: 117.00,
      discount_percentage: 35,
      deposit_amount: null,
      max_claims: 40,
      claims_count: 15,
      starts_at: now.toISOString(),
      expires_at: in14d.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['cafe@example.com'],
      deal_type: 'regular' as const,
      title: 'Brunch Special — $10 Off',
      description: 'Enjoy our weekend brunch menu featuring Cuban coffee, avocado toast, and tropical fruit bowls.',
      image_url: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1200&auto=format&fit=crop',
      original_price: 28.00,
      deal_price: 18.00,
      discount_percentage: 36,
      deposit_amount: null,
      max_claims: 60,
      claims_count: 35,
      starts_at: now.toISOString(),
      expires_at: in7d.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['luxe@example.com'],
      deal_type: 'regular' as const,
      title: '25% Off Designer Handbags',
      description: 'Selected designer handbags and accessories. While supplies last.',
      image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop',
      original_price: 299.00,
      deal_price: 224.25,
      discount_percentage: 25,
      deposit_amount: null,
      max_claims: 20,
      claims_count: 8,
      starts_at: now.toISOString(),
      expires_at: in14d.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
    },
  ];

  const { error: regularError } = await supabase.from('deals').insert(regularDeals);
  if (regularError) {
    return NextResponse.json({ error: 'Regular deals insert failed', details: regularError.message }, { status: 500 });
  }

  // Now create Sponti Coupon deals (deeper discounts, 24hr expiry, deposits required)
  const spontiDeals = [
    {
      id: uuidv4(),
      vendor_id: vendorMap['bella@example.com'],
      deal_type: 'sponti_coupon' as const,
      title: 'Sponti: Family Pizza Night — 65% Off!',
      description: '2 large pizzas + appetizer + drinks for the whole family. Today only!',
      image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop',
      original_price: 65.00,
      deal_price: 22.75,
      discount_percentage: 65,
      deposit_amount: 5.00,
      max_claims: 25,
      claims_count: 11,
      starts_at: now.toISOString(),
      expires_at: in24h.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
      benchmark_deal_id: regularDeals[0].id,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['glow@example.com'],
      deal_type: 'sponti_coupon' as const,
      title: 'Sponti: Spa Day Package — 55% Off!',
      description: 'Full facial + massage + aromatherapy. Limited spots available today.',
      image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop',
      original_price: 200.00,
      deal_price: 90.00,
      discount_percentage: 55,
      deposit_amount: 15.00,
      max_claims: 10,
      claims_count: 6,
      starts_at: now.toISOString(),
      expires_at: in24h.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
      benchmark_deal_id: regularDeals[1].id,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['cafe@example.com'],
      deal_type: 'sponti_coupon' as const,
      title: 'Sponti: All-You-Can-Eat Brunch — 60% Off!',
      description: 'Unlimited brunch buffet with bottomless mimosas. Today only!',
      image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=1200&auto=format&fit=crop',
      original_price: 45.00,
      deal_price: 18.00,
      discount_percentage: 60,
      deposit_amount: 3.00,
      max_claims: 30,
      claims_count: 19,
      starts_at: now.toISOString(),
      expires_at: in24h.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
      benchmark_deal_id: regularDeals[4].id,
    },
    {
      id: uuidv4(),
      vendor_id: vendorMap['escape@example.com'],
      deal_type: 'sponti_coupon' as const,
      title: 'Sponti: VIP Escape Room — 50% Off!',
      description: 'Private VIP room with bonus puzzles and a free team photo. Book now before it\'s gone!',
      image_url: 'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=1200&auto=format&fit=crop',
      original_price: 240.00,
      deal_price: 120.00,
      discount_percentage: 50,
      deposit_amount: 20.00,
      max_claims: 8,
      claims_count: 3,
      starts_at: now.toISOString(),
      expires_at: in24h.toISOString(),
      timezone: 'America/New_York',
      status: 'active' as const,
      benchmark_deal_id: regularDeals[3].id,
    },
  ];

  const { error: spontiError } = await supabase.from('deals').insert(spontiDeals);
  if (spontiError) {
    return NextResponse.json({ error: 'Sponti deals insert failed', details: spontiError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    seeded: {
      vendors: vendors.length,
      customers: testCustomers.length,
      admins: adminEmails.length,
      regular_deals: regularDeals.length,
      sponti_deals: spontiDeals.length,
    },
    test_accounts: {
      customer: { email: 'customer@example.com' },
      vendor: { email: 'bella@example.com', note: '6 vendor accounts total' },
      admin: { email: 'admin@example.com' },
      note: 'Passwords are not disclosed in API responses',
    },
  });
}
