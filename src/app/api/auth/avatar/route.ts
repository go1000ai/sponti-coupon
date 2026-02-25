import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/avatar
 * Upload a profile avatar image. Any authenticated user can upload.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF.' }, { status: 400 });
  }

  const maxSize = 2 * 1024 * 1024; // 2MB for avatars
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const bucket = 'avatars';

  // Ensure bucket exists
  const { data: buckets } = await serviceClient.storage.listBuckets();
  if (!buckets?.some(b => b.name === bucket)) {
    await serviceClient.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowedTypes,
    });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${user.id}/avatar.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from(bucket)
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[POST /api/auth/avatar] Upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }

  const { data: urlData } = serviceClient.storage
    .from(bucket)
    .getPublicUrl(uploadData.path);

  // Add cache-bust query param
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Save URL to user metadata
  const { error: metaError } = await serviceClient.auth.admin.updateUserById(user.id, {
    user_metadata: { avatar_url: avatarUrl },
  });

  if (metaError) {
    console.error('[POST /api/auth/avatar] Metadata update error:', metaError);
  }

  return NextResponse.json({ url: avatarUrl });
}
