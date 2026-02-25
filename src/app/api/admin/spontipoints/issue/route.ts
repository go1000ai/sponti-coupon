import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/spontipoints/issue — Issue or deduct SpontiPoints for a customer (by email or user_id)
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

  const { user_id, email, amount, action } = body;

  // Must provide either user_id or email
  if (!user_id && !email) {
    return NextResponse.json(
      { error: 'Either user_id or email is required' },
      { status: 400 }
    );
  }

  if (!amount) {
    return NextResponse.json(
      { error: 'amount is required' },
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

  // Look up customer by email or user_id
  let customer: { id: string; first_name: string; last_name: string; email: string } | null = null;

  if (email) {
    const { data: cust, error: custError } = await serviceClient
      .from('customers')
      .select('id, first_name, last_name, email')
      .ilike('email', String(email).trim())
      .single();

    if (custError || !cust) {
      return NextResponse.json(
        { error: `No customer found with email "${email}"` },
        { status: 404 }
      );
    }
    customer = cust;
  } else {
    const { data: cust, error: custError } = await serviceClient
      .from('customers')
      .select('id, first_name, last_name, email')
      .eq('id', user_id)
      .single();

    if (custError || !cust) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }
    customer = cust;
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Determine reason: 'bonus' for add, 'adjustment' for deduct
  const isDeduct = action === 'deduct';
  const entryReason = isDeduct ? 'adjustment' : 'bonus';
  const entryPoints = isDeduct ? -numAmount : numAmount;

  // Insert into the ledger
  const { data: entry, error: insertError } = await serviceClient
    .from('spontipoints_ledger')
    .insert({
      user_id: customer.id,
      points: entryPoints,
      reason: entryReason,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    entry,
    user: { full_name: `${customer.first_name} ${customer.last_name}`.trim(), email: customer.email },
    action: isDeduct ? 'deducted' : 'issued',
  }, { status: 201 });
}
