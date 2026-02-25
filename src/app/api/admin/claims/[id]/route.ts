import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
      .select('id, deal_id, redeemed, deposit_confirmed, expires_at')
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

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: cancel, redeem, extend, confirm_deposit` },
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
