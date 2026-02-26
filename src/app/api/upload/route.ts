import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { brandStorageUrl } from '@/lib/utils';

// Allowed buckets vendors can upload to
const ALLOWED_BUCKETS = ['deal-images', 'vendor-assets'] as const;
type AllowedBucket = typeof ALLOWED_BUCKETS[number];

// POST /api/upload — Upload image to Supabase Storage
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify vendor role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can upload images' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const bucketParam = (formData.get('bucket') as string) || 'deal-images';

  // Validate bucket
  const bucket: AllowedBucket = ALLOWED_BUCKETS.includes(bucketParam as AllowedBucket)
    ? (bucketParam as AllowedBucket)
    : 'deal-images';

  if (!file || (typeof file === 'string')) {
    console.error('[Upload] No file in formData');
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  console.log('[Upload] File received:', { name: file.name, type: file.type, size: file.size });

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    console.error('[Upload] Invalid file type:', file.type);
    return NextResponse.json({ error: `Invalid file type: ${file.type}. Please upload JPG, PNG, WebP, SVG, or GIF.` }, { status: 400 });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.` }, { status: 400 });
  }

  // Use service role client to bypass RLS for storage
  const serviceClient = await createServiceRoleClient();

  // Ensure the bucket exists (create if needed)
  const { data: buckets } = await serviceClient.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === bucket);

  if (!bucketExists) {
    await serviceClient.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes,
    });
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Upload file
  const arrayBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from(bucket)
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: bucket === 'vendor-assets',
    });

  if (uploadError) {
    console.error('[Upload] Storage error:', uploadError.message, uploadError);
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = serviceClient.storage
    .from(bucket)
    .getPublicUrl(uploadData.path);

  const brandedUrl = brandStorageUrl(urlData.publicUrl);

  // Auto-record in vendor media library (only for deal-images, not vendor-assets like logos)
  if (bucket === 'deal-images') {
    await serviceClient.from('vendor_media').insert({
      vendor_id: user.id,
      type: 'image',
      url: brandedUrl,
      storage_path: filename,
      bucket,
      filename: file.name,
      source: 'upload',
      file_size: file.size,
      mime_type: file.type,
    });
  }

  return NextResponse.json({
    url: brandedUrl,
    path: uploadData.path,
  });
}
