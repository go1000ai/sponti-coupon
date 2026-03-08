import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/vendor/deal-media?deal_id=xxx
 * Lightweight endpoint: returns the media library (images + videos) for a deal's vendor
 * plus the deal's own image_url and video_urls. Used to populate the media picker
 * before generating a full social preview.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dealId = request.nextUrl.searchParams.get('deal_id');
  if (!dealId) {
    return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch deal basics
  const { data: deal, error: dealError } = await serviceClient
    .from('deals')
    .select('id, image_url, video_urls, vendor_id')
    .eq('id', dealId)
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

  // Fetch vendor media library
  const { data: mediaLibrary } = await serviceClient
    .from('vendor_media')
    .select('url, type')
    .eq('vendor_id', deal.vendor_id)
    .order('created_at', { ascending: false })
    .limit(30);

  const libraryImages = (mediaLibrary || []).filter(m => m.type === 'image').map(m => m.url);
  const libraryVideos = (mediaLibrary || []).filter(m => m.type === 'video').map(m => m.url);
  const dealVideos = (deal.video_urls || []) as string[];

  return NextResponse.json({
    deal_image: deal.image_url || '',
    media: {
      images: libraryImages,
      videos: [...dealVideos, ...libraryVideos],
    },
  });
}
