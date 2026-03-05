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

        // Reverse loyalty + SpontiPoints tied to the redemption record(s)
        // Use maybeSingle() instead of single() to avoid error when no rows found
        const { data: redemptions, error: redemptionFetchError } = await serviceClient
          .from('redemptions')
          .select('id')
          .eq('claim_id', id)
          .order('created_at', { ascending: false });

        console.log('[Admin Cancel] Claim ID:', id, '| Redemptions found:', redemptions?.length || 0, '| Fetch error:', redemptionFetchError);

        if (redemptions && redemptions.length > 0) {
          for (const redemption of redemptions) {
            console.log('[Admin Cancel] Processing redemption:', redemption.id);

            // Reverse loyalty transactions
            const { data: loyaltyTxns, error: loyaltyFetchError } = await serviceClient
              .from('loyalty_transactions')
              .select('id, card_id, transaction_type, punches_amount, points_amount')
              .eq('redemption_id', redemption.id);

            console.log('[Admin Cancel] Loyalty txns found:', loyaltyTxns?.length || 0, '| Fetch error:', loyaltyFetchError);

            if (loyaltyTxns && loyaltyTxns.length > 0) {
              for (const txn of loyaltyTxns) {
                if (txn.transaction_type === 'earn_punch' && txn.punches_amount) {
                  const { data: card } = await serviceClient
                    .from('loyalty_cards')
                    .select('current_punches, total_punches_earned')
                    .eq('id', txn.card_id)
                    .single();
                  if (card) {
                    const { error: cardUpdateErr } = await serviceClient.from('loyalty_cards').update({
                      current_punches: Math.max(0, card.current_punches - txn.punches_amount),
                      total_punches_earned: Math.max(0, card.total_punches_earned - txn.punches_amount),
                    }).eq('id', txn.card_id);
                    console.log('[Admin Cancel] Reversed punch:', txn.id, '| Card:', txn.card_id, '| Error:', cardUpdateErr);
                  }
                } else if (txn.transaction_type === 'earn_points' && txn.points_amount) {
                  const { data: card } = await serviceClient
                    .from('loyalty_cards')
                    .select('current_points, total_points_earned')
                    .eq('id', txn.card_id)
                    .single();
                  if (card) {
                    const { error: cardUpdateErr } = await serviceClient.from('loyalty_cards').update({
                      current_points: Math.max(0, card.current_points - txn.points_amount),
                      total_points_earned: Math.max(0, card.total_points_earned - txn.points_amount),
                    }).eq('id', txn.card_id);
                    console.log('[Admin Cancel] Reversed points:', txn.id, '| Card:', txn.card_id, '| Error:', cardUpdateErr);
                  }
                }
              }
              const { error: deleteTxnErr } = await serviceClient.from('loyalty_transactions').delete().eq('redemption_id', redemption.id);
              console.log('[Admin Cancel] Deleted loyalty txns for redemption:', redemption.id, '| Error:', deleteTxnErr);
            }


            // Reverse SpontiPoints
            const { error: spDeleteErr } = await serviceClient.from('spontipoints_ledger').delete().eq('redemption_id', redemption.id);
            console.log('[Admin Cancel] Deleted SpontiPoints for redemption:', redemption.id, '| Error:', spDeleteErr);

            // Delete redemption record
            const { error: redDeleteErr } = await serviceClient.from('redemptions').delete().eq('id', redemption.id);
            console.log('[Admin Cancel] Deleted redemption record:', redemption.id, '| Error:', redDeleteErr);
          }
        } else {
          console.log('[Admin Cancel] No redemption records found for claim:', id, '— checking for orphaned loyalty data...');
        }

        // Always check for orphaned loyalty transactions for this customer
        // This handles: null redemption_id, dangling redemption_id (pointing to deleted record), etc.
        const { data: allCustomerTxns } = await serviceClient
          .from('loyalty_transactions')
          .select('id, card_id, transaction_type, punches_amount, points_amount, redemption_id')
          .eq('customer_id', claim.customer_id)
          .order('created_at', { ascending: false });

        if (allCustomerTxns && allCustomerTxns.length > 0) {
          // Find which redemption_ids still exist
          const ridMap: Record<string, boolean> = {};
          const uniqueRedemptionIds = allCustomerTxns
            .map(t => t.redemption_id)
            .filter((rid): rid is string => {
              if (rid === null || ridMap[rid]) return false;
              ridMap[rid] = true;
              return true;
            });

          const orphanedRedemptionIdList: string[] = [];
          if (uniqueRedemptionIds.length > 0) {
            const { data: existingRedemptions } = await serviceClient
              .from('redemptions')
              .select('id')
              .in('id', uniqueRedemptionIds);

            const existingIdMap: Record<string, boolean> = {};
            (existingRedemptions || []).forEach(r => { existingIdMap[r.id] = true; });
            for (const rid of uniqueRedemptionIds) {
              if (!existingIdMap[rid]) {
                orphanedRedemptionIdList.push(rid);
              }
            }
          }

          const orphanedIdMap: Record<string, boolean> = {};
          orphanedRedemptionIdList.forEach(rid => { orphanedIdMap[rid] = true; });

          // Reverse orphaned transactions (null redemption_id OR dangling redemption_id)
          const orphanedTxns = allCustomerTxns.filter(t =>
            t.redemption_id === null || orphanedIdMap[t.redemption_id] === true
          );

          console.log('[Admin Cancel] Orphaned loyalty txns found:', orphanedTxns.length, '| Dangling IDs:', orphanedRedemptionIdList);

          for (const txn of orphanedTxns) {
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
            await serviceClient.from('loyalty_transactions').delete().eq('id', txn.id);
            console.log('[Admin Cancel] Reversed orphaned txn:', txn.id, '| type:', txn.transaction_type);
          }

          // Also clean up orphaned SpontiPoints
          for (const rid of orphanedRedemptionIdList) {
            await serviceClient.from('spontipoints_ledger').delete().eq('redemption_id', rid);
            console.log('[Admin Cancel] Cleaned up orphaned SpontiPoints for deleted redemption:', rid);
          }
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
