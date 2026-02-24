import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/redeem/[qrCode] - Vendor redeems via QR code or 6-digit code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  const { qrCode } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the user is a vendor
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can redeem codes' }, { status: 403 });
  }

  // Find the claim by QR code UUID or 6-digit redemption code
  const is6Digit = /^\d{6}$/.test(qrCode.trim());

  let claim;
  let claimError;

  if (is6Digit) {
    // Lookup by 6-digit redemption code
    const result = await supabase
      .from('claims')
      .select('*, deal:deals(*), customer:customers(first_name, last_name, email)')
      .eq('redemption_code', qrCode.trim())
      .single();
    claim = result.data;
    claimError = result.error;
  } else {
    // Lookup by QR code UUID
    const result = await supabase
      .from('claims')
      .select('*, deal:deals(*), customer:customers(first_name, last_name, email)')
      .eq('qr_code', qrCode)
      .single();
    claim = result.data;
    claimError = result.error;
  }

  if (claimError || !claim) {
    return NextResponse.json({
      error: is6Digit ? 'Invalid redemption code' : 'Invalid QR code',
      code: 'INVALID',
    }, { status: 404 });
  }

  // Verify this code belongs to the vendor's deal
  if (claim.deal?.vendor_id !== user.id) {
    return NextResponse.json({
      error: 'This code is not for your deal',
      code: 'WRONG_VENDOR',
    }, { status: 403 });
  }

  // Check if already redeemed
  if (claim.redeemed) {
    return NextResponse.json({
      error: 'This code has already been redeemed',
      code: 'ALREADY_REDEEMED',
      redeemed_at: claim.redeemed_at,
    }, { status: 400 });
  }

  // Check if expired
  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({
      error: 'This code has expired',
      code: 'EXPIRED',
      expired_at: claim.expires_at,
    }, { status: 400 });
  }

  // Check if deposit was confirmed (for deals with deposits)
  if (claim.deal?.deposit_amount && claim.deal.deposit_amount > 0 && !claim.deposit_confirmed) {
    return NextResponse.json({
      error: 'Deposit has not been confirmed for this claim',
      code: 'NO_DEPOSIT',
    }, { status: 400 });
  }

  // Mark as redeemed
  const { error: updateError } = await supabase
    .from('claims')
    .update({
      redeemed: true,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', claim.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create redemption record
  const { data: redemptionRecord } = await supabase
    .from('redemptions')
    .insert({
      claim_id: claim.id,
      deal_id: claim.deal_id,
      vendor_id: user.id,
      customer_id: claim.customer_id,
      scanned_by: user.id,
    })
    .select()
    .single();

  // Calculate remaining balance: deal price - deposit already paid
  const depositPaid = claim.deal?.deposit_amount || 0;
  const dealPrice = claim.deal?.deal_price || 0;
  const remainingBalance = Math.max(0, dealPrice - depositPaid);

  // === LOYALTY AWARD (non-blocking — errors don't fail the redemption) ===
  let loyaltyInfo: { program_type: string; program_name: string; earned: string; current: string } | null = null;
  try {
    const serviceClient = await createServiceRoleClient();

    // Check if vendor has an active loyalty program
    const { data: program } = await serviceClient
      .from('loyalty_programs')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('is_active', true)
      .single();

    if (program) {
      // Find or create loyalty card for this customer+vendor
      let { data: card } = await serviceClient
        .from('loyalty_cards')
        .select('*')
        .eq('customer_id', claim.customer_id)
        .eq('vendor_id', user.id)
        .single();

      if (!card) {
        const { data: newCard } = await serviceClient
          .from('loyalty_cards')
          .insert({
            program_id: program.id,
            customer_id: claim.customer_id,
            vendor_id: user.id,
          })
          .select()
          .single();
        card = newCard;
      }

      if (card) {
        if (program.program_type === 'punch_card') {
          const newPunches = card.current_punches + 1;
          await serviceClient
            .from('loyalty_cards')
            .update({
              current_punches: newPunches,
              total_punches_earned: card.total_punches_earned + 1,
            })
            .eq('id', card.id);

          await serviceClient.from('loyalty_transactions').insert({
            card_id: card.id,
            customer_id: claim.customer_id,
            vendor_id: user.id,
            redemption_id: redemptionRecord?.id || null,
            transaction_type: 'earn_punch',
            punches_amount: 1,
            description: `Earned 1 stamp from "${claim.deal?.title}"`,
            deal_title: claim.deal?.title,
          });

          loyaltyInfo = {
            program_type: 'punch_card',
            program_name: program.name,
            earned: '1 stamp',
            current: `${newPunches}/${program.punches_required} stamps`,
          };
        } else if (program.program_type === 'points') {
          const pointsEarned = Math.floor(dealPrice * (program.points_per_dollar || 1));
          const newPoints = card.current_points + pointsEarned;

          await serviceClient
            .from('loyalty_cards')
            .update({
              current_points: newPoints,
              total_points_earned: card.total_points_earned + pointsEarned,
            })
            .eq('id', card.id);

          await serviceClient.from('loyalty_transactions').insert({
            card_id: card.id,
            customer_id: claim.customer_id,
            vendor_id: user.id,
            redemption_id: redemptionRecord?.id || null,
            transaction_type: 'earn_points',
            points_amount: pointsEarned,
            description: `Earned ${pointsEarned} points from "${claim.deal?.title}"`,
            deal_title: claim.deal?.title,
          });

          loyaltyInfo = {
            program_type: 'points',
            program_name: program.name,
            earned: `${pointsEarned} points`,
            current: `${newPoints} points`,
          };
        }
      }
    }
  } catch (loyaltyError) {
    console.error('Loyalty award error:', loyaltyError);
  }

  return NextResponse.json({
    success: true,
    customer: {
      name: `${claim.customer?.first_name || ''} ${claim.customer?.last_name || ''}`.trim(),
      email: claim.customer?.email,
    },
    deal: {
      title: claim.deal?.title,
      deal_type: claim.deal?.deal_type,
      deal_price: claim.deal?.deal_price,
      original_price: claim.deal?.original_price,
      discount_percentage: claim.deal?.discount_percentage,
      deposit_amount: claim.deal?.deposit_amount,
    },
    remaining_balance: remainingBalance,
    redeemed_at: new Date().toISOString(),
    loyalty: loyaltyInfo,
  });
}

// GET /api/redeem/[qrCode] - Check QR code or 6-digit code status (for customer view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  const { qrCode } = await params;
  const supabase = await createServerSupabaseClient();

  // Support both QR UUID and 6-digit code lookup
  const is6Digit = /^\d{6}$/.test(qrCode.trim());
  const column = is6Digit ? 'redemption_code' : 'qr_code';

  const { data: claim } = await supabase
    .from('claims')
    .select('*, deal:deals(title, deal_price, original_price, discount_percentage, deposit_amount, expires_at, deal_type, vendor_id, vendor:vendors(business_name))')
    .eq(column, is6Digit ? qrCode.trim() : qrCode)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Invalid code', code: 'INVALID' }, { status: 404 });
  }

  const depositPaid = claim.deal?.deposit_amount || 0;
  const dealPrice = claim.deal?.deal_price || 0;
  const remainingBalance = Math.max(0, dealPrice - depositPaid);

  return NextResponse.json({
    status: claim.redeemed ? 'redeemed' : new Date(claim.expires_at) < new Date() ? 'expired' : 'valid',
    claim: {
      id: claim.id,
      redeemed: claim.redeemed,
      redeemed_at: claim.redeemed_at,
      expires_at: claim.expires_at,
      deal: claim.deal,
      remaining_balance: remainingBalance,
    },
  });
}
