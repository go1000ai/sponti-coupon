import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PAYMENT_PROCESSORS } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';

// GET /api/vendor/payment-methods - Fetch vendor's payment methods
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: methods, error } = await supabase
    .from('vendor_payment_methods')
    .select('*')
    .eq('vendor_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ methods });
}

// POST /api/vendor/payment-methods - Add a new payment method
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { processor_type, payment_link, display_name, is_primary } = await request.json();

  if (!processor_type || !payment_link) {
    return NextResponse.json({ error: 'Processor type and payment link are required' }, { status: 400 });
  }

  const processorInfo = PAYMENT_PROCESSORS[processor_type as PaymentProcessorType];

  // Only deposit-capable processors can be set as primary
  if (is_primary && processorInfo && !processorInfo.supportsDeposit) {
    return NextResponse.json(
      { error: `${processorInfo.name} cannot be set as primary because it doesn't support online deposits. Use Stripe, Square, or PayPal for deposit collection.` },
      { status: 400 }
    );
  }

  // If setting as primary, unset other primaries first
  if (is_primary) {
    await supabase
      .from('vendor_payment_methods')
      .update({ is_primary: false })
      .eq('vendor_id', user.id)
      .eq('is_primary', true);
  }

  // Check if this is the first method — auto-set as primary
  const { count } = await supabase
    .from('vendor_payment_methods')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', user.id);

  const canBePrimary = !processorInfo || processorInfo.supportsDeposit;
  const shouldBePrimary = canBePrimary && (is_primary || count === 0);

  const { data: method, error } = await supabase
    .from('vendor_payment_methods')
    .insert({
      vendor_id: user.id,
      processor_type,
      payment_link: payment_link.trim(),
      display_name: display_name || null,
      is_primary: shouldBePrimary,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also update the legacy stripe_payment_link if this is a Stripe primary
  if (shouldBePrimary && processor_type === 'stripe') {
    await supabase
      .from('vendors')
      .update({ stripe_payment_link: payment_link.trim() })
      .eq('id', user.id);
  }

  return NextResponse.json({ method }, { status: 201 });
}

// PUT /api/vendor/payment-methods - Update a payment method
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, payment_link, display_name, is_primary, is_active } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('vendor_payment_methods')
    .select('id, processor_type')
    .eq('id', id)
    .eq('vendor_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
  }

  // Only deposit-capable processors can be set as primary
  if (is_primary) {
    const existingProcessor = PAYMENT_PROCESSORS[existing.processor_type as PaymentProcessorType];
    if (existingProcessor && !existingProcessor.supportsDeposit) {
      return NextResponse.json(
        { error: `${existingProcessor.name} cannot be set as primary because it doesn't support online deposits. Use Stripe, Square, or PayPal for deposit collection.` },
        { status: 400 }
      );
    }
  }

  // If setting as primary, unset other primaries first
  if (is_primary) {
    await supabase
      .from('vendor_payment_methods')
      .update({ is_primary: false })
      .eq('vendor_id', user.id)
      .eq('is_primary', true);
  }

  const updates: Record<string, unknown> = {};
  if (payment_link !== undefined) updates.payment_link = payment_link.trim();
  if (display_name !== undefined) updates.display_name = display_name;
  if (is_primary !== undefined) updates.is_primary = is_primary;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data: method, error } = await supabase
    .from('vendor_payment_methods')
    .update(updates)
    .eq('id', id)
    .eq('vendor_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync legacy stripe_payment_link
  if (is_primary && existing.processor_type === 'stripe') {
    await supabase
      .from('vendors')
      .update({ stripe_payment_link: payment_link?.trim() || method.payment_link })
      .eq('id', user.id);
  }

  return NextResponse.json({ method });
}

// DELETE /api/vendor/payment-methods - Remove a payment method
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
  }

  // Check if it's the primary method
  const { data: existing } = await supabase
    .from('vendor_payment_methods')
    .select('is_primary')
    .eq('id', id)
    .eq('vendor_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('vendor_payment_methods')
    .delete()
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If deleted was primary, promote the next one
  if (existing.is_primary) {
    const { data: nextMethod } = await supabase
      .from('vendor_payment_methods')
      .select('id')
      .eq('vendor_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextMethod) {
      await supabase
        .from('vendor_payment_methods')
        .update({ is_primary: true })
        .eq('id', nextMethod.id);
    }
  }

  return NextResponse.json({ success: true });
}
