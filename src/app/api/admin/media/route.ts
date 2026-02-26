import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const vendorId = searchParams.get('vendor_id') || '';

    let query = serviceClient
      .from('vendor_media')
      .select(`
        id,
        vendor_id,
        type,
        url,
        title,
        filename,
        source,
        ai_prompt,
        file_size,
        mime_type,
        created_at,
        vendor:vendors(business_name)
      `)
      .order('created_at', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data: rawMedia, error } = await query;

    if (error) {
      console.error('[GET /api/admin/media] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }

    let media = (rawMedia || []).map((m: Record<string, unknown>) => {
      const vendor = m.vendor as { business_name: string } | null;
      return {
        id: m.id as string,
        vendor_id: m.vendor_id as string,
        type: m.type as string,
        url: m.url as string,
        title: m.title as string | null,
        filename: m.filename as string | null,
        source: m.source as string,
        ai_prompt: m.ai_prompt as string | null,
        file_size: m.file_size as number | null,
        mime_type: m.mime_type as string | null,
        created_at: m.created_at as string,
        vendor_name: vendor?.business_name || 'Unknown Vendor',
      };
    });

    if (search) {
      media = media.filter(
        (m) =>
          m.vendor_name.toLowerCase().includes(search) ||
          (m.title || '').toLowerCase().includes(search) ||
          (m.filename || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ media });
  } catch (error) {
    console.error('[GET /api/admin/media] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('vendor_media')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/admin/media] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/media] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
