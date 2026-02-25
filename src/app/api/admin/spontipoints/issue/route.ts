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

  const { user_id, email, amount, description, action } = body;

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

  // Look up user by email or user_id
  let userProfile: { id: string; full_name: string | null; email: string | null } | null = null;

  if (email) {
    // Look up by email in auth.users via user_profiles
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('id, full_name, email')
      .ilike('email', String(email).trim())
      .single();

    if (profileError || !profile) {
      // Fallback: check auth.users table
      const { data: authData } = await serviceClient.auth.admin.listUsers();
      const authUser = authData?.users?.find(
        (u) => u.email?.toLowerCase() === String(email).trim().toLowerCase()
      );

      if (authUser) {
        // Get or create profile
        const { data: existingProfile } = await serviceClient
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('id', authUser.id)
          .single();

        if (existingProfile) {
          userProfile = existingProfile;
        } else {
          return NextResponse.json(
            { error: `User with email "${email}" found in auth but has no profile` },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: `No user found with email "${email}"` },
          { status: 404 }
        );
      }
    } else {
      userProfile = profile;
    }
  } else {
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    userProfile = profile;
  }

  if (!userProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Determine type: 'bonus' for add, 'adjustment' for deduct
  const isDeduct = action === 'deduct';
  const entryType = isDeduct ? 'adjustment' : 'bonus';
  const entryAmount = isDeduct ? -numAmount : numAmount;
  const defaultDesc = isDeduct
    ? `Admin deduction: -${numAmount} points`
    : `Admin bonus: ${numAmount} points`;

  // Insert into the ledger
  const { data: entry, error: insertError } = await serviceClient
    .from('sponti_points_ledger')
    .insert({
      user_id: userProfile.id,
      amount: entryAmount,
      type: entryType,
      description: (description as string) || defaultDesc,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    entry,
    user: userProfile,
    action: isDeduct ? 'deducted' : 'issued',
  }, { status: 201 });
}
