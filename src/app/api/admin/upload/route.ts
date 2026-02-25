import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_BUCKETS = ['deal-images', 'deal-videos', 'vendor-assets', 'support-attachments'] as const;
type AllowedBucket = typeof ALLOWED_BUCKETS[number];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB

// POST /api/admin/upload — Admin file upload (images + videos)
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const bucketParam = (formData.get('bucket') as string) || 'deal-images';
  const targetUserId = (formData.get('user_id') as string) || admin.userId;

  // Validate bucket
  const bucket: AllowedBucket = ALLOWED_BUCKETS.includes(bucketParam as AllowedBucket)
    ? (bucketParam as AllowedBucket)
    : 'deal-images';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Determine if this is a video or image upload
  const isVideo = bucket === 'deal-videos' || VIDEO_TYPES.includes(file.type);
  const allowedTypes = isVideo ? VIDEO_TYPES : IMAGE_TYPES;
  const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    const typeLabel = isVideo ? 'MP4, WebM, MOV, or AVI' : 'JPG, PNG, WebP, or GIF';
    return NextResponse.json({ error: `Invalid file type. Please upload ${typeLabel}.` }, { status: 400 });
  }

  // Validate file size
  if (file.size > maxSize) {
    const sizeLabel = isVideo ? '100MB' : '5MB';
    return NextResponse.json({ error: `File too large. Maximum size is ${sizeLabel}.` }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Ensure the bucket exists
  const { data: buckets } = await serviceClient.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === bucket);

  if (!bucketExists) {
    await serviceClient.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes,
    });
  }

  // Generate unique filename scoped to target user
  const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const filename = `${targetUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from(bucket)
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: bucket === 'vendor-assets',
    });

  if (uploadError) {
    console.error('[Admin Upload] Error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload file. Please try again.' }, { status: 500 });
  }

  const { data: urlData } = serviceClient.storage
    .from(bucket)
    .getPublicUrl(uploadData.path);

  return NextResponse.json({
    url: urlData.publicUrl,
    path: uploadData.path,
  });
}
