import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { generateCaptions } from '@/lib/social/caption-generator';
import type { DealForSocialPost } from '@/lib/social/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

/**
 * POST /api/social/preview
 * Generate social media post previews (captions + image) for a deal without posting.
 * Body: { deal_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { deal_id } = await request.json();
  if (!deal_id) {
    return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch deal
  const { data: deal, error: dealError } = await serviceClient
    .from('deals')
    .select('id, title, description, deal_type, original_price, deal_price, discount_percentage, image_url, vendor_id')
    .eq('id', deal_id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  // Verify user is the vendor or admin
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && deal.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch vendor info
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('business_name, city, state, category, subscription_tier')
    .eq('id', deal.vendor_id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const dealForPost: DealForSocialPost = {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    deal_type: deal.deal_type,
    original_price: deal.original_price,
    deal_price: deal.deal_price,
    discount_percentage: deal.discount_percentage,
    image_url: deal.image_url,
    vendor_id: deal.vendor_id,
    vendor: {
      business_name: vendor.business_name,
      city: vendor.city,
      state: vendor.state,
      category: vendor.category,
      subscription_tier: vendor.subscription_tier,
    },
  };

  // Generate captions
  const captions = await generateCaptions(dealForPost);
  const imageUrl = deal.image_url || "";
  const claimUrl = `${APP_URL}/deals/${deal.id}`;

  return NextResponse.json({
    captions,
    image_url: imageUrl,
    claim_url: claimUrl,
    deal: {
      id: deal.id,
      title: deal.title,
      deal_type: deal.deal_type,
      original_price: deal.original_price,
      deal_price: deal.deal_price,
      discount_percentage: deal.discount_percentage,
      image_url: deal.image_url,
    },
    vendor: {
      business_name: vendor.business_name,
      city: vendor.city,
      state: vendor.state,
    },
  });
}
