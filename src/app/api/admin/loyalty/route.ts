import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/loyalty — List all loyalty programs with vendor, rewards count, cards count
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';

  // Fetch all loyalty programs with vendor info
  const { data: programs, error: programsError } = await serviceClient
    .from('loyalty_programs')
    .select('*, vendor:vendors(business_name)')
    .order('created_at', { ascending: false });

  if (programsError) {
    return NextResponse.json({ error: programsError.message }, { status: 500 });
  }

  // Fetch rewards counts grouped by program_id
  const { data: rewardsData } = await serviceClient
    .from('loyalty_rewards')
    .select('program_id');

  const rewardsCounts: Record<string, number> = {};
  (rewardsData || []).forEach((r: { program_id: string }) => {
    rewardsCounts[r.program_id] = (rewardsCounts[r.program_id] || 0) + 1;
  });

  // Fetch cards (enrollments) counts grouped by program_id
  const { data: cardsData } = await serviceClient
    .from('loyalty_cards')
    .select('program_id');

  const cardsCounts: Record<string, number> = {};
  (cardsData || []).forEach((c: { program_id: string }) => {
    cardsCounts[c.program_id] = (cardsCounts[c.program_id] || 0) + 1;
  });

  // Combine data
  let result = (programs || []).map((program: Record<string, unknown>) => ({
    ...program,
    rewards_count: rewardsCounts[program.id as string] || 0,
    cards_count: cardsCounts[program.id as string] || 0,
  }));

  // Apply search filter (program name or vendor business_name)
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((p: Record<string, unknown>) => {
      const name = (p.name as string || '').toLowerCase();
      const vendor = p.vendor as { business_name: string } | null;
      const vendorName = (vendor?.business_name || '').toLowerCase();
      return name.includes(q) || vendorName.includes(q);
    });
  }

  return NextResponse.json({ programs: result });
}

// POST /api/admin/loyalty — Create a new loyalty program
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vendor_id, name, program_type, description } = body as {
    vendor_id: string;
    name: string;
    program_type: string;
    description?: string;
  };

  if (!vendor_id || !name || !program_type) {
    return NextResponse.json({ error: 'vendor_id, name, and program_type are required' }, { status: 400 });
  }

  if (!['punch_card', 'points'].includes(program_type)) {
    return NextResponse.json({ error: 'program_type must be punch_card or points' }, { status: 400 });
  }

  // Verify vendor exists
  const { data: vendor, error: vendorError } = await serviceClient
    .from('vendors')
    .select('id')
    .eq('id', vendor_id)
    .single();

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const insertData: Record<string, unknown> = {
    vendor_id,
    name,
    program_type,
    is_active: true,
  };

  if (description) insertData.description = description;

  // Set defaults based on type
  if (program_type === 'punch_card') {
    insertData.punches_required = body.punches_required ? Number(body.punches_required) : 10;
    insertData.punch_reward = body.punch_reward || null;
  } else {
    insertData.points_per_dollar = body.points_per_dollar ? Number(body.points_per_dollar) : 1;
  }

  const { data: program, error } = await serviceClient
    .from('loyalty_programs')
    .insert(insertData)
    .select('*, vendor:vendors(business_name)')
    .single();

  if (error) {
    console.error('[POST /api/admin/loyalty] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ program }, { status: 201 });
}
