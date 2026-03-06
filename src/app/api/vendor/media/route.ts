import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { brandStorageUrl } from '@/lib/utils';

/** Resolve the effective vendor ID — admin can pass ?vendor_id to act on behalf of a vendor */
async function resolveVendorId(request: NextRequest): Promise<{ vendorId: string; userId: string; error?: never } | { vendorId?: never; userId?: never; error: NextResponse }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const requestedVendorId = request.nextUrl.searchParams.get('vendor_id');

  if (requestedVendorId && requestedVendorId !== user.id) {
    const serviceClient = await createServiceRoleClient();
    const { data: profile } = await serviceClient.from('user_profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    return { vendorId: requestedVendorId, userId: user.id };
  }

  return { vendorId: user.id, userId: user.id };
}

// GET /api/vendor/media — List vendor's media library (admin can pass ?vendor_id=xxx)
export async function GET(request: NextRequest) {
  const resolved = await resolveVendorId(request);
  if (resolved.error) return resolved.error;
  const vendorId = resolved.vendorId;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'image' | 'video' | null (all)
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '30');
  const offset = (page - 1) * limit;

  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('vendor_media')
    .select('*', { count: 'exact' })
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type === 'image' || type === 'video') {
    query = query.eq('type', type);
  }

  const { data: media, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert any raw Supabase URLs to branded /media/ paths
  const brandedMedia = (media || []).map(m => ({
    ...m,
    url: brandStorageUrl(m.url),
  }));

  return NextResponse.json({ media: brandedMedia, total: count || 0, page });
}

// POST /api/vendor/media — Record a new media asset (admin can pass vendor_id in body)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { url, type, source, storage_path, bucket, filename, title, ai_prompt, file_size, mime_type, vendor_id: bodyVendorId } = body;

  // Admin can specify vendor_id in body
  let vendorId = user.id;
  if (bodyVendorId && bodyVendorId !== user.id) {
    const serviceClient = await createServiceRoleClient();
    const { data: profile } = await serviceClient.from('user_profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    vendorId = bodyVendorId;
  }

  if (!url || !type || !source) {
    return NextResponse.json({ error: 'url, type, and source are required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: media, error } = await serviceClient
    .from('vendor_media')
    .insert({
      vendor_id: vendorId,
      url,
      type,
      source,
      storage_path: storage_path || null,
      bucket: bucket || (type === 'video' ? 'deal-videos' : 'deal-images'),
      filename: filename || null,
      title: title || null,
      ai_prompt: ai_prompt || null,
      file_size: file_size || null,
      mime_type: mime_type || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media });
}

// DELETE /api/vendor/media?id=xxx — Delete a media asset and its storage file
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const requestedVendorId = searchParams.get('vendor_id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // Admin can delete on behalf of a vendor
  let vendorId = user.id;
  if (requestedVendorId && requestedVendorId !== user.id) {
    const sc = await createServiceRoleClient();
    const { data: profile } = await sc.from('user_profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    vendorId = requestedVendorId;
  }

  const serviceClient = await createServiceRoleClient();

  // Get the record first for storage cleanup
  const { data: media } = await serviceClient
    .from('vendor_media')
    .select('*')
    .eq('id', id)
    .eq('vendor_id', vendorId)
    .single();

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // Delete from storage if we have a path
  if (media.storage_path) {
    await serviceClient.storage
      .from(media.bucket)
      .remove([media.storage_path]);
  }

  // Delete the database record
  const { error } = await serviceClient
    .from('vendor_media')
    .delete()
    .eq('id', id)
    .eq('vendor_id', vendorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
