import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/spontipoints/issue — Issue bonus SpontiPoints to a customer
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

  const { user_id, amount, description } = body;

  if (!user_id || !amount) {
    return NextResponse.json(
      { error: 'user_id and amount are required' },
      { status: 400 }
    );
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return NextResponse.json(
      { error: 'Amount must be a positive number' },
      { status: 400 }
    );
  }

  // Verify the user exists
  const { data: userProfile, error: userError } = await serviceClient
    .from('user_profiles')
    .select('id, full_name, email')
    .eq('id', user_id)
    .single();

  if (userError || !userProfile) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Insert bonus points into the ledger
  const { data: entry, error: insertError } = await serviceClient
    .from('sponti_points_ledger')
    .insert({
      user_id,
      amount: numAmount,
      type: 'bonus',
      description: (description as string) || `Admin bonus: ${numAmount} points`,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    entry,
    user: userProfile,
  }, { status: 201 });
}
