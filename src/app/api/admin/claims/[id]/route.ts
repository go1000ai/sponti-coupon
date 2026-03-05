import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { generateUniqueRedemptionCode } from '@/lib/qr';

/**
 * PUT /api/admin/claims/[id]
 * Update a claim. Supports actions:
 *   { action: 'cancel' }          — sets redeemed=false and decrements claims_count if deposit was confirmed
 *   { action: 'redeem' }          — sets redeemed=true, redeemed_at=now
 *   { action: 'extend', expires_at: string } — extends expiry date
 *   { action: 'confirm_deposit' } — sets deposit_confirmed=true
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Fetch the current claim
    const { data: claim, error: fetchError } = await serviceClient
      .from('claims')
      .select('id, deal_id, customer_id, redeemed, deposit_confirmed, expires_at')
      .eq('id', id)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    switch (action) {
      case 'cancel': {
        // Set redeemed=false and decrement claims_count if deposit was confirmed
        const { error: updateError } = await serviceClient
          .from('claims')
          .update({ redeemed: false, redeemed_at: null })
          .eq('id', id);

        if (updateError) {
          console.error('[PUT /api/admin/claims] Cancel update error:', updateError);
          return NextResponse.json({ error: 'Failed to cancel claim' }, { status: 500 });
        }

        // Decrement claims_count only if deposit was confirmed (matches the increment logic)
        if (claim.deposit_confirmed) {
          await serviceClient.rpc('decrement_claims_count', { deal_id_param: claim.deal_id });
        }

        // Reverse loyalty + SpontiPoints tied to the redemption record
        const { data: redemption } = await serviceClient
          .from('redemptions')
          .select('id')
          .eq('claim_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (redemption) {
          // Reverse loyalty transactions
          const { data: loyaltyTxns } = await serviceClient
            .from('loyalty_transactions')
            .select('id, card_id, transaction_type, punches_amount, points_amount')
            .eq('redemption_id', redemption.id);

          if (loyaltyTxns && loyaltyTxns.length > 0) {
            for (const txn of loyaltyTxns) {
              if (txn.transaction_type === 'earn_punch' && txn.punches_amount) {
                const { data: card } = await serviceClient
                  .from('loyalty_cards')
                  .select('current_punches, total_punches_earned')
                  .eq('id', txn.card_id)
                  .single();
                if (card) {
                  await serviceClient.from('loyalty_cards').update({
                    current_punches: Math.max(0, card.current_punches - txn.punches_amount),
                    total_punches_earned: Math.max(0, card.total_punches_earned - txn.punches_amount),
                  }).eq('id', txn.card_id);
                }
              } else if (txn.transaction_type === 'earn_points' && txn.points_amount) {
                const { data: card } = await serviceClient
                  .from('loyalty_cards')
                  .select('current_points, total_points_earned')
                  .eq('id', txn.card_id)
                  .single();
                if (card) {
                  await serviceClient.from('loyalty_cards').update({
                    current_points: Math.max(0, card.current_points - txn.points_amount),
                    total_points_earned: Math.max(0, card.total_points_earned - txn.points_amount),
                  }).eq('id', txn.card_id);
                }
              }
            }
            await serviceClient.from('loyalty_transactions').delete().eq('redemption_id', redemption.id);
          }

          // Reverse SpontiPoints
          await serviceClient.from('spontipoints_ledger').delete().eq('redemption_id', redemption.id);

          // Delete redemption record
          await serviceClient.from('redemptions').delete().eq('id', redemption.id);
        }

        return NextResponse.json({ success: true, message: 'Claim cancelled successfully' });
      }

      case 'redeem': {
        const { error: updateError } = await serviceClient
          .from('claims')
          .update({ redeemed: true, redeemed_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          console.error('[PUT /api/admin/claims] Redeem update error:', updateError);
          return NextResponse.json({ error: 'Failed to redeem claim' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Claim redeemed successfully' });
      }

      case 'extend': {
        const { expires_at } = body;
        if (!expires_at) {
          return NextResponse.json({ error: 'expires_at is required for extend action' }, { status: 400 });
        }

        // Validate the date
        const newExpiry = new Date(expires_at);
        if (isNaN(newExpiry.getTime())) {
          return NextResponse.json({ error: 'Invalid expires_at date' }, { status: 400 });
        }

        if (newExpiry <= new Date()) {
          return NextResponse.json({ error: 'New expiry must be in the future' }, { status: 400 });
        }

        const { error: updateError } = await serviceClient
          .from('claims')
          .update({ expires_at: newExpiry.toISOString() })
          .eq('id', id);

        if (updateError) {
          console.error('[PUT /api/admin/claims] Extend update error:', updateError);
          return NextResponse.json({ error: 'Failed to extend claim' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Claim expiry extended successfully' });
      }

      case 'confirm_deposit': {
        if (claim.deposit_confirmed) {
          return NextResponse.json({ error: 'Deposit is already confirmed' }, { status: 400 });
        }

        const { error: updateError } = await serviceClient
          .from('claims')
          .update({ deposit_confirmed: true, deposit_confirmed_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          console.error('[PUT /api/admin/claims] Confirm deposit error:', updateError);
          return NextResponse.json({ error: 'Failed to confirm deposit' }, { status: 500 });
        }

        // Increment claims_count on the deal since deposit is now confirmed
        await serviceClient.rpc('increment_claims_count', { deal_id_param: claim.deal_id });

        return NextResponse.json({ success: true, message: 'Deposit confirmed successfully' });
      }

      case 'edit': {
        // Full admin edit — update any allowed fields
        const allowedFields = ['deposit_confirmed', 'redeemed', 'redeemed_at', 'expires_at', 'deal_id', 'customer_id'];
        const updateData: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (field in body && field !== 'action') {
            updateData[field] = body[field];
          }
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { error: updateError } = await serviceClient
          .from('claims')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          console.error('[PUT /api/admin/claims] Edit error:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Claim updated successfully' });
      }

      case 'generate_codes': {
        // Generate QR code and 6-digit redemption code for a claim that doesn't have them
        const qrCode = uuidv4();
        const redemptionCode = await generateUniqueRedemptionCode(serviceClient);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const { error: updateError } = await serviceClient
          .from('claims')
          .update({
            qr_code: qrCode,
            qr_code_url: `${appUrl}/redeem/${qrCode}`,
            redemption_code: redemptionCode,
            deposit_confirmed: true,
            deposit_confirmed_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) {
          console.error('[PUT /api/admin/claims] Generate codes error:', updateError);
          return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 });
        }

        // Increment claims_count if deposit wasn't previously confirmed
        if (!claim.deposit_confirmed) {
          await serviceClient.rpc('increment_claims_count', { deal_id_param: claim.deal_id });
        }

        return NextResponse.json({
          success: true,
          message: 'Codes generated successfully',
          qr_code: qrCode,
          redemption_code: redemptionCode,
          qr_code_url: `${appUrl}/redeem/${qrCode}`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: cancel, redeem, extend, confirm_deposit, edit, generate_codes` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[PUT /api/admin/claims] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/claims/[id]
 * Hard delete a claim. Also decrements claims_count if deposit was confirmed.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const serviceClient = await createServiceRoleClient();

    // Fetch claim before deleting (need deal_id and deposit_confirmed for decrement logic)
    const { data: claim, error: fetchError } = await serviceClient
      .from('claims')
      .select('id, deal_id, deposit_confirmed')
      .eq('id', id)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Delete the claim
    const { error: deleteError } = await serviceClient
      .from('claims')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/admin/claims] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete claim' }, { status: 500 });
    }

    // Decrement claims_count if deposit was confirmed
    if (claim.deposit_confirmed) {
      await serviceClient.rpc('decrement_claims_count', { deal_id_param: claim.deal_id });
    }

    return NextResponse.json({ success: true, message: 'Claim deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/claims] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
