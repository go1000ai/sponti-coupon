import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/deals/categories — returns distinct vendor categories that have active deals
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: vendors } = await supabase
    .from('vendors')
    .select('category')
    .not('category', 'is', null);

  if (!vendors) {
    return NextResponse.json({ categories: [] });
  }

  // Get unique, non-empty categories sorted alphabetically
  const categories = Array.from(new Set(
    vendors
      .map(v => v.category?.trim())
      .filter((c): c is string => !!c)
  )).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ categories });
}
