import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/deals/categories — returns distinct vendor categories that have active deals
// Optionally filtered by lat/lng within 250 miles (includes online/no-location deals too)
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = 250; // miles

  // Fetch vendors with active, non-expired deals
  const now = new Date().toISOString();
  const { data: deals } = await supabase
    .from('deals')
    .select('vendor:vendors(category, lat, lng)')
    .eq('status', 'active')
    .gte('expires_at', now);

  if (!deals) {
    return NextResponse.json({ categories: [] });
  }

  const categorySet = new Set<string>();

  for (const deal of deals) {
    const vendor = deal.vendor as unknown as { category: string | null; lat: number | null; lng: number | null };
    if (!vendor?.category?.trim()) continue;

    const cat = vendor.category.trim();

    // No user location — include all categories
    if (!lat || !lng) {
      categorySet.add(cat);
      continue;
    }

    // Vendor has no coordinates — online/website deal, always include
    if (vendor.lat == null || vendor.lng == null) {
      categorySet.add(cat);
      continue;
    }

    // Check if within 250-mile radius
    const dist = getDistance(Number(lat), Number(lng), vendor.lat, vendor.lng);
    if (dist <= radius) {
      categorySet.add(cat);
    }
  }

  const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ categories });
}
